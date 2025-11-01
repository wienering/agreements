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
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}} />
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#1e293b',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Header */}
          <header
            style={{
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '24px 0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Photobooth Guys
                </h1>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '14px',
                    color: '#64748b',
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
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '48px 32px',
            }}
          >
            {/* Client Information Card */}
            {client.firstName && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 24px 0',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#0f172a',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e2e8f0',
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
                        color: '#64748b',
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
                        color: '#0f172a',
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
                          color: '#64748b',
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
                          color: '#0f172a',
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

            {/* Event Information Card */}
            {(formattedEventDate ||
              client.eventLocation ||
              client.eventStartTime ||
              client.eventDuration ||
              client.eventType ||
              backdropLink?.name) && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 24px 0',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#0f172a',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e2e8f0',
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
                          color: '#64748b',
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
                          color: '#0f172a',
                          fontWeight: '600',
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
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#64748b',
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
                          color: '#0f172a',
                          fontWeight: '600',
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
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#64748b',
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
                          color: '#0f172a',
                          fontWeight: '600',
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
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#64748b',
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
                          color: '#0f172a',
                          fontWeight: '600',
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
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#64748b',
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
                          color: '#0f172a',
                          fontWeight: '600',
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
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#64748b',
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
                          color: '#0f172a',
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

            {/* Footer */}
            <footer
              style={{
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid #e2e8f0',
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
                    color: '#0f172a',
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
                }}
              >
                Professional photo booth services for your special events
              </p>
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
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '32px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '48px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          maxWidth: '520px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fef2f2',
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
            color: '#0f172a',
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
          }}
        >
          Event Details Not Found
        </h1>
        <p
          style={{
            color: '#64748b',
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
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#64748b',
              lineHeight: '1.6',
            }}
          >
            Please contact us at{' '}
            <strong style={{ color: '#3b82f6', fontWeight: '600' }}>info@photoboothguys.ca</strong>{' '}
            if you believe this is an error.
          </p>
        </div>
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
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
                color: '#0f172a',
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

