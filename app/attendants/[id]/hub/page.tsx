import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import Link from 'next/link';

interface AttendantHubPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: AttendantHubPageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Attendant Hub - ${id}`,
  };
}

interface Job {
  id: string;
  status: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventType: string | null;
  clientName: string;
  backdropSelected: boolean;
  backdropName: string | null;
  backdropLinkName: string | null;
  isUpcoming: boolean;
  isCompleted: boolean;
}

interface Metrics {
  totalJobs: number;
  upcomingEvents: number;
  completedEvents: number;
}

async function fetchJobsForAttendantIds(attendantIds: string[]): Promise<{ jobs: Job[]; metrics: Metrics }> {
  try {
    // Find all BackdropLinks where URL contains any of the attendantIds
    const backdropLinkConditions = attendantIds.flatMap((attendantId) => {
      const encodedAttendantId = encodeURIComponent(attendantId);
      return [
        { url: { contains: `/select/${attendantId}` } },
        { url: { contains: `attendantId=${attendantId}` } },
        { url: { contains: `/select/${encodedAttendantId}` } },
        { url: { contains: `attendantId=${encodedAttendantId}` } },
      ];
    });

    const backdropLinks = await prisma.backdropLink.findMany({
      where: {
        OR: backdropLinkConditions,
      },
      select: {
        id: true,
      },
    });

    const backdropLinkIds = backdropLinks.map((link) => link.id);

    if (backdropLinkIds.length === 0) {
      return { jobs: [], metrics: { totalJobs: 0, upcomingEvents: 0, completedEvents: 0 } };
    }

    // Find all Agreements that reference those BackdropLinks
    // Exclude completed and cancelled agreements from display
    const agreements = await prisma.agreement.findMany({
      where: {
        backdropLinkId: { in: backdropLinkIds },
        archived: false,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        status: true,
        selectedBackdropName: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventType: true,
            isWhitelabelClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventType: true,
            eventName: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format jobs and calculate metrics
    const now = new Date();
    const allJobs: Job[] = agreements.map((agreement) => {
      const eventDate = agreement.event?.eventDate || agreement.client.eventDate;
      const eventLocation = agreement.event?.eventLocation || agreement.client.eventLocation;
      const eventStartTime = agreement.event?.eventStartTime || agreement.client.eventStartTime;
      const eventType = agreement.event?.eventType || agreement.client.eventType;
      const clientName = agreement.event?.eventName || `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim() || 'Unknown Client';

      // Determine if event is upcoming or completed
      let isUpcoming = false;
      let isCompleted = false;
      
      if (eventDate) {
        const eventDateTime = new Date(eventDate);
        const expirationTime = new Date(eventDateTime);
        expirationTime.setHours(expirationTime.getHours() + 24);
        
        if (now < expirationTime) {
          isUpcoming = true;
        } else {
          isCompleted = true;
        }
      } else {
        isUpcoming = agreement.status !== 'COMPLETED' && agreement.status !== 'CANCELLED';
        isCompleted = agreement.status === 'COMPLETED' || agreement.status === 'CANCELLED';
      }

      return {
        id: agreement.id,
        status: agreement.status,
        eventDate: eventDate ? new Date(eventDate).toISOString() : null,
        eventLocation,
        eventStartTime,
        eventType,
        clientName,
        backdropSelected: !!agreement.selectedBackdropName && agreement.selectedBackdropName !== 'No Backdrop',
        backdropName: agreement.selectedBackdropName || null,
        backdropLinkName: agreement.backdropLink?.name || null,
        isUpcoming,
        isCompleted,
      };
    });

    // Filter out jobs that are past their event date (completed based on date)
    // Note: COMPLETED and CANCELLED status agreements are already filtered at the database level
    const jobs = allJobs.filter((job) => {
      // If status is COMPLETED or CANCELLED, exclude it (shouldn't happen due to DB filter, but double-check)
      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return false;
      }
      // Exclude jobs that are past their event date + 24 hours
      return !job.isCompleted;
    });

    // Sort by event date (upcoming first, then by date ascending)
    jobs.sort((a, b) => {
      if (a.isUpcoming && !b.isUpcoming) return -1;
      if (!a.isUpcoming && b.isUpcoming) return 1;
      
      if (a.eventDate && b.eventDate) {
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      if (a.eventDate) return -1;
      if (b.eventDate) return 1;
      
      return 0;
    });

    // Calculate metrics (only count jobs that are displayed)
    const metrics: Metrics = {
      totalJobs: jobs.length,
      upcomingEvents: jobs.filter((job) => job.isUpcoming).length,
      completedEvents: 0, // Completed jobs are filtered out and not shown
    };

    return { jobs, metrics };
  } catch (error) {
    console.error('Error fetching attendant jobs:', error);
    return { jobs: [], metrics: { totalJobs: 0, upcomingEvents: 0, completedEvents: 0 } };
  }
}

