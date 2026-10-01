'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UIcon } from '../../../components/UIcon';
import { formatDateTimeToronto, formatDateToronto } from '@/lib/dates';

interface AgreementData {
  id: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    eventDate: string | null;
    eventType: string | null;
    eventLocation: string | null;
    eventStartTime: string | null;
    eventDuration: string | null;
    eventPackage: string | null;
    packagePrice: number | null;
    notes: string | null;
  };
  event?: {
    eventDate?: string | null;
    eventType?: string | null;
    eventLocation?: string | null;
    eventPackage?: string | null;
    packagePrice?: number | string | null;
  } | null;
  template: {
    title: string;
    htmlContent: string;
  };
  status: string;
  signedAt: string | null;
  signedFromIP: string | null;
  mergedHtml: string | null;
  fields: Array<{
    key: string;
    value: string;
  }>;
}

export default function ThankYouPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Thank You | Agreement Signed | Photobooth Guys';
  }, []);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem(`agreement-signer-email-${token}`);
    if (storedEmail) {
      loadAgreement(storedEmail);
    } else {
      setNeedsEmail(true);
      setLoading(false);
    }
  }, [token]);

  const loadAgreement = async (email: string) => {
    setLoading(true);
    setError(null);
    setNeedsEmail(false);

    try {
      const response = await fetch('/api/agreements/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAgreement(data.agreement);
        try {
          sessionStorage.setItem(`agreement-signer-email-${token}`, email.trim());
        } catch {
          // ignore
        }
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
      } else {
        setError(data.error || 'Failed to load agreement.');
        setNeedsEmail(true);
      }
    } catch {
      setError('Error loading agreement.');
      setNeedsEmail(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!verificationEmail.trim()) return;
    setIsVerifying(true);
    await loadAgreement(verificationEmail);
    setIsVerifying(false);
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/agreements/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const isTextFile = response.headers.get('content-type')?.includes('text/plain');
        const extension = isTextFile ? 'txt' : 'pdf';
        a.download = `agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download agreement. Please try again later.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading agreement. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailAgreement = () => {
    if (!agreement) return;
    
    setEmailAddress(agreement.client.email);
    setShowEmailModal(true);
    setEmailError(null);
  };

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      setEmailError('Please enter an email address');
      return;
    }

    setIsEmailing(true);
    setEmailError(null);

    try {
      const response = await fetch('/api/agreements/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          recipientEmail: emailAddress.trim(),
        }),
      });

      if (response.ok) {
        setShowEmailModal(false);
        setEmailAddress('');
        alert('Email sent successfully!');
      } else {
        const errorData = await response.json();
        setEmailError(errorData.error || 'Failed to send email');
      }
    } catch (err) {
      setEmailError('Error sending email');
    } finally {
      setIsEmailing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'var(--font-ui), system-ui, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid var(--hairline)`,
          borderTop: '4px solid var(--coral)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ 
          color: 'var(--muted)',
          fontSize: '16px'
        }}>
          Loading your agreement...
        </p>
      </div>
    );
  }

  if (needsEmail && !agreement) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui), system-ui, sans-serif',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: 'var(--panel)',
          padding: '40px',
          borderRadius: '2px',
          border: `1px solid var(--hairline)`,
          maxWidth: '420px',
          width: '100%',
        }}>
          <h1 style={{
            color: 'var(--ink)',
            fontSize: '24px',
            margin: '0',
            fontWeight: '700',
            fontFamily: 'var(--font-display), Helvetica, Arial, sans-serif',
          }}>
            Confirm Your Email
          </h1>
          <div style={{ height: '1px', width: '100%', backgroundColor: 'var(--rule-strong)', margin: '12px 0 16px' }} aria-hidden="true" />
          <p style={{
            color: 'var(--muted)',
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.5',
          }}>
            Enter the email address you used to sign this agreement to view your confirmation page.
          </p>
          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--panel)',
                border: '1px solid var(--alert)',
                borderRadius: '2px',
                color: 'var(--alert)',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--ink)',
          }}>
            Email Address
          </label>
          <input
            type="email"
            value={verificationEmail}
            onChange={(e) => setVerificationEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEmailSubmit();
            }}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--hairline)',
              borderRadius: '2px',
              backgroundColor: '#fff',
              color: 'var(--ink)',
              fontSize: '14px',
              marginBottom: '20px',
              boxSizing: 'border-box',
            }}
            placeholder="you@example.com"
          />
          <button
            onClick={handleEmailSubmit}
            disabled={isVerifying || !verificationEmail.trim()}
            style={{
              width: '100%',
              backgroundColor: isVerifying || !verificationEmail.trim() ? 'var(--hairline)' : 'var(--coral)',
              color: isVerifying || !verificationEmail.trim() ? 'var(--muted)' : 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '2px',
              cursor: isVerifying || !verificationEmail.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: isVerifying ? 0.7 : 1,
            }}
          >
            {isVerifying ? 'Loading...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui), system-ui, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'var(--panel)',
          padding: '40px',
          borderRadius: '2px',
          border: `1px solid var(--hairline)`,
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            color: 'var(--warn)',
          }}>
            <UIcon name="circle-exclamation" style={{ fontSize: '48px' }} title="Warning" />
          </div>
          <h1 style={{ 
            color: 'var(--ink)', 
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700',
            fontFamily: 'var(--font-display), Helvetica, Arial, sans-serif',
          }}>
            Agreement Not Found
          </h1>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '16px',
            margin: '0'
          }}>
            {error || 'Failed to load agreement'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes checkmarkPulse {
          0% {
            transform: scale(0.8);
            box-shadow: 0 0 0 0 rgba(63, 111, 79, 0.7);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 20px rgba(63, 111, 79, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(63, 111, 79, 0);
          }
        }
        
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--paper)',
        fontFamily: 'var(--font-ui), system-ui, sans-serif'
      }}>
        {/* Success Header */}
        <div style={{
          backgroundColor: 'var(--panel)',
          borderBottom: `1px solid var(--hairline)`,
          padding: '40px 0',
          textAlign: 'center',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0 24px'
          }}>
            {/* Animated Checkmark */}
            <div style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--success)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px auto',
              fontSize: '48px',
              color: 'white',
              animation: 'checkmarkPulse 1s ease-in-out',
            }}>
              <UIcon name="check" style={{ fontSize: '48px', color: 'white' }} title="Success" />
            </div>
            
            <h1 style={{
              margin: '0',
              fontSize: '48px',
              fontWeight: '800',
              color: 'var(--ink)',
              fontFamily: 'var(--font-display), Helvetica, Arial, sans-serif',
              animation: 'slideIn 0.8s ease-out'
            }}>
              Thank You!
            </h1>
            <div style={{ height: '1px', width: '100%', backgroundColor: 'var(--rule-strong)', margin: '12px auto 16px' }} aria-hidden="true" />
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '20px',
              color: 'var(--muted)',
              lineHeight: '1.6'
            }}>
              Your agreement has been successfully signed and is now binding.
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'var(--paper)',
              borderRadius: '2px',
              border: `1px solid var(--hairline)`,
              fontSize: '16px',
              color: 'var(--ink)',
              fontWeight: '600'
            }}>
              <UIcon name="envelope" style={{ flexShrink: 0 }} />
              A copy has been emailed to {agreement.client.email}
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px'
        }}>
          {/* Agreement Summary */}
          <div style={{
            backgroundColor: 'var(--panel)',
            padding: '32px',
            borderRadius: '2px',
            border: `1px solid var(--hairline)`,
            marginBottom: '32px',
            animation: 'fadeIn 0.8s ease-out 0.2s both'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--ink)'
            }}>
              Agreement Summary
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Client Information
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: 'var(--ink)',
                  fontWeight: '500'
                }}>
                  {agreement.client.firstName} {agreement.client.lastName}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: 'var(--muted)'
                }}>
                  {agreement.client.email}
                </p>
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Event Details
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: 'var(--ink)',
                  fontWeight: '500'
                }}>
                  {(agreement.event?.eventType ?? agreement.client.eventType) || 'Not specified'}
                </p>
                {((agreement.event?.eventDate ?? agreement.client.eventDate)) && (
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    color: 'var(--muted)'
                  }}>
                    {formatDateToronto(agreement.event?.eventDate ?? agreement.client.eventDate!)}
                  </p>
                )}
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: 'var(--muted)'
                }}>
                  {(agreement.event?.eventLocation ?? agreement.client.eventLocation) || 'Location TBD'}
                </p>
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Package
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: 'var(--ink)',
                  fontWeight: '500'
                }}>
                  {(agreement.event?.eventPackage ?? agreement.client.eventPackage) || 'Standard Package'}
                </p>
                {(agreement.event?.packagePrice ?? agreement.client.packagePrice) && (
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: 'var(--muted)'
                  }}>
                    ${typeof (agreement.event?.packagePrice ?? agreement.client.packagePrice) === 'number' 
                      ? Number(agreement.event?.packagePrice ?? agreement.client.packagePrice).toFixed(2) 
                      : String(agreement.event?.packagePrice ?? agreement.client.packagePrice)}
                  </p>
                )}
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Signed On
                </h3>
                <p style={{
                  margin: '0',
                  fontSize: '16px',
                  color: 'var(--ink)',
                  fontWeight: '500'
                }}>
                  {agreement.signedAt ? formatDateTimeToronto(agreement.signedAt, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '40px',
            animation: 'fadeIn 1s ease-out 0.4s both'
          }}>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              style={{
                backgroundColor: isDownloading ? 'var(--hairline)' : 'var(--coral)',
                color: isDownloading ? 'var(--muted)' : 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '2px',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { if (!isDownloading) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { if (!isDownloading) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {isDownloading ? (
                <UIcon name="spinner" className="animate-spin" style={{ fontSize: '18px' }} />
              ) : (
                <UIcon name="file-pdf" style={{ fontSize: '18px' }} />
              )}{' '}
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
            
            <button
              onClick={handleEmailAgreement}
              disabled={isEmailing}
              style={{
                backgroundColor: isEmailing ? 'var(--hairline)' : 'var(--coral)',
                color: isEmailing ? 'var(--muted)' : 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '2px',
                cursor: isEmailing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { if (!isEmailing) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { if (!isEmailing) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {isEmailing ? (
                <UIcon name="spinner" className="animate-spin" style={{ fontSize: '18px' }} />
              ) : (
                <UIcon name="envelope" style={{ fontSize: '18px' }} />
              )}{' '}
              {isEmailing ? 'Sending...' : 'Email Copy'}
            </button>
          </div>

          {/* Next Steps */}
          <div style={{
            backgroundColor: 'var(--panel)',
            padding: '32px',
            borderRadius: '2px',
            border: `1px solid var(--hairline)`,
            marginBottom: '32px',
            animation: 'fadeIn 1.2s ease-out 0.6s both'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--ink)'
            }}>
              What&apos;s Next?
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--paper)',
                borderRadius: '2px',
                border: `1px solid var(--hairline)`
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--ink)'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <UIcon name="link" />
                    Access Your Client Portal
                  </span>
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: 'var(--muted)',
                  lineHeight: '1.5'
                }}>
                  View all your agreements, track payment status, access your event gallery, and manage your event details in one convenient place.
                </p>
                <a
                  href="/portal/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: 'var(--coral)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Open Client Portal →
                </a>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--paper)',
                borderRadius: '2px',
                border: `1px solid var(--hairline)`
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--ink)'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <UIcon name="camera" />
                    Choose Your Print Template
                  </span>
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: 'var(--muted)',
                  lineHeight: '1.5'
                }}>
                  Select from our collection of professional photo booth templates to match your event theme.
                </p>
                <a
                  href="https://photoboothguys.ca/photo-booth-templates-chooser"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: 'var(--coral)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Browse Templates →
                </a>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--paper)',
                borderRadius: '2px',
                border: `1px solid var(--hairline)`
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--ink)'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <UIcon name="phone-call" />
                    Contact Us
                  </span>
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: 'var(--muted)',
                  lineHeight: '1.5'
                }}>
                  Have questions about your event? Our team is here to help make your day perfect.
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '14px',
                  color: 'var(--ink)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UIcon name="envelope" style={{ flexShrink: 0, opacity: 0.85 }} />
                    info@photoboothguys.ca
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UIcon name="phone-call" style={{ flexShrink: 0, opacity: 0.85 }} />
                    647-378-5332
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'var(--panel)',
              padding: '32px',
              borderRadius: '2px',
              border: `1px solid var(--hairline)`,
              maxWidth: '400px',
              width: '90%'
            }}>
              <h2 style={{ 
                margin: '0 0 24px 0', 
                fontSize: '20px', 
                color: 'var(--ink)' 
              }}>
                Email Agreement Copy
              </h2>
              <p style={{ 
                margin: '0 0 24px 0', 
                color: 'var(--muted)', 
                fontSize: '14px' 
              }}>
                Enter the email address where you&apos;d like to receive a copy of the signed agreement.
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'var(--ink)'
                }}>
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid var(--hairline)`,
                    borderRadius: '2px',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '14px'
                  }}
                  placeholder="Enter recipient email"
                />
              </div>
              {emailError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--panel)',
                border: '1px solid var(--alert)',
                borderRadius: '2px',
                color: 'var(--alert)',
                  fontSize: '14px'
                }}>
                  {emailError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setEmailError(null);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--muted)',
                    border: `1px solid var(--hairline)`,
                    padding: '12px 24px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isEmailing}
                  style={{
                    backgroundColor: 'var(--coral)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '2px',
                    cursor: isEmailing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: isEmailing ? 0.7 : 1
                  }}
                >
                  {isEmailing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
