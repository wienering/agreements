'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    packagePrice: string | null;
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
  customHtmlContent?: string | null;
  fields: Array<{
    key: string;
    value: string;
  }>;
}

export default function AdminPreviewPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Agreement Preview | Admin | Photobooth Guys';
  }, []);

  const params = useParams();
  const token = params.token as string;
  
  // Prevent double loading
  const hasFetchedData = useRef(false);
  
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailSentToast, setShowEmailSentToast] = useState(false);

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/admin-preview?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setAgreement(data);
        setLoading(false);
      } else if (response.status === 401) {
        setError('Authentication required. Please log in as admin.');
        setLoading(false);
      } else if (response.status === 403) {
        setError('Admin access required.');
        setLoading(false);
      } else if (response.status === 404) {
        setError('Agreement not found or has expired.');
        setLoading(false);
      } else {
        setError('Failed to load agreement.');
        setLoading(false);
      }
    } catch (err) {
      setError('Error loading agreement.');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Prevent double loading
    if (hasFetchedData.current) return;
    
    if (token) {
      hasFetchedData.current = true;
      fetchAgreement();
    }
  }, [token, fetchAgreement]);

  // Update document title when agreement is loaded
  useEffect(() => {
    if (agreement) {
      document.title = `Admin Preview - ${agreement.client.firstName} ${agreement.client.lastName}`;
    } else {
      document.title = 'Admin Preview - Loading...';
    }
  }, [agreement]);

  const handleDownloadPDF = useCallback(async () => {
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
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            color: isDark ? '#f1f5f9' : '#1e293b', 
            fontSize: '20px',
            margin: '0 0 8px 0',
            fontWeight: '600'
          }}>
            Loading Agreement Preview
          </h2>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b', 
            fontSize: '16px',
            margin: '0'
          }}>
            Please wait while we load the agreement...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          padding: '40px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: isDark ? '#dc2626' : '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '24px'
          }}>
            ⚠️
          </div>
          <h1 style={{ 
            color: isDark ? '#f1f5f9' : '#1e293b', 
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700'
          }}>
            {error.includes('Authentication') || error.includes('Admin access') ? 'Access Denied' : 'Agreement Not Found'}
          </h1>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b', 
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <div style={{
            padding: '16px',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b'
            }}>
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Admin Preview Banner */}
        <div style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px 0',
          textAlign: 'center',
          borderBottom: '3px solid #1d4ed8'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '18px' }}>👁️</span>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              ADMIN PREVIEW MODE - This is how the client will see the agreement
            </span>
          </div>
        </div>

        {/* Agreement Content */}
        {agreement && (
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px'
          }}>
            {/* Professional Header */}
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              padding: '20px 0',
              marginBottom: '32px'
            }}>
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700'
                  }}>
                    📸
                  </div>
                  <div>
                    <h1 style={{
                      margin: '0',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: isDark ? '#f1f5f9' : '#1e293b'
                    }}>
                      Photobooth Guys
                    </h1>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: isDark ? '#94a3b8' : '#64748b'
                    }}>
                      Service Agreement
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    minWidth: '200px'
                  }}>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '11px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      CLIENT
                    </p>
                    <p style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      color: isDark ? '#f1f5f9' : '#1e293b',
                      fontWeight: '700'
                    }}>
                      {agreement.client.firstName} {agreement.client.lastName}
                    </p>
                    {agreement.client.phone && (
                      <p style={{
                        margin: '0 0 4px 0',
                        fontSize: '12px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: '500'
                      }}>
                        📞 {agreement.client.phone}
                      </p>
                    )}
                    <p style={{
                      margin: '0',
                      fontSize: '12px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: '500'
                    }}>
                      ✉️ {agreement.client.email}
                    </p>
                  </div>
                  
                  {/* Event Information */}
                  {(agreement.client.eventDate || agreement.client.eventType || agreement.client.eventLocation) && (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      minWidth: '200px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '11px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        EVENT
                      </p>
                      {agreement.client.eventDate && (
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          color: isDark ? '#f1f5f9' : '#1e293b',
                          fontWeight: '600'
                        }}>
                          📅 {new Date(agreement.client.eventDate).toLocaleDateString('en-CA', { 
                            timeZone: 'America/Toronto',
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                      {agreement.client.eventType && (
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: '500'
                        }}>
                          🎉 {agreement.client.eventType}
                        </p>
                      )}
                      {agreement.client.eventLocation && (
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: '500'
                        }}>
                          📍 {agreement.client.eventLocation}
                        </p>
                      )}
                      {agreement.client.eventStartTime && (
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: '500'
                        }}>
                          ⏰ {agreement.client.eventStartTime}
                        </p>
                      )}
                      {agreement.client.eventDuration && (
                        <p style={{
                          margin: '0',
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontWeight: '500'
                        }}>
                          ⏱️ {agreement.client.eventDuration}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Package Information */}
                  {agreement.client.eventPackage && (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      minWidth: '150px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '11px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        PACKAGE
                      </p>
                      <p style={{
                        margin: '0',
                        fontSize: '14px',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        fontWeight: '600'
                      }}>
                        📦 {agreement.client.eventPackage}
                      </p>
                    </div>
                  )}
                  {agreement && agreement.status === 'SIGNED' && (
                    <div style={{
                      padding: '8px 16px',
                      backgroundColor: '#065f46',
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>✅</span>
                      <span style={{
                        color: '#6ee7b7',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        SIGNED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agreement Header */}
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              padding: '40px',
              borderRadius: '12px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              marginBottom: '32px',
              textAlign: 'center',
              boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h1 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '32px', 
                fontWeight: '800',
                color: isDark ? '#f1f5f9' : '#1e293b',
                lineHeight: '1.2'
              }}>
                {agreement.template.title}
              </h1>
              <p style={{ 
                margin: '0 0 24px 0', 
                color: isDark ? '#94a3b8' : '#64748b', 
                fontSize: '18px',
                lineHeight: '1.4'
              }}>
                Service Agreement for {agreement.client.firstName} {agreement.client.lastName}
              </p>
              
              {agreement && agreement.status === 'SIGNED' && (
                <div style={{ 
                  marginTop: '24px',
                  padding: '20px',
                  backgroundColor: '#065f46',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  display: 'inline-block'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span style={{ 
                      color: '#6ee7b7',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      Agreement Successfully Signed
                    </span>
                  </div>
                  <p style={{
                    margin: '0',
                    color: '#a7f3d0',
                    fontSize: '14px'
                  }}>
                    This agreement has been digitally signed and is legally binding.
                  </p>
                </div>
              )}
            </div>

            {/* Agreement Content */}
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              padding: '40px',
              borderRadius: '12px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              marginBottom: '32px',
              boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div 
                style={{
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  lineHeight: '1.7',
                  fontSize: '16px',
                  fontFamily: 'Georgia, serif'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: agreement.template.htmlContent
                }}
              />
            </div>

            {/* Signature Details (if signed) */}
            {agreement && agreement.status === 'SIGNED' && (
              <div style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                marginBottom: '32px',
                boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#065f46',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    ✍️
                  </div>
                  <h3 style={{ 
                    margin: '0', 
                    fontSize: '20px', 
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontWeight: '700'
                  }}>
                    Digital Signature Details
                  </h3>
                </div>
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

            {/* Action Buttons - Only Download and Email for Admin Preview */}
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '40px'
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
                  position: 'relative',
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
                {showEmailSentToast && (
                  <span style={{
                    position: 'absolute',
                    right: '-80px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    animation: 'fadeInOut 3s ease-in-out',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    Sent!
                  </span>
                )}
              </button>
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

            {/* Professional Footer */}
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              padding: '32px 0',
              marginTop: '60px'
            }}>
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}>
                    📸
                  </div>
                  <h3 style={{
                    margin: '0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b'
                  }}>
                    Photobooth Guys
                  </h3>
                </div>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  Professional photo booth services for your special events
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '24px',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                  color: isDark ? '#64748b' : '#94a3b8'
                }}>
                  <span>📧 info@photoboothguys.ca</span>
                  <span>📞 647-378-5332</span>
                  <span>🌐 Toronto, Ontario</span>
                </div>
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  fontSize: '12px',
                  color: isDark ? '#94a3b8' : '#64748b'
                }}>
                  <p style={{ margin: '0' }}>
                    This agreement was generated and signed using our secure digital platform. 
                    All signatures are legally binding and timestamped.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