async function fetchAttendantJobs(attendantIdOrSlug: string): Promise<{ jobs: Job[]; metrics: Metrics; groupName?: string }> {
  try {
    // First, check if this matches a group slug
    const group = await prisma.attendantGroup.findUnique({
      where: { slug: attendantIdOrSlug },
    });

    if (group) {
      // It's a group - fetch jobs for all attendant IDs in the group
      const result = await fetchJobsForAttendantIds(group.attendantIds);
      return { ...result, groupName: group.name };
    }

    // Otherwise, treat as a single attendant ID
    const result = await fetchJobsForAttendantIds([attendantIdOrSlug]);
    return result;
  } catch (error) {
    console.error('Error fetching attendant jobs:', error);
    return { jobs: [], metrics: { totalJobs: 0, upcomingEvents: 0, completedEvents: 0 } };
  }
}

function formatEventDate(dateString: string | null): string {
  if (!dateString) return 'Date TBD';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Date TBD';
  }
}

function formatEventDateShort(dateString: string | null): string {
  if (!dateString) return 'TBD';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/Toronto',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'TBD';
  }
}

function getEventTypeColor(eventType: string | null): string {
  if (!eventType) return '#64748b';
  const type = eventType.toLowerCase();
  if (type.includes('wedding')) return '#ec4899';
  if (type.includes('corporate') || type.includes('business')) return '#3b82f6';
  if (type.includes('birthday') || type.includes('party')) return '#10b981';
  if (type.includes('sport')) return '#f59e0b';
  if (type.includes('music') || type.includes('concert')) return '#8b5cf6';
  return '#64748b';
}

function getEventTypeBgColor(eventType: string | null): string {
  if (!eventType) return '#1e293b';
  const type = eventType.toLowerCase();
  if (type.includes('wedding')) return '#ec489920';
  if (type.includes('corporate') || type.includes('business')) return '#3b82f620';
  if (type.includes('birthday') || type.includes('party')) return '#10b98120';
  if (type.includes('sport')) return '#f59e0b20';
  if (type.includes('music') || type.includes('concert')) return '#8b5cf620';
  return '#1e293b';
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  hasJob: boolean;
}

function getCalendarDays(jobs: Job[]): CalendarDay[] {
  const timeZone = 'America/Toronto';
  const now = new Date();
  
  // Get current date in Toronto timezone as YYYY-MM-DD
  const nowStr = now.toLocaleDateString('en-CA', { timeZone });
  const [currentYear, currentMonth, currentDay] = nowStr.split('-').map(Number);
  
  // Create first day of current month
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  
  // Get day of week for first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Calculate start date (Sunday of the week containing the first day)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfWeek);
  
  // Extract job dates (normalize to YYYY-MM-DD format in Toronto timezone)
  const jobDates = new Set<string>();
  jobs.forEach(job => {
    if (job.eventDate) {
      try {
        const date = new Date(job.eventDate);
        const dateStr = date.toLocaleDateString('en-CA', { timeZone });
        jobDates.add(dateStr);
      } catch {
        // Skip invalid dates
      }
    }
  });
  
  // Generate 42 days (6 weeks)
  const calendarDays: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Get date components in Toronto timezone
    const dateStr = date.toLocaleDateString('en-CA', { timeZone });
    const [dateYear, dateMonth, day] = dateStr.split('-').map(Number);
    
    // Check if this date is in the current month
    const isCurrentMonth = dateYear === currentYear && dateMonth === currentMonth;
    
    // Check if this date has a job
    const hasJob = jobDates.has(dateStr);
    
    calendarDays.push({
      date,
      day,
      isCurrentMonth,
      hasJob,
    });
  }
  
  return calendarDays;
}

