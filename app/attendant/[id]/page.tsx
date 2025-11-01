import { prisma } from '@/lib/prisma';

interface AttendantPageProps {
  params: Promise<{ id: string }>;
}

export default async function AttendantPage({ params }: AttendantPageProps) {
  const { id } = await params;

  try {
    // Fetch agreement with client and backdropLink relations
    // Only select fields we need - don't fetch sensitive data
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        client: {
          select: {
            firstName: true,
            phone: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            eventType: true,
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

    const { client, backdropLink } = agreement;

    // Format event date if available
    const formattedEventDate = client.eventDate
      ? new Date(client.eventDate).toLocaleDateString('en-CA', {
          timeZone: 'America/Toronto',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    return (
      <>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          * {
            box-sizing: border-box;
          }
        `}} />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0a0f1e',
            background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#f8fafc',
            animation: 'fadeIn 0.4s ease-out',
            lineHeight: '1.6',
          }}
        >
          {/* Header */}
          <header
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              padding: '20px 0',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                📸
              </div>
              <div>
                <h1
                  style={{
                    margin: '0',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Photobooth Guys
                </h1>
                <p
                  style={{
                    margin: '2px 0 0 0',
                    fontSize: '13px',
                    color: '#94a3b8',
                    fontWeight: '500',
                    letterSpacing: '0.02em',
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
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '48px 32px',
            }}
          >
            {/* Client Information Card */}
            {client.firstName && (
              <div
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  backdropFilter: 'blur(10px)',
                  padding: '40px',
                  borderRadius: '16px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  marginBottom: '32px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)',
                  animation: 'fadeIn 0.5s ease-out 0.1s both',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '32px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: '0',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Client Information
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        color: '#94a3b8',
                        fontWeight: '500',
                      }}
                    >
                      Contact details for this event
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      First Name
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '20px',
                        color: '#ffffff',
                        fontWeight: '600',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {client.firstName}
                    </p>
                  </div>
                  {client.phone && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Contact Number
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {client.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Information Card */}
            {(formattedEventDate ||
              client.eventLocation ||
              client.eventStartTime ||
              client.eventDuration ||
              client.eventType ||
              backdropLink?.name) && (
              <div
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  backdropFilter: 'blur(10px)',
                  padding: '40px',
                  borderRadius: '16px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  marginBottom: '32px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)',
                  animation: 'fadeIn 0.5s ease-out 0.2s both',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '32px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    📅
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: '0',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Event Details
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        color: '#94a3b8',
                        fontWeight: '500',
                      }}
                    >
                      Complete event information
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                  }}
                >
                  {formattedEventDate && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Event Date
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {formattedEventDate}
                      </p>
                    </div>
                  )}

                  {client.eventStartTime && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Start Time
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {client.eventStartTime}
                      </p>
                    </div>
                  )}

                  {client.eventDuration && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Duration
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {client.eventDuration}
                      </p>
                    </div>
                  )}

                  {client.eventLocation && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Address
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                          lineHeight: '1.5',
                        }}
                      >
                        {client.eventLocation}
                      </p>
                    </div>
                  )}

                  {client.eventType && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Event Type
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {client.eventType}
                      </p>
                    </div>
                  )}

                  {backdropLink?.name && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Backdrop Choice
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '20px',
                          color: '#ffffff',
                          fontWeight: '600',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {backdropLink.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <footer
              style={{
                marginTop: '64px',
                paddingTop: '40px',
                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '700',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    📸
                  </div>
                  <h3
                    style={{
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#ffffff',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Photobooth Guys
                  </h3>
                </div>
                <p
                  style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#64748b',
                    fontWeight: '400',
                  }}
                >
                  Professional photo booth services for your special events
                </p>
              </div>
            </footer>
          </main>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return <NotFoundError />;
  }
}

// Custom error component for when agreement is not found
function NotFoundError() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f1e',
        background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(12px)',
          padding: '48px',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          textAlign: 'center',
          maxWidth: '560px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '32px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '28px',
            margin: '0 0 16px 0',
            fontWeight: '700',
            letterSpacing: '-0.02em',
          }}
        >
          Event Details Not Found
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '16px',
            margin: '0 0 32px 0',
            lineHeight: '1.6',
          }}
        >
          We could not find the event details for the provided link. The link may
          be incorrect or the event may have been removed.
        </p>
        <div
          style={{
            padding: '20px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            marginBottom: '32px',
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
            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
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
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
              }}
            >
              📸
            </div>
            <h3
              style={{
                margin: '0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
                letterSpacing: '-0.01em',
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
