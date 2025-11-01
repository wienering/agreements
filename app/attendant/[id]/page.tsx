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
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0f172a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#f1f5f9',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              padding: '24px 0',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700',
                }}
              >
                📸
              </div>
              <div>
                <h1
                  style={{
                    margin: '0',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#f1f5f9',
                  }}
                >
                  Photobooth Guys
                </h1>
                <p
                  style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#94a3b8',
                  }}
                >
                  Event Details
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '40px 24px',
            }}
          >
            {/* Client Information Card */}
            {client.firstName && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  marginBottom: '24px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    👤
                  </div>
                  <h2
                    style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#f1f5f9',
                    }}
                  >
                    Client Information
                  </h2>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
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
                        letterSpacing: '0.5px',
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
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        📞 {client.phone}
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
                  backgroundColor: '#1e293b',
                  padding: '32px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  marginBottom: '24px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    📅
                  </div>
                  <h2
                    style={{
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#f1f5f9',
                    }}
                  >
                    Event Details
                  </h2>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
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
                          letterSpacing: '0.5px',
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

                  {client.eventStartTime && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        ⏰ {client.eventStartTime}
                      </p>
                    </div>
                  )}

                  {client.eventDuration && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        ⏱️ {client.eventDuration}
                      </p>
                    </div>
                  )}

                  {client.eventLocation && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        📍 {client.eventLocation}
                      </p>
                    </div>
                  )}

                  {client.eventType && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        🎉 {client.eventType}
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
                          letterSpacing: '0.5px',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        🎨 {backdropLink.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                backgroundColor: '#1e293b',
                borderTop: '1px solid #334155',
                padding: '32px 0',
                marginTop: '40px',
              }}
            >
              <div
                style={{
                  maxWidth: '1200px',
                  margin: '0 auto',
                  padding: '0 24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}
                  >
                    📸
                  </div>
                  <h3
                    style={{
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#f1f5f9',
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
              </div>
            </div>
          </div>
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
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #334155',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '24px',
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            color: '#f1f5f9',
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
            lineHeight: '1.5',
          }}
        >
          We couldn't find the event details for the provided link. The link may
          be incorrect or the event may have been removed.
        </p>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #334155',
            marginTop: '24px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#94a3b8',
            }}
          >
            Please contact us at{' '}
            <strong style={{ color: '#3b82f6' }}>info@photoboothguys.ca</strong>{' '}
            if you believe this is an error.
          </p>
        </div>
        <div
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3b82f6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
              }}
            >
              📸
            </div>
            <h3
              style={{
                margin: '0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#f1f5f9',
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