function getMonthYearString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    timeZone: 'America/Toronto',
    month: 'long',
    year: 'numeric',
  });
}


export default async function AttendantHubPage({ params }: AttendantHubPageProps) {
  try {
    const { id: attendantIdOrSlug } = await params;
    const { jobs, metrics, groupName } = await fetchAttendantJobs(attendantIdOrSlug);
    
    const nextUpcomingJob = jobs.length > 0 ? jobs[0] : null;
    const displayName = groupName || attendantIdOrSlug;

    return (
      <>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in {
            animation: fadeIn 0.4s ease-out;
          }
          @media (max-width: 1024px) {
            .hub-main {
              padding: 24px 16px !important;
            }
            .metrics-grid {
              grid-template-columns: 1fr !important;
            }
            .jobs-grid {
              grid-template-columns: 1fr !important;
            }
            .featured-section {
              flex-direction: column !important;
            }
            .calendar-card {
              width: 100% !important;
              max-width: 260px !important;
            }
          }
          @media (max-width: 768px) {
            .hub-header {
              padding: 20px 16px !important;
            }
            .hub-main {
              padding: 20px 12px !important;
            }
            .job-card {
              padding: 20px !important;
            }
            .calendar-card {
              width: 100% !important;
              max-width: 260px !important;
              margin: 0 auto !important;
            }
            .calendar-cell {
              width: 32px !important;
              height: 32px !important;
              font-size: 11px !important;
            }
          }
          .job-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          .job-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            border-color: #3b82f6 !important;
          }
          .metric-card {
            transition: all 0.2s ease;
          }
          .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          .view-details-button:hover {
            background-color: #2563eb !important;
          }
        `}} />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0f172a',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            color: '#f1f5f9',
          }}
        >
          {/* Header */}
          <header
            className="hub-header"
            style={{
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              padding: '32px 0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    📸
                  </div>
                  <div>
                    <h1
                      style={{
                        margin: '0',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Attendant Hub
                    </h1>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '16px',
                        color: '#94a3b8',
                        fontWeight: '500',
                      }}
                    >
                      Hello {displayName}, welcome back!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main
            className="hub-main fade-in"
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px',
            }}
          >
            {/* Metrics Cards */}
            <div
              className="metrics-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '48px',
              }}
            >
              {/* Total Jobs */}
              <div
                className="metric-card"
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3
                    style={{
                      margin: '0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Total Jobs
                  </h3>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    📋
                  </div>
                </div>
                <p
                  style={{
                    margin: '0',
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#f1f5f9',
                    lineHeight: '1.2',
                  }}
                >
                  {metrics.totalJobs}
                </p>
              </div>

              {/* Upcoming Events */}
              <div
                className="metric-card"
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3
                    style={{
                      margin: '0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Upcoming Events
                  </h3>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#10b981',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    📅
                  </div>
                </div>
                <p
                  style={{
                    margin: '0',
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#f1f5f9',
                    lineHeight: '1.2',
                  }}
                >
                  {metrics.upcomingEvents}
                </p>
              </div>

              {/* Backdrop Selection Progress */}
              <div
                className="metric-card"
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3
                    style={{
                      margin: '0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Backdrop Selection
                  </h3>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#8b5cf6',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    🖼️
                  </div>
                </div>
                {jobs.length > 0 ? (
                  <>
                    <p
                      style={{
                        margin: '0 0 16px 0',
                        fontSize: '36px',
                        fontWeight: '700',
                        color: '#f1f5f9',
                        lineHeight: '1.2',
                      }}
                    >
                      {jobs.filter(j => j.backdropSelected).length} / {jobs.length}
                    </p>
                    {/* Progress Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#334155',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: `${jobs.length > 0 ? (jobs.filter(j => j.backdropSelected).length / jobs.length) * 100 : 0}%`,
                          height: '100%',
                          backgroundColor: '#8b5cf6',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#94a3b8',
                      }}
                    >
                      {Math.round((jobs.filter(j => j.backdropSelected).length / jobs.length) * 100)}% Complete
                    </p>
                  </>
                ) : (
                  <p
                    style={{
                      margin: '0',
                      fontSize: '36px',
                      fontWeight: '700',
                      color: '#f1f5f9',
                      lineHeight: '1.2',
                    }}
                  >
                    0
                  </p>
                )}
              </div>
            </div>

            {/* Featured Upcoming Event & All Jobs Section */}
            <div className="featured-section" style={{ display: 'flex', gap: '24px', marginBottom: '48px', flexWrap: 'wrap' }}>
              {/* Featured Upcoming Event Card */}
              {nextUpcomingJob && (
                <div
                  style={{
                    flex: '1',
                    minWidth: '400px',
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    border: '1px solid #334155',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {/* Visual Header */}
                  <div
                    style={{
                      height: '200px',
                      background: `linear-gradient(135deg, ${getEventTypeBgColor(nextUpcomingJob.eventType)} 0%, #1e293b 100%)`,
                      position: 'relative',
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    {nextUpcomingJob.eventType && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getEventTypeColor(nextUpcomingJob.eventType),
                          color: '#ffffff',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {nextUpcomingJob.eventType}
                      </span>
                    )}
                    {nextUpcomingJob.backdropSelected && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                        }}
                      >
                        ✓ Backdrop Selected
                      </span>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div style={{ padding: '24px' }}>
                    <h2
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#f1f5f9',
                        lineHeight: '1.3',
                      }}
                    >
                      {nextUpcomingJob.clientName}
                    </h2>
                    
                    {nextUpcomingJob.eventLocation && (
                      <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📍</span>
                        <span>{nextUpcomingJob.eventLocation}</span>
                      </p>
                    )}
                    
                    {nextUpcomingJob.eventDate && (
                      <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📅</span>
                        <span>{formatEventDate(nextUpcomingJob.eventDate)}</span>
                        {nextUpcomingJob.eventStartTime && <span style={{ marginLeft: '8px' }}>• {nextUpcomingJob.eventStartTime}</span>}
                      </p>
                    )}
                    
                    {nextUpcomingJob.backdropName && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                        <p style={{ margin: '0', color: '#60a5fa', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🖼️</span>
                          <span>{nextUpcomingJob.backdropName}</span>
                        </p>
                      </div>
                    )}
                    
                    <Link
                      href={`/attendant/${nextUpcomingJob.id}${groupName ? `?fromGroup=${attendantIdOrSlug}` : ''}`}
                      className="view-details-button"
                      style={{
                        display: 'inline-block',
                        marginTop: '20px',
                        padding: '12px 24px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              )}

              {/* Calendar Card */}
              <div
                className="calendar-card"
                style={{
                  flex: '0 0 auto',
                  width: '260px',
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  padding: '14px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#f1f5f9',
                    textAlign: 'center',
                  }}
                >
                  {getMonthYearString()}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#64748b',
                        padding: '2px 0',
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {getCalendarDays(jobs).map((calendarDay, index) => {
                    const today = new Date();
                    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
                    const dayStr = calendarDay.date.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
                    const isToday = dayStr === todayStr;
                    
                    return (
                      <div
                        key={index}
                        className="calendar-cell"
                        style={{
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: calendarDay.hasJob ? '700' : '400',
                          color: calendarDay.isCurrentMonth 
                            ? (calendarDay.hasJob ? '#ffffff' : '#f1f5f9')
                            : '#475569',
                          backgroundColor: calendarDay.hasJob
                            ? '#3b82f6'
                            : isToday
                            ? '#334155'
                            : 'transparent',
                          borderRadius: '4px',
                          border: isToday && !calendarDay.hasJob ? '1px solid #3b82f6' : 'none',
                        }}
                      >
                        {calendarDay.day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* All Jobs Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2
                  style={{
                    margin: '0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#ffffff',
                  }}
                >
                  All Jobs
                </h2>
                <span
                  style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: '500',
                  }}
                >
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} assigned
                </span>
              </div>

              {jobs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    padding: '64px 48px',
                    borderRadius: '16px',
                    border: '1px solid #334155',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '64px',
                      marginBottom: '20px',
                    }}
                  >
                    📭
                  </div>
                  <h3
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '24px',
                      fontWeight: '600',
                      color: '#f1f5f9',
                    }}
                  >
                    No Jobs Assigned
                  </h3>
                  <p
                    style={{
                      margin: '0',
                      fontSize: '16px',
                      color: '#94a3b8',
                      maxWidth: '500px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  >
                    You don&apos;t have any jobs assigned yet. Jobs will appear here once they&apos;re assigned to you.
                  </p>
                </div>
              ) : (
                <div
                  className="jobs-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/attendant/${job.id}${groupName ? `?fromGroup=${attendantIdOrSlug}` : ''}`}
                      prefetch={true}
                      style={{ 
                        textDecoration: 'none',
                        display: 'block',
                        width: '100%',
                        color: 'inherit',
                      }}
                    >
                      <div
                        className="job-card"
                        style={{
                          backgroundColor: '#1e293b',
                          borderRadius: '16px',
                          border: '1px solid #334155',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Visual Header */}
                        <div
                          style={{
                            height: '120px',
                            background: `linear-gradient(135deg, ${getEventTypeBgColor(job.eventType)} 0%, #1e293b 100%)`,
                            position: 'relative',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                          }}
                        >
                          {job.eventType && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                backgroundColor: getEventTypeColor(job.eventType),
                                color: '#ffffff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {job.eventType}
                            </span>
                          )}
                          {job.backdropSelected && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3
                            style={{
                              margin: '0 0 12px 0',
                              fontSize: '18px',
                              fontWeight: '700',
                              color: '#f1f5f9',
                              lineHeight: '1.3',
                            }}
                          >
                            {job.clientName}
                          </h3>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {job.eventLocation && (
                              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '14px', flexShrink: 0 }}>📍</span>
                                <span style={{ color: '#f1f5f9', fontSize: '13px', lineHeight: '1.4' }}>
                                  {job.eventLocation}
                                </span>
                              </div>
                            )}

                            {job.eventDate && (
                              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '14px', flexShrink: 0 }}>📅</span>
                                <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '500' }}>
                                  {formatEventDateShort(job.eventDate)}
                                  {job.eventStartTime && <span style={{ marginLeft: '6px', color: '#94a3b8' }}>• {job.eventStartTime}</span>}
                                </span>
                              </div>
                            )}

                            {job.backdropName && (
                              <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginTop: '4px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '14px', flexShrink: 0 }}>🖼️</span>
                                <span style={{ color: '#60a5fa', fontSize: '13px', fontWeight: '500' }}>
                                  {job.backdropName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* View Details Link */}
                          <div style={{ paddingTop: '12px', borderTop: '1px solid #334155' }}>
                            <span
                              style={{
                                color: '#60a5fa',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              View Details →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <footer
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px 32px 32px',
              marginTop: '64px',
              paddingTop: '32px',
              borderTop: '1px solid #334155',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                📸
              </div>
              <h3
                style={{
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                Photobooth Guys
              </h3>
            </div>
            <p
              style={{
                margin: '0',
                fontSize: '14px',
                color: '#94a3b8',
              }}
            >
              Professional photo booth services for your special events
            </p>
          </footer>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error rendering attendant hub page:', error);
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          color: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '48px',
            borderRadius: '12px',
            border: '1px solid #334155',
            textAlign: 'center',
            maxWidth: '520px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#dc2626',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '28px',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '24px',
              margin: '0 0 16px 0',
              fontWeight: '700',
            }}
          >
            Error Loading Hub
          </h1>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '16px',
              margin: '0',
              lineHeight: '1.6',
            }}
          >
            An error occurred while loading the attendant hub. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
