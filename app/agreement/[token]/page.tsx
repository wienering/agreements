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
  
  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  
  // Signing animation states
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [signSuccessMessage, setSignSuccessMessage] = useState('');
  
  // Focus management
  const signButtonRef = useRef<HTMLButtonElement>(null);

  // Function to track agreement view
  const trackAgreementView = async () => {
    try {
      console.log('🔍 Client: Calling track-view API with token:', token);
      const response = await fetch('/api/agreements/track-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      console.log('🔍 Client: Track-view API response:', data);
      
      if (!response.ok) {
        console.error('❌ Client: Track-view API failed:', data);
      }
    } catch (error) {
      console.error('❌ Client: Error tracking agreement view:', error);
    }
  };

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
    processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, client.packagePrice ? `$${client.packagePrice}` : '');
    
    // Replace agreement fields
    processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
    processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
    
    return processedHtml;
  };

  // Email verification function
  const handleEmailVerification = async () => {
    if (!verificationEmail.trim()) {
      setVerificationError('Please enter your email address');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch('/api/agreements/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          email: verificationEmail.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Email verified successfully - NOW we can safely load agreement data
        setIsEmailVerified(true);
        setShowEmailVerification(false);
        
        // Process smart fields for the verified agreement
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
        
        // Track the agreement view
        console.log('🔍 Client: About to call trackAgreementView()');
        trackAgreementView();
      } else {
        setVerificationError(data.error || 'Email verification failed');
      }
    } catch (error) {
      setVerificationError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/client?token=${token}`);
      
      if (response.ok) {
        // DO NOT store agreement data - only check if it exists
        setLoading(false);
        setShowEmailVerification(true);
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
    if (token) {
      fetchAgreement();
    }
  }, [token, fetchAgreement]);

  // Update document title when agreement is loaded
  useEffect(() => {
    if (agreement) {
      document.title = `Agreement - ${agreement.client.firstName} ${agreement.client.lastName}`;
    } else {
      document.title = 'Agreement - Loading...';
    }
  }, [agreement]);

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
    
    // Auto-focus the first input after modal opens
    setTimeout(() => {
      const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
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
        
        // Show success animation
        setSignSuccessMessage('Agreement signed successfully. A copy has been emailed to you.');
        setShowSignSuccess(true);
        
        // Redirect to thank-you page after 3 seconds
        setTimeout(() => {
          setShowSignSuccess(false);
          // Navigate to thank-you page with agreement data
          window.location.href = `/agreement/${token}/thank-you`;
        }, 3000);
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

  const htmlToPlainText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  if (loading && !showEmailVerification) {
    console.log('🔄 Showing loading screen - loading:', loading, 'showEmailVerification:', showEmailVerification);
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
            Loading Agreement
          </h2>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b', 
            fontSize: '16px',
            margin: '0'
          }}>
            Please wait while we load your agreement...
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
            Agreement Not Found
          </h1>
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b', 
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            {error || 'Failed to load agreement'}
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
              Please contact us at <strong>info@photoboothguys.ca</strong> if you believe this is an error.
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
      {/* Success Animation */}
      {showSignSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '40px',
            borderRadius: '16px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideIn 0.4s ease-out'
          }}>
            {/* Animated Checkmark */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '32px',
              color: 'white',
              animation: 'checkmarkPulse 0.6s ease-in-out',
              boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)',
              animationFillMode: 'forwards'
            }}>
              ✓
            </div>
            
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: isDark ? '#f1f5f9' : '#1e293b'
            }}>
              Success!
            </h2>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: isDark ? '#94a3b8' : '#64748b',
              lineHeight: '1.5'
            }}>
              {signSuccessMessage}
            </p>
            
            <div style={{
              padding: '16px',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              fontSize: '14px',
              color: isDark ? '#94a3b8' : '#64748b'
            }}>
              <p style={{ margin: '0' }}>
                Your agreement is now legally binding and has been securely stored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '40px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                🔐
              </div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b' 
              }}>
                Email Verification Required
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '16px', 
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: '1.5'
              }}>
                Please enter the email address associated with this agreement to continue.
              </p>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isVerifying && verificationEmail.trim()) {
                    handleEmailVerification();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder="Enter your email address"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? '#334155' : '#d1d5db';
                }}
              />
            </div>
            
            {verificationError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {verificationError}
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setVerificationEmail('');
                  setVerificationError(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailVerification}
                disabled={isVerifying || !verificationEmail.trim()}
                style={{
                  backgroundColor: isVerifying || !verificationEmail.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: isVerifying || !verificationEmail.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: isVerifying ? 0.7 : 1
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Show simple header when email verification is required */}
      {!isEmailVerified && (
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
          </div>
        </div>
      )}

      {/* Only show agreement content if email is verified */}
      {isEmailVerified && agreement && (
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

      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                fontSize: '24px'
              }}>
                🔒
              </div>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Email Verification Required
              </h2>
              <p style={{
                margin: '0',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                Please enter the email address associated with this agreement to continue.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? '#334155' : '#e2e8f0';
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleEmailVerification();
                  }
                }}
              />
              {verificationError && (
                <p style={{
                  margin: '8px 0 0 0',
                  color: '#dc2626',
                  fontSize: '14px'
                }}>
                  {verificationError}
                </p>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleEmailVerification}
                disabled={isVerifying}
                style={{
                  backgroundColor: isVerifying ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  if (!isVerifying) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isVerifying) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
            }}>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: isDark ? '#94a3b8' : '#64748b',
                textAlign: 'center'
              }}>
                🔐 This verification ensures only authorized parties can access the agreement.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            padding: '40px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative',
            zIndex: 1000000
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                🔐
              </div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b' 
              }}>
                Email Verification Required
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '16px', 
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: '1.5'
              }}>
                Please enter the email address associated with this agreement to continue.
              </p>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: isDark ? '#f1f5f9' : '#1e293b'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isVerifying && verificationEmail.trim()) {
                    handleEmailVerification();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder="Enter your email address"
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? '#334155' : '#d1d5db';
                }}
              />
            </div>
            
            {verificationError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {verificationError}
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setVerificationEmail('');
                  setVerificationError(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailVerification}
                disabled={isVerifying || !verificationEmail.trim()}
                style={{
                  backgroundColor: isVerifying || !verificationEmail.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: isVerifying || !verificationEmail.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: isVerifying ? 0.7 : 1
                }}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            dangerouslySetInnerHTML={{ __html: agreement.template.htmlContent }}
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

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '40px'
        }}>
          {agreement && agreement.status === 'SIGNED' ? (
            <>
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
            </>
          ) : (
            <button
              ref={signButtonRef}
              onClick={handleSignAgreement}
              disabled={isSigning}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '20px 40px',
                borderRadius: '8px',
                cursor: isSigning ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: '700',
                opacity: isSigning ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 6px 12px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.2s ease',
                minWidth: '220px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!isSigning) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(220, 38, 38, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSigning) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(220, 38, 38, 0.3)';
                }
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
                  onFocus={(e) => {
                    e.target.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc';
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                    e.target.style.borderColor = isDark ? '#334155' : '#d1d5db';
                    e.target.style.transform = 'scale(1)';
                  }}
                  style={{
                    width: '100%',
                    padding: window.innerWidth < 768 ? '16px' : '12px',
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontSize: window.innerWidth < 768 ? '16px' : '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
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
                  onFocus={(e) => {
                    e.target.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc';
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = isDark ? '#0f172a' : '#ffffff';
                    e.target.style.borderColor = isDark ? '#334155' : '#d1d5db';
                    e.target.style.transform = 'scale(1)';
                  }}
                  style={{
                    width: '100%',
                    padding: window.innerWidth < 768 ? '16px' : '12px',
                    border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    fontSize: window.innerWidth < 768 ? '16px' : '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
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
              
              {/* Terms Agreement Checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}>
                  <input
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      accentColor: '#dc2626',
                      cursor: 'pointer'
                    }}
                  />
                  <span>
                    I have read and agree to the terms of the agreement. By signing, I acknowledge that I have reviewed the complete agreement and consent to its terms and conditions.
                  </span>
                </label>
              </div>
              
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
        setHasAgreedToTerms(false);
        
        // Return focus to sign button
        setTimeout(() => {
          if (signButtonRef.current) {
            signButtonRef.current.focus();
          }
        }, 100);
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
                <div 
                  title={!hasAgreedToTerms && !isSigning ? "Please accept the terms and conditions to sign the agreement" : ""}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={handleConfirmSign}
                    disabled={isSigning || !hasAgreedToTerms}
                    style={{
                      backgroundColor: isSigning || !hasAgreedToTerms ? '#9ca3af' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: isSigning || !hasAgreedToTerms ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isSigning ? 0.7 : 1,
                      position: 'relative'
                    }}
                  >
                    {isSigning ? 'Signing...' : 'Sign Agreement'}
                  </button>
                </div>
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