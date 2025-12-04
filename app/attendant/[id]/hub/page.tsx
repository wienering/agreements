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

async function fetchAttendantJobs(id: string): Promise<{ jobs: Job[]; metrics: Metrics }> {
  try {
    // Find all BackdropLinks where URL contains the id
    const backdropLinks = await prisma.backdropLink.findMany({
      where: {
        OR: [
          { url: { contains: `/select/${id}` } },
          { url: { contains: `attendantId=${id}` } },
          { url: { contains: encodeURIComponent(`/select/${id}`) } },
          { url: { contains: encodeURIComponent(`attendantId=${id}`) } },
        ],
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
    const agreements = await prisma.agreement.findMany({
      where: {
        backdropLinkId: { in: backdropLinkIds },
        archived: false,
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
    const jobs: Job[] = agreements.map((agreement) => {
      const eventDate = agreement.event?.eventDate || agreement.client.eventDate;
      const eventLocation = agreement.event?.eventLocation || agreement.client.eventLocation;
      const eventStartTime = agreement.event?.eventStartTime || agreement.client.eventStartTime;
      const eventType = agreement.event?.eventType || agreement.client.eventType;
      const clientName = agreement.event?.eventName || `${agreement.client.firstName} ${agreement.client.lastName}`.trim();

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
        backdropSelected: !!agreement.selectedBackdropName,
        backdropName: agreement.selectedBackdropName || null,
        backdropLinkName: agreement.backdropLink?.name || null,
        isUpcoming,
        isCompleted,
      };
    });

    // Calculate metrics before filtering (include completed events in count)
    const allJobsCount = jobs.length;
    const completedCount = jobs.filter((job) => job.isCompleted).length;
    const upcomingCount = jobs.filter((job) => job.isUpcoming).length;

    // Filter out completed jobs from display
    const filteredJobs = jobs.filter((job) => !job.isCompleted);

    // Sort by event date (upcoming first, then by date ascending)
    filteredJobs.sort((a, b) => {
      if (a.isUpcoming && !b.isUpcoming) return -1;
      if (!a.isUpcoming && b.isUpcoming) return 1;
      
      if (a.eventDate && b.eventDate) {
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      if (a.eventDate) return -1;
      if (b.eventDate) return 1;
      
      return 0;
    });

    // Calculate metrics (include completed in counts but don't show them)
    const metrics: Metrics = {
      totalJobs: allJobsCount,
      upcomingEvents: upcomingCount,
      completedEvents: completedCount,
    };

    return { jobs: filteredJobs, metrics };
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

export default async function AttendantHubPage({ params }: AttendantHubPageProps) {
  const { id } = await params;
  const { jobs, metrics } = await fetchAttendantJobs(id);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        }
        .job-card {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .job-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border-color: #3b82f6 !important;
        }
      `}} />
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          color: '#f1f5f9',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <header
          className="hub-header"
          style={{
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            padding: '24px 0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '600',
                }}
              >
                📸
              </div>
              <div>
                <h1
                  style={{
                    margin: '0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Attendant Hub
                </h1>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: '500',
                  }}
                >
                  {id}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          className="hub-main"
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '48px',
            }}
          >
            {/* Total Jobs */}
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '32px',
                borderRadius: '12px',
                border: '1px solid #334155',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  📋
                </div>
              </div>
              <p
                style={{
                  margin: '0',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                }}
              >
                {metrics.totalJobs}
              </p>
            </div>

            {/* Upcoming Events */}
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '32px',
                borderRadius: '12px',
                border: '1px solid #334155',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#10b981',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  📅
                </div>
              </div>
              <p
                style={{
                  margin: '0',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                }}
              >
                {metrics.upcomingEvents}
              </p>
            </div>

            {/* Completed Events */}
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '32px',
                borderRadius: '12px',
                border: '1px solid #334155',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
                  Completed Events
                </h3>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#059669',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  ✅
                </div>
              </div>
              <p
                style={{
                  margin: '0',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                }}
              >
                {metrics.completedEvents}
              </p>
            </div>
          </div>

          {/* Jobs Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2
                style={{
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                Your Jobs
              </h2>
              <span
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                }}
              >
                {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </div>

            {jobs.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '48px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                  }}
                >
                  📭
                </div>
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#f1f5f9',
                  }}
                >
                  No Jobs Assigned
                </h3>
                <p
                  style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#94a3b8',
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '24px',
                }}
              >
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/attendant/${job.id}`}
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
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Backdrop Selected Badge */}
                      {job.backdropSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: '#10b98120',
                              color: '#10b981',
                            }}
                          >
                            ✓ Backdrop Selected
                          </span>
                        </div>
                      )}

                      {/* Client Name */}
                      <h3
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#f1f5f9',
                        }}
                      >
                        {job.clientName}
                      </h3>

                      {/* Event Details */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {job.eventDate && (
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>📅</span>
                            <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>
                              {formatEventDate(job.eventDate)}
                            </span>
                          </div>
                        )}

                        {job.eventStartTime && (
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>🕐</span>
                            <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>
                              {job.eventStartTime}
                            </span>
                          </div>
                        )}

                        {job.eventLocation && (
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>📍</span>
                            <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>
                              {job.eventLocation}
                            </span>
                          </div>
                        )}

                        {job.eventType && (
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>🎭</span>
                            <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '500' }}>
                              {job.eventType}
                            </span>
                          </div>
                        )}

                        {job.backdropName && (
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px' }}>🖼️</span>
                            <span style={{ color: '#60a5fa', fontSize: '14px', fontWeight: '500' }}>
                              {job.backdropName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* View Details Link */}
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                        <span
                          style={{
                            color: '#60a5fa',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          View Details →
                        </span>
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
            marginTop: '48px',
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
}

