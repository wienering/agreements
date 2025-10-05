'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
  const [isDark, setIsDark] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgreement();
  }, [token]);

  const fetchAgreement = async () => {
    try {
      const response = await fetch(`/api/agreements/client?token=${token}`);
      
      if (response.ok) {
        const agreementData = await response.json();
        setAgreement(agreementData);
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
      } else {
        setError('Failed to load agreement.');
      }
    } catch (err) {
      setError('Error loading agreement.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    
    setIsDownloading(true);
    try {
      // Try PDFKit endpoint first (most reliable)
      let response = await fetch('/api/agreements/pdf-pdfkit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      // If PDFKit fails, try the manual PDF endpoint
      if (!response.ok) {
        response = await fetch('/api/agreements/pdf-js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
          }),
        });
      }

      // If manual PDF fails, try the original Puppeteer endpoint
      if (!response.ok) {
        response = await fetch('/api/agreements/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
          }),
        });
      }

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
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ 
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: '16px'
        }}>
          Loading your agreement...
        </p>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h1 style={{ 
            color: isDark ? '#f1f5f9' : '#1e293b', 
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700'
          }}>
            Agreement Not Found
          </h1>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b', 
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
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        
        @keyframes legalSealGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.6);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
            transform: scale(1);
          }
        }
        
        @keyframes embossEffect {
          0% {
            text-shadow: 0 1px 0 #ffffff, 0 -1px 0 #000000;
            transform: translateY(0);
          }
          50% {
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 -1px 0 #ffffff;
            transform: translateY(-1px);
          }
          100% {
            text-shadow: 0 1px 0 #ffffff, 0 -1px 0 #000000;
            transform: translateY(0);
          }
        }
        
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Success Header */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
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
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px auto',
              fontSize: '48px',
              color: 'white',
              animation: 'checkmarkPulse 1s ease-in-out',
              boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)'
            }}>
              ✓
            </div>
            
            <h1 style={{
              margin: '0 0 16px 0',
              fontSize: '48px',
              fontWeight: '800',
              color: isDark ? '#f1f5f9' : '#1e293b',
              animation: 'slideIn 0.8s ease-out'
            }}>
              Thank You!
            </h1>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '20px',
              color: isDark ? '#94a3b8' : '#64748b',
              lineHeight: '1.6'
            }}>
              Your agreement has been successfully signed and is now legally binding.
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              fontSize: '16px',
              color: isDark ? '#f1f5f9' : '#1e293b',
              fontWeight: '600'
            }}>
              <span>📧</span>
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
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            marginBottom: '32px',
            animation: 'fadeIn 0.8s ease-out 0.2s both'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: isDark ? '#f1f5f9' : '#1e293b'
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
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Client Information
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontWeight: '500'
                }}>
                  {agreement.client.firstName} {agreement.client.lastName}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  {agreement.client.email}
                </p>
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Event Details
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontWeight: '500'
                }}>
                  {agreement.client.eventType || 'Not specified'}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  {agreement.client.eventLocation || 'Location TBD'}
                </p>
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Package
                </h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontWeight: '500'
                }}>
                  {agreement.client.eventPackage || 'Standard Package'}
                </p>
                {agreement.client.packagePrice && (
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}>
                    ${agreement.client.packagePrice.toFixed(2)}
                  </p>
                )}
              </div>
              
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Signed On
                </h3>
                <p style={{
                  margin: '0',
                  fontSize: '16px',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontWeight: '500'
                }}>
                  {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { 
                    timeZone: 'America/Toronto',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '8px',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: isDownloading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {isDownloading ? '⏳' : '📄'} {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
            
            <button
              onClick={handleEmailAgreement}
              disabled={isEmailing}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '8px',
                cursor: isEmailing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: isEmailing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isEmailing) {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isEmailing) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {isEmailing ? '⏳' : '📧'} {isEmailing ? 'Sending...' : 'Email Copy'}
            </button>
          </div>

          {/* Next Steps */}
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            marginBottom: '32px',
            animation: 'fadeIn 1.2s ease-out 0.6s both'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: isDark ? '#f1f5f9' : '#1e293b'
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
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  📸 Choose Your Print Template
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b',
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
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Browse Templates →
                </a>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  📞 Contact Us
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: '1.5'
                }}>
                  Have questions about your event? Our team is here to help make your day perfect.
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '14px',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  <div>📧 info@photoboothguys.ca</div>
                  <div>📞 647-378-5332</div>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Legal Seal */}
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center',
            animation: 'fadeIn 1.4s ease-out 0.8s both'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 32px',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderRadius: '12px',
              border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              fontSize: '16px',
              color: isDark ? '#94a3b8' : '#64748b',
              position: 'relative',
              animation: 'legalSealGlow 2s ease-in-out infinite',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ 
                fontSize: '24px',
                animation: 'embossEffect 1.5s ease-in-out infinite'
              }}>⚖️</span>
              <span style={{ 
                fontWeight: '700',
                fontSize: '16px',
                letterSpacing: '0.5px',
                animation: 'embossEffect 1.5s ease-in-out infinite'
              }}>
                Legally Binding | Timestamped
              </span>
              <span style={{ 
                fontSize: '24px',
                animation: 'embossEffect 1.5s ease-in-out infinite'
              }}>🔒</span>
              
              {/* Animated border effect */}
              <div style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                right: '-2px',
                bottom: '-2px',
                borderRadius: '12px',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #3b82f6)',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite',
                zIndex: -1,
                opacity: 0.6
              }} />
            </div>
            
            <p style={{
              margin: '16px 0 0 0',
              fontSize: '12px',
              color: isDark ? '#64748b' : '#94a3b8',
              fontStyle: 'italic'
            }}>
              This agreement has been digitally signed and timestamped for legal compliance
            </p>
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
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              padding: '32px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              maxWidth: '400px',
              width: '90%'
            }}>
              <h2 style={{ 
                margin: '0 0 24px 0', 
                fontSize: '20px', 
                color: isDark ? '#f1f5f9' : '#1e293b' 
              }}>
                Email Agreement Copy
              </h2>
              <p style={{ 
                margin: '0 0 24px 0', 
                color: isDark ? '#94a3b8' : '#64748b', 
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
                  color: isDark ? '#f1f5f9' : '#1e293b'
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
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontSize: '14px'
                  }}
                  placeholder="Enter recipient email"
                />
              </div>
              {emailError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
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
                    color: isDark ? '#94a3b8' : '#64748b',
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    padding: '12px 24px',
                    borderRadius: '6px',
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
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
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
