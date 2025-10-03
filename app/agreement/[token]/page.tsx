'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function ClientAgreementPage() {
  const params = useParams();
  const token = params.token as string;
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [signError, setSignError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailSentToast, setShowEmailSentToast] = useState(false);

  // Function to process smart fields in HTML content
  const processSmartFields = (html: string, client: any, agreementId: string) => {
    if (!html || !client) return html;
    
    let processedHtml = html;
    
    // Replace client fields
    processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
    processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
    processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
    processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
    processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString() : '');
    processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
    
    // Replace event fields
    processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
    processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
    processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
    processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
    processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
    
    // Replace agreement fields
    processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
    processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
    
    return processedHtml;
  };

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/client?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        // Process smart fields for the fetched agreement
        const processedAgreement = {
          ...data,
          template: {
            ...data.template,
            htmlContent: processSmartFields(
              data.template.htmlContent, 
              data.client, 
              data.id
            )
          }
        };
        setAgreement(processedAgreement);
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAgreement();
    }
  }, [token, fetchAgreement]);

  const handleDownloadPDF = useCallback(async () => {
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
        console.log('PDFKit endpoint failed, trying manual PDF...');
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
        console.log('Manual PDF endpoint failed, trying Puppeteer...');
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
        
        if (isTextFile) {
          alert('PDF generation is temporarily unavailable. A text version has been downloaded instead.');
        } else {
          alert('PDF downloaded successfully!');
        }
      } else {
        alert('Failed to download agreement. Please try again later.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading agreement. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  }, [agreement, token]);

  // Handle anchor links for PDF download
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#download' && agreement) {
        handleDownloadPDF();
      }
    };

    // Check on mount
    if (window.location.hash === '#download' && agreement) {
      handleDownloadPDF();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [agreement, handleDownloadPDF]);

  const handleSignAgreement = async () => {
    if (!agreement) return;
    
    setClientName(`${agreement.client.firstName} ${agreement.client.lastName}`);
    setClientEmail(agreement.client.email);
    setShowSignModal(true);
    setSignError(null);
  };

  const handleConfirmSign = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      setSignError('Please fill in all fields');
      return;
    }

    setIsSigning(true);
    setSignError(null);

    try {
      const response = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgreement(data.agreement);
        setShowSignModal(false);
        setClientName('');
        setClientEmail('');
        
        // Process smart fields after signing
        const processedAgreement = {
          ...data.agreement,
          template: {
            ...data.agreement.template,
            htmlContent: processSmartFields(
              data.agreement.template.htmlContent, 
              data.agreement.client, 
              data.agreement.id
            )
          }
        };
        setAgreement(processedAgreement);
      } else {
        const errorData = await response.json();
        setSignError(errorData.error || 'Failed to sign agreement');
      }
    } catch (err) {
      setSignError('Error signing agreement');
    } finally {
      setIsSigning(false);
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
          email: emailAddress.trim(),
        }),
      });

      if (response.ok) {
        setShowEmailModal(false);
        setEmailAddress('');
        
        // Show toast notification
        setShowEmailSentToast(true);
        setTimeout(() => setShowEmailSentToast(false), 3000);
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

  const htmlToPlainText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Loading agreement...</p>
        </div>
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
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontSize: '24px', marginBottom: '8px' }}>Error</h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '16px' }}>{error || 'Failed to load agreement'}</p>
        </div>
      </div>
    );
  }

  const isSigned = agreement.status === 'SIGNED';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          padding: '24px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
        }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: '700', 
            color: isDark ? '#f1f5f9' : '#1e293b' 
          }}>
            {agreement.template.title}
          </h1>
          <p style={{ 
            margin: '0', 
            color: isDark ? '#94a3b8' : '#64748b', 
            fontSize: '16px' 
          }}>
            Client: {agreement.client.firstName} {agreement.client.lastName}
          </p>
          {isSigned && (
            <div style={{ 
              marginTop: '16px',
              padding: '12px',
              backgroundColor: isDark ? '#065f46' : '#d1fae5',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#10b981' : '#34d399'}`
            }}>
              <p style={{ 
                margin: '0', 
                color: isDark ? '#6ee7b7' : '#065f46',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                ✅ This agreement has been digitally signed
              </p>
            </div>
          )}
        </div>

        {/* Agreement Content */}
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '32px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          marginBottom: '24px'
        }}>
          <div 
            style={{
              color: isDark ? '#f1f5f9' : '#1e293b',
              lineHeight: '1.6',
              fontSize: '14px'
            }}
            dangerouslySetInnerHTML={{ __html: agreement.template.htmlContent }}
          />
        </div>

        {/* Signature Details (if signed) */}
        {isSigned && (
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            marginBottom: '24px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              color: isDark ? '#f1f5f9' : '#1e293b' 
            }}>
              Digital Signature Details
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '12px', 
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>
                  SIGNED BY
                </p>
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: isDark ? '#f1f5f9' : '#1e293b' 
                }}>
                  {agreement.client.firstName} {agreement.client.lastName}
                </p>
              </div>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '12px', 
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>
                  EMAIL
                </p>
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: isDark ? '#f1f5f9' : '#1e293b' 
                }}>
                  {agreement.client.email}
                </p>
              </div>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '12px', 
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>
                  DATE & TIME SIGNED
                </p>
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: isDark ? '#f1f5f9' : '#1e293b' 
                }}>
                  {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '12px', 
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>
                  IP ADDRESS
                </p>
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: isDark ? '#f1f5f9' : '#1e293b' 
                }}>
                  {agreement.signedFromIP || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {isSigned ? (
            <>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isDownloading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: isEmailing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isEmailing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
              >
                {isEmailing ? '⏳' : '📧'} {isEmailing ? 'Sending...' : 'Email Copy'}
                {showEmailSentToast && (
                  <span style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    animation: 'fadeInOut 3s ease-in-out'
                  }}>
                    Sent!
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleSignAgreement}
              disabled={isSigning}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: isSigning ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isSigning ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSigning ? '⏳' : '✍️'} {isSigning ? 'Signing...' : 'Sign Agreement'}
            </button>
          )}
        </div>

        {/* Sign Modal */}
        {showSignModal && (
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
                Sign Agreement
              </h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontSize: '14px'
                  }}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontSize: '14px'
                  }}
                  placeholder="Enter your email address"
                />
              </div>
              
              {signError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '14px'
                }}>
                  {signError}
                </div>
              )}
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  onClick={() => {
                    setShowSignModal(false);
                    setClientName('');
                    setClientEmail('');
                    setSignError(null);
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
                  onClick={handleConfirmSign}
                  disabled={isSigning}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: isSigning ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: isSigning ? 0.7 : 1
                  }}
                >
                  {isSigning ? 'Signing...' : 'Sign Agreement'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                Email Agreement
              </h2>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  Email Address
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
                  placeholder="Enter email address"
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
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end' 
              }}>
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

        {/* Toast Animation */}
        <style jsx>{`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          }
        `}</style>
      </div>
    </div>
  );
}