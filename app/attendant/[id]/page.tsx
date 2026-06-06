import { prisma } from '@/lib/prisma';
import { getBackdropThumbnailUrl } from '@/lib/backdropThumbnail';
import { Metadata } from 'next';
import Link from 'next/link';
import AttendantFilesSection from './AttendantFilesSection';
import { UIcon } from '../../components/UIcon';

interface AttendantPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Force dynamic rendering to ensure backdrop selections update immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: AttendantPageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Fetch agreement with event date for title
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        event: {
          select: {
            eventDate: true,
          },
        },
        client: {
          select: {
            eventDate: true,
          },
        },
      },
    });

    if (!agreement) {
      return {
        title: 'Event Details Not Found',
      };
    }

    // Use event data when available, otherwise fall back to client data
    const eventDate = agreement.event?.eventDate || agreement.client?.eventDate;
    
    // Format event date for title (e.g., "November 2, 2025")
    const formattedEventDate = eventDate
      ? new Date(eventDate).toLocaleDateString('en-US', {
          timeZone: 'America/Toronto',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    const title = formattedEventDate 
      ? `Event Details - ${formattedEventDate}`
      : 'Event Details';

    return {
      title,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Event Details',
    };
  }
}

export default async function AttendantPage({ params, searchParams }: AttendantPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const fromGroup = resolvedSearchParams.fromGroup as string | undefined;

  try {
    // Fetch agreement with client, event, and backdropLink relations
    // Only select fields we need - don't fetch sensitive data
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        selectedBackdropName: true,
        eventId: true,
        showPhoneNumberAlways: true,
        forceVirtualGreenScreen: true,
        client: {
          select: {
            firstName: true,
            phone: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            notes: true,
            isWhitelabelClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            notes: true,
            eventName: true,
            eventPhone: true,
            unlimitedPrints: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
            url: true,
          },
        },
      },
    });

    // If agreement not found, show custom error page
    if (!agreement || !agreement.client) {
      return <NotFoundError />;
    }

    const { client, event, backdropLink, selectedBackdropName, showPhoneNumberAlways, forceVirtualGreenScreen } = agreement;
    
    // Extract attendantId from backdropLink URL for navigation back to hub
    const extractAttendantIdFromUrl = (url: string | null): string | null => {
      if (!url) return null;
      try {
        // Try to extract from path like /select/[attendantId]
        const pathMatch = url.match(/\/select\/([^/?]+)/);
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1];
        }
        
        // Try to extract from query parameter
        const urlObj = new URL(url);
        const attendantIdParam = urlObj.searchParams.get('attendantId');
        if (attendantIdParam) {
          return attendantIdParam;
        }
        
        // Try to extract from path segments
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const selectIndex = pathSegments.indexOf('select');
        if (selectIndex !== -1 && pathSegments[selectIndex + 1]) {
          return pathSegments[selectIndex + 1];
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting attendant ID from URL:', error);
        return null;
      }
    };
    
    const attendantId = backdropLink?.url ? extractAttendantIdFromUrl(backdropLink.url) : null;

    // Fetch backdrop thumbnail when we have a catalog backdrop (not Virtual Green Screen or No Backdrop)
    let backdropThumbnailUrl: string | null = null;
    if (
      attendantId &&
      selectedBackdropName &&
      selectedBackdropName !== 'No Backdrop' &&
      !forceVirtualGreenScreen
    ) {
      backdropThumbnailUrl = await getBackdropThumbnailUrl(attendantId, selectedBackdropName);
    }

    // Determine the hub link - use group slug if fromGroup parameter is present, otherwise use individual attendant ID
    const hubLink = fromGroup 
      ? `/attendants/${fromGroup}/hub`
      : attendantId 
        ? `/attendants/${attendantId}/hub`
        : null;
    
    // Use event data when available, otherwise fall back to client data
    const eventDate = event ? event.eventDate : client.eventDate;
    const eventLocation = event ? event.eventLocation : client.eventLocation;
    const eventStartTime = event ? event.eventStartTime : client.eventStartTime;
    const eventDuration = event ? event.eventDuration : client.eventDuration;
    const notes = event ? event.notes : client.notes;

    const fileCount = await prisma.clientFile.count({
      where: {
        clientId: agreement.clientId,
        ...(agreement.eventId
          ? { OR: [{ eventId: agreement.eventId }, { eventId: null }] }
          : {}),
      },
    });
    
    // For whitelabel clients, get event-specific contact info
    const isWhitelabelClient = client.isWhitelabelClient || false;
    const eventContactName = event?.eventName || client.firstName;
    const eventContactPhone = event?.eventPhone || client.phone;

    // Helper function to calculate event datetime
    const getEventDateTime = () => {
      if (!eventDate) return null;
      
      try {
        // Parse event date - handle timezone correctly by extracting UTC date components
        // Dates from Prisma are stored as UTC midnight, so we need to extract the UTC
        // year/month/day to get the intended calendar date, then create a local date
        let year: number, month: number, day: number;
        
        // Convert to Date object first (handles both Date objects and ISO strings)
        const dateObj = new Date(eventDate);
        if (isNaN(dateObj.getTime())) return null;
        
        // Use toISOString() to get a reliable format for parsing the intended date
        // This gives us "2025-11-28T00:00:00.000Z" format regardless of input type
        const isoString = dateObj.toISOString();
        const dateMatch = isoString.match(/(\d{4})-(\d{2})-(\d{2})/);
        
        if (dateMatch) {
          // Parse from ISO string format to get the intended calendar date
          year = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10) - 1; // JavaScript months are 0-indexed
          day = parseInt(dateMatch[3], 10);
        } else {
          // Fallback: use UTC values to get the intended date
          year = dateObj.getUTCFullYear();
          month = dateObj.getUTCMonth();
          day = dateObj.getUTCDate();
        }
        
        // Create date in local timezone at midnight, using the intended calendar date
        let eventDateTime = new Date(year, month, day, 0, 0, 0, 0);
        
        // If eventStartTime is provided, try to parse it and add to event date
        if (eventStartTime) {
          // Parse time string (could be formats like "2:00 PM", "14:00", "2 PM", "6:30:00 PM", etc.)
          const timeStr = String(eventStartTime).trim();
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i) || 
                           timeStr.match(/(\d{1,2})\s*(AM|PM)/i);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] && !timeMatch[2].match(/AM|PM/i) ? parseInt(timeMatch[2], 10) : 0;
            const period = (timeMatch[3] || timeMatch[2])?.toUpperCase();
            
            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
            
            eventDateTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        return eventDateTime;
      } catch (error) {
        console.error('Error parsing event datetime:', error);
        return null;
      }
    };

    // Check if event has passed and is more than 24 hours ago
    const isEventExpired = (() => {
      const eventDateTime = getEventDateTime();
      if (!eventDateTime) return false;
      
      // Calculate 24 hours after event date/time
      const expirationTime = new Date(eventDateTime);
      expirationTime.setHours(expirationTime.getHours() + 24);
      
      // Check if current time is past expiration
      return new Date() > expirationTime;
    })();

    // Check if event is within 24 hours (before or after) to show phone number
    const isEventWithin24Hours = (() => {
      const eventDateTime = getEventDateTime();
      if (!eventDateTime) return false;
      
      const now = new Date();
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Show phone if event is within 24 hours before OR up to 24 hours after
      // (Page is accessible until 24 hours after, so phone should be visible in that window too)
      return hoursUntilEvent >= -24 && hoursUntilEvent <= 24;
    })();

    // If event has expired (more than 24 hours after), show expired message
    if (isEventExpired) {
      return <EventExpiredError />;
    }

    // Format event date for display (e.g., "November 2, 2025")
    const formattedEventDate = eventDate
      ? new Date(eventDate).toLocaleDateString('en-US', {
          timeZone: 'America/Toronto',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    // Format time with duration (e.g., "8:00 pm - 6 hours")
    const formattedTimeWithDuration = (() => {
      if (!eventStartTime && !eventDuration) return null;
      const time = eventStartTime || '';
      const duration = eventDuration || '';
      if (!time && !duration) return null;
      if (time && duration) return `${time} - ${duration}`;
      return time || duration;
    })();

    // Generate Google Maps URL for address
    const getGoogleMapsUrl = (address: string | null) => {
      if (!address) return null;
      const encoded = encodeURIComponent(address);
      return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    };

    // Generate tel: link for phone number
    const getTelLink = (phone: string | null) => {
      if (!phone) return null;
      // Remove all non-digit characters except + for international numbers
      const cleaned = phone.replace(/[^\d+]/g, '');
      return `tel:${cleaned}`;
    };

    return (
      <>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .back-to-hub-link:hover {
            background-color: #475569 !important;
            border-color: #64748b !important;
          }
          @media (max-width: 1024px) {
            .attendant-main {
              grid-template-columns: 1fr !important;
              display: flex !important;
              flex-direction: column !important;
              padding: 32px 24px !important;
              gap: 24px !important;
              max-width: 100% !important;
            }
            .attendant-right-column {
              position: static !important;
              order: 1 !important;
              margin-bottom: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .attendant-left-column {
              order: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .attendant-header {
              padding: 20px 0 !important;
            }
            .attendant-header-content {
              padding: 0 24px !important;
            }
            .attendant-card {
              padding: 24px !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .attendant-card-grid {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
            }
          }
          @media (max-width: 1000px) {
            .attendant-main {
              padding: 28px 20px !important;
            }
            .attendant-header-content {
              padding: 0 20px !important;
            }
            .attendant-card {
              padding: 24px !important;
            }
          }
          @media (max-width: 980px) {
            .attendant-main {
              padding: 24px 20px !important;
            }
            .attendant-header-content {
              padding: 0 20px !important;
            }
          }
          @media (max-width: 768px) {
            .attendant-main {
              padding: 24px 16px !important;
            }
            .attendant-header {
              padding: 16px 0 !important;
            }
            .attendant-header-content {
              padding: 0 16px !important;
            }
            .attendant-card {
              padding: 20px !important;
            }
            .attendant-footer {
              padding: 32px 16px 0 16px !important;
            }
          }
          .address-link {
            transition: color 0.2s;
          }
          .address-link:hover {
            color: #93c5fd !important;
          }
          a[href^="tel:"] {
            transition: color 0.2s;
          }
          a[href^="tel:"]:hover {
            color: #93c5fd !important;
          }
        `}} />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#080c08',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            color: '#f1f5f9',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Header */}
          <header
            className="attendant-header"
            style={{
              backgroundColor: '#1a1d1a',
              borderBottom: '1px solid #2d3530',
              padding: '24px 0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              className="attendant-header-content"
              style={{
                maxWidth: '1200px',
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
                    backgroundColor: 'var(--accent)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: '600',
                  }}
                >
                  <UIcon name="camera" style={{ fontSize: '24px', color: 'white' }} />
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
                    Photobooth Guys
                  </h1>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '14px',
                      color: '#8f9a8f',
                      fontWeight: '500',
                    }}
                  >
                    Event Information
                  </p>
                </div>
              </div>
              {hubLink && (
                <Link
                  href={hubLink}
                  className="back-to-hub-link"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#2d3530',
                    color: '#f1f5f9',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    border: '1px solid #475569',
                  }}
                >
                  <span>←</span>
                  <span>Back to Hub</span>
                </Link>
              )}
            </div>
          </header>

          {/* Main Content — summary left; event files right only when files exist */}
          <main
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px',
              display: 'grid',
              gridTemplateColumns: fileCount > 0 ? '1fr 380px' : 'minmax(0, 1fr)',
              gap: '32px',
              alignItems: 'start',
            }}
            className="attendant-main"
          >
            <div className="attendant-left-column">
              <div
                className="attendant-card"
                style={{
                  backgroundColor: '#1a1d1a',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #2d3530',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 24px 0',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#ffffff',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #2d3530',
                  }}
                >
                  Event Summary
                </h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  {formattedEventDate && (
                    <div>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                          lineHeight: '1.6',
                        }}
                      >
                        {formattedEventDate}
                      </p>
                    </div>
                  )}

                  {formattedTimeWithDuration && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#8f9a8f',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Start Time:
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#f1f5f9',
                          fontWeight: '500',
                        }}
                      >
                        {formattedTimeWithDuration}
                      </p>
                    </div>
                  )}

                  {(isWhitelabelClient ? eventContactName : client.firstName) && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#8f9a8f',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {isWhitelabelClient ? 'Event Contact Name:' : 'Client Name:'}
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#f1f5f9',
                          fontWeight: '500',
                        }}
                      >
                        {isWhitelabelClient ? eventContactName : client.firstName}
                      </p>
                    </div>
                  )}

                  {(isWhitelabelClient ? eventContactPhone : client.phone) &&
                    (isEventWithin24Hours || showPhoneNumberAlways) && (
                      <div>
                        <p
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '14px',
                            color: '#8f9a8f',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {isWhitelabelClient ? 'Event Contact Phone:' : 'Contact Phone:'}
                        </p>
                        <a
                          href={
                            getTelLink(isWhitelabelClient ? eventContactPhone : client.phone) || '#'
                          }
                          style={{
                            margin: '0',
                            fontSize: '16px',
                            color: '#60a5fa',
                            fontWeight: '500',
                            textDecoration: 'none',
                            display: 'block',
                          }}
                        >
                          {isWhitelabelClient ? eventContactPhone : client.phone}
                        </a>
                      </div>
                    )}

                  {eventLocation && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#8f9a8f',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Event Address:
                      </p>
                      <a
                        href={getGoogleMapsUrl(eventLocation) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="address-link"
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#60a5fa',
                          fontWeight: '500',
                          textDecoration: 'none',
                          lineHeight: '1.6',
                          display: 'block',
                        }}
                      >
                        {eventLocation}
                      </a>
                    </div>
                  )}

                  {backdropLink?.name && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#8f9a8f',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Attendant:
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#f1f5f9',
                          fontWeight: '500',
                        }}
                      >
                        {backdropLink.name}
                      </p>
                    </div>
                  )}

                  {(forceVirtualGreenScreen || selectedBackdropName) && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: 'var(--accent)',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Selected Backdrop:
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '4px',
                        }}
                      >
                        {backdropThumbnailUrl && (
                          <img
                            src={backdropThumbnailUrl}
                            alt=""
                            style={{
                              width: '64px',
                              height: '64px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #2d3530',
                            }}
                          />
                        )}
                        <p
                          style={{
                            margin: '0',
                            fontSize: '16px',
                            color: 'var(--accent)',
                            fontWeight: '600',
                          }}
                        >
                          {forceVirtualGreenScreen ? 'Virtual Green Screen' : selectedBackdropName}
                        </p>
                      </div>
                    </div>
                  )}

                  {event?.unlimitedPrints && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(var(--accent-rgb), 0.12)',
                        borderRadius: '8px',
                        border: '1px solid rgba(var(--accent-rgb), 0.35)',
                      }}
                    >
                      <span style={{ fontSize: '20px', color: 'var(--accent)', fontWeight: '700', lineHeight: '1' }}>∞</span>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: 'var(--accent)',
                          fontWeight: '700',
                          letterSpacing: '0.01em',
                        }}
                      >
                        Unlimited Prints
                      </p>
                    </div>
                  )}

                  {notes && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#8f9a8f',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Additional Info:
                      </p>
                      <div
                        style={{
                          marginTop: '8px',
                        }}
                      >
                        {(notes || '').split('\n').map((line: string, idx: number) => (
                          <p
                            key={idx}
                            style={{
                              margin: idx > 0 ? '8px 0 0 0' : '0',
                              fontSize: '16px',
                              color: '#f1f5f9',
                              fontWeight: '500',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {fileCount > 0 && (
              <div
                className="attendant-right-column"
                style={{
                  position: 'sticky',
                  top: '24px',
                }}
              >
                <AttendantFilesSection agreementId={agreement.id} />
              </div>
            )}
          </main>

          {/* Footer */}
          <footer
            className="attendant-footer"
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px 0 32px',
              marginTop: '48px',
              paddingTop: '32px',
              borderTop: '1px solid #2d3530',
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
                    backgroundColor: 'var(--accent)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  <UIcon name="camera" style={{ fontSize: '24px', color: 'white' }} />
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
                  color: '#8f9a8f',
                }}
              >
                Professional photo booth services for your special events
              </p>
            </footer>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return <NotFoundError />;
  }
}

// Custom error component for when event has expired (24 hours after event)
function EventExpiredError() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080c08',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1d1a',
          padding: '48px',
          borderRadius: '12px',
          border: '1px solid #2d3530',
          textAlign: 'center',
          maxWidth: '520px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f59e0b',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '28px',
          }}
        >
          <UIcon name="clock" style={{ fontSize: '28px', color: '#ffffff' }} />
        </div>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
          }}
        >
          Event Information Expired
        </h1>
        <p
          style={{
            color: '#8f9a8f',
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          This event information is no longer available. Event details are only accessible up to 24 hours after the event date and time.
        </p>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#080c08',
            borderRadius: '8px',
            border: '1px solid #2d3530',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#8f9a8f',
              lineHeight: '1.6',
            }}
          >
            If you need access to this information, please contact{' '}
            <strong style={{ color: '#60a5fa', fontWeight: '600' }}>info@photoboothguys.ca</strong>
          </p>
        </div>
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid #2d3530',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--accent)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              <UIcon name="camera" style={{ fontSize: '16px', color: 'white' }} />
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
        </div>
      </div>
    </div>
  );
}

// Custom error component for when agreement is not found
function NotFoundError() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080c08',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1d1a',
          padding: '48px',
          borderRadius: '12px',
          border: '1px solid #2d3530',
          textAlign: 'center',
          maxWidth: '520px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
          <UIcon name="circle-exclamation" style={{ fontSize: '28px', color: '#ffffff' }} title="Warning" />
        </div>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
          }}
        >
          Event Details Not Found
        </h1>
        <p
          style={{
            color: '#8f9a8f',
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          We could not find the event details for the provided link. The link may
          be incorrect or the event may have been removed.
        </p>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#080c08',
            borderRadius: '8px',
            border: '1px solid #2d3530',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#8f9a8f',
              lineHeight: '1.6',
            }}
          >
            Please contact us at{' '}
            <strong style={{ color: '#60a5fa', fontWeight: '600' }}>info@photoboothguys.ca</strong>{' '}
            if you believe this is an error.
          </p>
        </div>
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid #2d3530',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--accent)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              <UIcon name="camera" style={{ fontSize: '16px', color: 'white' }} />
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
            <a
              href="tel:+16473785332"
              style={{
                fontSize: '14px',
                color: '#93c5fd',
                textDecoration: 'none',
                marginLeft: '12px',
              }}
            >
              647-378-5332
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
