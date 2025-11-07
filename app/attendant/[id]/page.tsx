import { prisma } from '@/lib/prisma';

interface AttendantPageProps {
  params: Promise<{ id: string }>;
}

export default async function AttendantPage({ params }: AttendantPageProps) {
  const { id } = await params;

  try {
    // Fetch agreement with client, event, and backdropLink relations
    // Only select fields we need - don't fetch sensitive data
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        selectedBackdropName: true,
        eventId: true,
        client: {
          select: {
            firstName: true,
            phone: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            eventType: true,
            notes: true,
            address: true,
            isWhitelistClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            eventType: true,
            notes: true,
            eventName: true,
            eventPhone: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
          },
        },
      },
    });

    // If agreement not found, show custom error page
    if (!agreement || !agreement.client) {
      return <NotFoundError />;
    }

    const { client, event, backdropLink, selectedBackdropName } = agreement;
    
    // Use event data when available, otherwise fall back to client data
    const eventDate = event ? event.eventDate : client.eventDate;
    const eventLocation = event ? event.eventLocation : client.eventLocation;
    const eventStartTime = event ? event.eventStartTime : client.eventStartTime;
    const eventDuration = event ? event.eventDuration : client.eventDuration;
    const eventType = event ? event.eventType : client.eventType;
    const notes = event ? event.notes : client.notes;
    
    // For whitelist clients, get event-specific contact info
    const isWhitelistClient = client.isWhitelistClient || false;
    const eventContactName = event?.eventName || client.firstName;
    const eventContactPhone = event?.eventPhone || client.phone;

    // Check if event has passed and is more than 24 hours ago
    const isEventExpired = (() => {
      if (!eventDate) return false;
      
      try {
        // Parse event date
        const parsedEventDate = new Date(eventDate);
        if (isNaN(parsedEventDate.getTime())) return false;
        
        // If eventStartTime is provided, try to parse it and add to event date
        let eventDateTime = new Date(parsedEventDate);
        if (eventStartTime) {
          // Parse time string (could be formats like "2:00 PM", "14:00", "2 PM", etc.)
          const timeStr = eventStartTime.trim();
          const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const period = timeMatch[3]?.toUpperCase();
            
            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
            
            eventDateTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        // Calculate 24 hours after event date/time
        const expirationTime = new Date(eventDateTime);
        expirationTime.setHours(expirationTime.getHours() + 24);
        
        // Check if current time is past expiration
        return new Date() > expirationTime;
      } catch (error) {
        // If there's an error parsing dates, don't expire (fail open)
        console.error('Error checking event expiration:', error);
        return false;
      }
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

    return (
      <>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @media (max-width: 1024px) {
            main {
              grid-template-columns: 1fr !important;
            }
            main > div:last-child {
              position: static !important;
            }
          }
          .address-link {
            transition: color 0.2s;
          }
          .address-link:hover {
            color: #93c5fd !important;
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
            style={{
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              padding: '24px 0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 32px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
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
                  Photobooth Guys
                </h1>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: '500',
                  }}
                >
                  Event Information
                </p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px',
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '32px',
              alignItems: 'start',
            }}
          >
            {/* Left Column - Detailed Cards */}
            <div>
            {/* Client Information Card */}
            {client.firstName && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  marginBottom: '24px',
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
                    borderBottom: '1px solid #334155',
                  }}
                >
                  Client Information
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '24px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      First Name
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '18px',
                        color: '#f1f5f9',
                        fontWeight: '600',
                      }}
                    >
                      {client.firstName}
                    </p>
                  </div>
                  {client.phone && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Contact Number
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {client.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Contact Information Card - Only for whitelist clients */}
            {isWhitelistClient && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  marginBottom: '24px',
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
                    borderBottom: '1px solid #334155',
                  }}
                >
                  Event Contact Information
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '24px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Event Contact Name
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '18px',
                        color: '#f1f5f9',
                        fontWeight: '600',
                      }}
                    >
                      {eventContactName}
                    </p>
                  </div>
                  {eventContactPhone && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Event Contact Number
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {eventContactPhone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Information Card */}
            {(formattedEventDate ||
              eventLocation ||
              eventStartTime ||
              eventDuration ||
              eventType ||
              backdropLink?.name) && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  marginBottom: '24px',
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
                    borderBottom: '1px solid #334155',
                  }}
                >
                  Event Details
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {formattedEventDate && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Event Date
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {formattedEventDate}
                      </p>
                    </div>
                  )}

                  {eventStartTime && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Start Time
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {eventStartTime}
                      </p>
                    </div>
                  )}

                  {eventDuration && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Duration
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {eventDuration}
                      </p>
                    </div>
                  )}

                  {eventLocation && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Address
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                          lineHeight: '1.5',
                        }}
                      >
                        {eventLocation}
                      </p>
                    </div>
                  )}

                  {eventType && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Event Type
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {eventType}
                      </p>
                    </div>
                  )}

                  {backdropLink?.name && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Backdrop Choice
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '18px',
                          color: '#f1f5f9',
                          fontWeight: '600',
                        }}
                      >
                        {backdropLink.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

            {/* Right Column - Event Summary */}
            <div
              style={{
                position: 'sticky',
                top: '24px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
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
                    borderBottom: '1px solid #334155',
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
                  {/* Date */}
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

                  {/* Start Time with Duration */}
                  {formattedTimeWithDuration && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
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

                  {/* Client Name / Event Contact Name */}
                  {(isWhitelistClient ? eventContactName : client.firstName) && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {isWhitelistClient ? 'Event Contact Name:' : 'Client Name:'}
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#f1f5f9',
                          fontWeight: '500',
                        }}
                      >
                        {isWhitelistClient ? eventContactName : client.firstName}
                      </p>
                    </div>
                  )}

                  {/* Contact Phone / Event Contact Phone */}
                  {(isWhitelistClient ? eventContactPhone : client.phone) && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {isWhitelistClient ? 'Event Contact Phone:' : 'Contact Phone:'}
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#f1f5f9',
                          fontWeight: '500',
                        }}
                      >
                        {isWhitelistClient ? eventContactPhone : client.phone}
                      </p>
                    </div>
                  )}

                  {/* Event Address with Google Maps Link */}
                  {eventLocation && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
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

                  {/* Backdrop */}
                  {backdropLink?.name && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Backdrop:
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

                  {/* Selected Backdrop */}
                  {selectedBackdropName && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#10b981',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Selected Backdrop:
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '16px',
                          color: '#10b981',
                          fontWeight: '600',
                        }}
                      >
                        {selectedBackdropName}
                      </p>
                    </div>
                  )}

                  {/* Additional Info (Notes) */}
                  {notes && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: '#94a3b8',
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
          </main>

          {/* Footer */}
          <footer
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '48px 32px 0 32px',
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
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
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
          ⏰
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
            color: '#94a3b8',
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
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#94a3b8',
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
            borderTop: '1px solid #334155',
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
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
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
          Event Details Not Found
        </h1>
        <p
          style={{
            color: '#94a3b8',
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
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#94a3b8',
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
            borderTop: '1px solid #334155',
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
        </div>
      </div>
    </div>
  );
}
