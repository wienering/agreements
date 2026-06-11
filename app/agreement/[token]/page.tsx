'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { devLog } from '@/lib/logger';
import { UIcon } from '../../components/UIcon';
import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { sanitizeAgreementHtml } from '@/lib/sanitizeHtml';
import { formatDateToronto } from '@/lib/dates';

interface SignatureRecord {
  signerName: string;
  signerEmail: string;
  signedAt: string;
  method?: string;
}

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
  event?: {
    id: string;
    eventDate?: string;
    eventType?: string;
    eventLocation?: string;
    eventStartTime?: string;
    eventDuration?: string;
    eventPackage?: string;
    packagePrice?: number | string;
  } | null;
  fields: Array<{
    key: string;
    value: string;
  }>;
  // Second signer support
  secondSignerEnabled?: boolean;
  requireBothSignatures?: boolean;
  secondSigner?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  signatures?: SignatureRecord[];
}

interface VerifiedContact {
  role: 'primary' | 'secondary';
  firstName: string;
  lastName: string;
  email: string;
}

export default function ClientAgreementPage() {
  const params = useParams();
  const token = params.token as string;
  
  // Prevent double loading
  const hasFetchedData = useRef(false);
  
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [verifiedContact, setVerifiedContact] = useState<VerifiedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [isMobile, setIsMobile] = useState(false);
  
  // Signing animation states
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [signSuccessMessage, setSignSuccessMessage] = useState('');
  
  // Focus management
  const signButtonRef = useRef<HTMLButtonElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to process smart fields in HTML content
  // Note: The API already processes the HTML, but we keep this for any client-side processing needs
  const processSmartFields = (html: string, client: any, agreementId: string, event: any = null, agreement: any = null) => {
    if (!html || !client) return html;

    let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));
    const esc = (value: string) => escapeHtml(value);

    const address = event ? (event.eventLocation ?? '') : (client.address || '');
    const notes = event?.notes ?? client.notes;

    // Use event data from event relation if available, otherwise fall back to client fields
    const eventDate = event?.eventDate || client.eventDate;
    const eventType = event?.eventType || client.eventType || '';
    const eventLocation = event?.eventLocation || client.eventLocation || '';
    const eventStartTime = event?.eventStartTime || client.eventStartTime || '';
    const eventDuration = event?.eventDuration || client.eventDuration || '';
    const eventPackage = event?.eventPackage || client.eventPackage || '';
    const packagePrice = event?.packagePrice || client.packagePrice;

    processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, esc(eventDate ? formatDateToronto(eventDate) : ''));
    processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, esc(address));
    processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, esc(notes || ''));
    
    // Replace event fields - use event relation data if available
    processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, esc(eventType));
    processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, esc(eventLocation));
    processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, esc(eventStartTime));
    processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, esc(eventDuration));
    processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, esc(eventPackage));
    processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, esc(packagePrice ? `$${Number(packagePrice).toFixed(2)}` : ''));
    
    // Replace agreement fields
    processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, esc(formatDateToronto(new Date())));
    processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, esc(agreementId || ''));
    
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

        if (data.verifiedContact) {
          setVerifiedContact(data.verifiedContact);
        }

        // The API already processes the HTML with event data, so we can use it directly
        // Only reprocess if there are still placeholders (shouldn't happen, but just in case)
        const processedAgreement = {
          ...data.agreement,
          template: {
            ...data.agreement.template,
            htmlContent: processSmartFields(
              data.agreement.template.htmlContent,
              data.agreement.client,
              data.agreement.id,
              data.agreement.event,
              data.agreement
            )
          }
        };
        setAgreement(processedAgreement);

        // View tracking + "Agreement Viewed" email are now done server-side in verify-email (reliable)
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
      document.title = `${agreement.template.title} - ${agreement.client.firstName} ${agreement.client.lastName} | Photobooth Guys`;
    } else {
      document.title = 'Agreement - Loading...';
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
        a.download = `agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('PDF downloaded successfully!');
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

    // Prefill with the contact who actually verified their email,
    // falling back to the primary client.
    if (verifiedContact) {
      setClientName(`${verifiedContact.firstName || ''} ${verifiedContact.lastName || ''}`.trim());
      setClientEmail(verifiedContact.email);
    } else {
      setClientName(`${agreement.client.firstName} ${agreement.client.lastName}`);
      setClientEmail(agreement.client.email);
    }
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
        const signerEmail = clientEmail.trim();
        setAgreement(data.agreement);
        setShowSignModal(false);
        setClientName('');
        setClientEmail('');
        
        // Process smart fields after signing (use event data if available)
        const processedAgreement = {
          ...data.agreement,
          template: {
            ...data.agreement.template,
            htmlContent: processSmartFields(
              data.agreement.template.htmlContent,
              data.agreement.client,
              data.agreement.id,
              data.agreement.event,
              data.agreement
            )
          }
        };
        setAgreement(processedAgreement);

        if (data.isFinalSignature === false) {
          // Partial signature — agreement still LIVE; show a partial success message and stay on page
          setSignSuccessMessage('Signature recorded. Waiting for the other signer to complete the agreement.');
          setShowSignSuccess(true);
          setTimeout(() => {
            setShowSignSuccess(false);
          }, 3500);
        } else {
          // Show success animation
          setSignSuccessMessage('Agreement signed successfully. A copy has been emailed to you.');
          setShowSignSuccess(true);

          // Redirect to thank-you page after 3 seconds
          setTimeout(() => {
            setShowSignSuccess(false);
            try {
              sessionStorage.setItem(`agreement-signer-email-${token}`, signerEmail);
            } catch {
              // sessionStorage unavailable — thank-you page will prompt for email
            }
            window.location.href = `/agreement/${token}/thank-you`;
          }, 3000);
        }
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
    devLog('🔄 Showing loading screen - loading:', loading, 'showEmailVerification:', showEmailVerification);
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
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            color: 'var(--ink)', 
            fontSize: '20px',
            margin: '0 0 8px 0',
            fontWeight: '600'
          }}>
            Loading Agreement
          </h2>
          <p style={{ 
            color: 'var(--muted)', 
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
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'var(--font-ui), system-ui, sans-serif',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: 'var(--panel)',
          padding: '40px',
          borderRadius: '12px',
          border: `1px solid var(--hairline)`,
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--panel)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '24px'
          }}>
            <UIcon name="circle-exclamation" style={{ fontSize: '28px', color: 'var(--alert)' }} title="Warning" />
          </div>
          <h1 style={{ 
            color: 'var(--ink)', 
            fontSize: '24px',
            margin: '0 0 16px 0',
            fontWeight: '700'
          }}>
            Agreement Not Found
          </h1>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '16px',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            {error || 'Failed to load agreement'}
          </p>
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--paper)',
            borderRadius: '8px',
            border: `1px solid var(--hairline)`
          }}>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: 'var(--muted)'
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
        
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--paper)',
        fontFamily: 'var(--font-ui), system-ui, sans-serif'
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
            backgroundColor: 'var(--panel)',
            padding: '40px',
            borderRadius: '16px',
            border: `1px solid var(--hairline)`,
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
              backgroundColor: 'var(--success)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '32px',
              color: 'white',
              animation: 'checkmarkPulse 0.6s ease-in-out',
              boxShadow: '0 0 0 0 rgba(63, 111, 79, 0.7)',
              animationFillMode: 'forwards'
            }}>
              <UIcon name="check" style={{ fontSize: '32px', color: 'white' }} title="Success" />
            </div>
            
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--ink)',
              fontFamily: 'var(--font-display), Georgia, serif'
            }}>
              Success!
            </h2>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: 'var(--muted)',
              lineHeight: '1.5'
            }}>
              {signSuccessMessage}
            </p>
            
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--paper)',
              borderRadius: '8px',
              border: `1px solid var(--hairline)`,
              fontSize: '14px',
              color: 'var(--muted)'
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
            backgroundColor: 'var(--panel)',
            padding: '40px',
            borderRadius: '12px',
            border: `1px solid var(--hairline)`,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'var(--coral)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                <UIcon name="lock" style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '700',
                color: 'var(--ink)',
                fontFamily: 'var(--font-display), Georgia, serif'
              }}>
                Email Verification Required
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '16px', 
                color: 'var(--muted)',
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
                color: 'var(--ink)'
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
                  border: '2px solid var(--hairline)',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: 'var(--ink)',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder="Enter your email address"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--coral)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--hairline)';
                }}
              />
            </div>
            
            {verificationError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--alert)',
                borderRadius: '8px',
                color: 'var(--alert)',
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
                  color: 'var(--muted)',
                  border: `1px solid var(--hairline)`,
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
                  backgroundColor: isVerifying || !verificationEmail.trim() ? 'var(--hairline)' : 'var(--coral)',
                  color: isVerifying || !verificationEmail.trim() ? 'var(--muted)' : 'white',
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
          backgroundColor: 'var(--panel)',
          borderBottom: `1px solid var(--hairline)`,
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
                backgroundColor: 'var(--coral)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: '700'
              }}>
                <UIcon name="camera" style={{ fontSize: '18px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{
                  margin: '0',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--ink)'
                }}>
                  Photobooth Guys
                </h1>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: 'var(--muted)'
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
            backgroundColor: 'var(--panel)',
            borderBottom: `1px solid var(--hairline)`,
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
              backgroundColor: 'var(--coral)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700'
            }}>
              <UIcon name="camera" style={{ fontSize: '18px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{
                margin: '0',
                fontSize: '20px',
                fontWeight: '700',
                color: 'var(--ink)'
              }}>
                Photobooth Guys
              </h1>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: 'var(--muted)'
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
              backgroundColor: 'var(--paper)',
              borderRadius: '8px',
              border: `1px solid var(--hairline)`,
              minWidth: '200px'
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                color: 'var(--muted)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                CLIENT
              </p>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                color: 'var(--ink)',
                fontWeight: '700'
              }}>
                {agreement.client.firstName} {agreement.client.lastName}
              </p>
              {agreement.client.phone && (
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '12px',
                  color: 'var(--muted)',
                  fontWeight: '500'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UIcon name="phone-call" style={{ fontSize: '12px' }} />
                    {agreement.client.phone}
                  </span>
                </p>
              )}
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: 'var(--muted)',
                fontWeight: '500'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <UIcon name="envelope" style={{ fontSize: '12px' }} />
                  {agreement.client.email}
                </span>
              </p>
            </div>
            
            {/* Event Information */}
            {((agreement.event?.eventDate ?? agreement.client.eventDate) || (agreement.event?.eventType ?? agreement.client.eventType) || (agreement.event?.eventLocation ?? agreement.client.eventLocation)) && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--paper)',
                borderRadius: '8px',
                border: `1px solid var(--hairline)`,
                minWidth: '200px'
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  EVENT
                </p>
                {(agreement.event?.eventDate ?? agreement.client.eventDate) && (
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    fontWeight: '600'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UIcon name="calendar" style={{ fontSize: '14px' }} />
                      {new Date(agreement.event?.eventDate ?? agreement.client.eventDate!).toLocaleDateString('en-CA', { 
                      timeZone: 'America/Toronto',
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                    </span>
                  </p>
                )}
                {(agreement.event?.eventType ?? agreement.client.eventType) && (
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '500'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UIcon name="star" style={{ fontSize: '12px' }} />
                      {agreement.event?.eventType ?? agreement.client.eventType}
                    </span>
                  </p>
                )}
                {(agreement.event?.eventLocation ?? agreement.client.eventLocation) && (
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '500'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UIcon name="marker" style={{ fontSize: '12px' }} />
                      {agreement.event?.eventLocation ?? agreement.client.eventLocation}
                    </span>
                  </p>
                )}
                {(agreement.event?.eventStartTime ?? agreement.client.eventStartTime) && (
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '500'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UIcon name="clock" style={{ fontSize: '12px' }} />
                      {agreement.event?.eventStartTime ?? agreement.client.eventStartTime}
                    </span>
                  </p>
                )}
                {(agreement.event?.eventDuration ?? agreement.client.eventDuration) && (
                  <p style={{
                    margin: '0',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '500'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <UIcon name="hourglass" style={{ fontSize: '12px' }} />
                      {agreement.event?.eventDuration ?? agreement.client.eventDuration}
                    </span>
                  </p>
                )}
              </div>
            )}
            
            {/* Package Information */}
            {(agreement.event?.eventPackage ?? agreement.client.eventPackage) && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--paper)',
                borderRadius: '8px',
                border: `1px solid var(--hairline)`,
                minWidth: '150px'
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  PACKAGE
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  fontWeight: '600'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UIcon name="box" style={{ fontSize: '14px' }} />
                    {agreement.event?.eventPackage ?? agreement.client.eventPackage}
                  </span>
                </p>
              </div>
            )}
            {agreement && agreement.status === 'SIGNED' && (
              <div style={{
                padding: '8px 16px',
                backgroundColor: 'var(--panel)',
                borderRadius: '6px',
                border: '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <UIcon name="check" style={{ fontSize: '16px', color: 'var(--success)' }} />
                <span style={{
                  color: 'var(--success)',
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
          backgroundColor: 'var(--panel)',
          padding: '40px',
          borderRadius: '12px',
          border: `1px solid var(--hairline)`,
          marginBottom: '32px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h1 style={{ 
            margin: '0', 
            fontSize: '32px', 
            fontWeight: '800',
            color: 'var(--ink)',
            lineHeight: '1.2',
            fontFamily: 'var(--font-display), Georgia, serif'
          }}>
            {agreement.template.title}
          </h1>
          <div style={{ height: '2px', width: '4rem', backgroundColor: 'var(--coral)', margin: '12px auto 16px' }} aria-hidden="true" />
          <p style={{ 
            margin: '0 0 24px 0', 
            color: 'var(--muted)', 
            fontSize: '18px',
            lineHeight: '1.4'
          }}>
            Service Agreement for {agreement.client.firstName} {agreement.client.lastName}
          </p>
          
          {agreement && agreement.status === 'SIGNED' && (
            <div style={{ 
              marginTop: '24px',
              padding: '20px',
              backgroundColor: 'var(--panel)',
              borderRadius: '8px',
              border: '1px solid var(--hairline)',
              display: 'inline-block'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <UIcon name="check" style={{ fontSize: '20px', color: 'var(--success)' }} />
                <span style={{ 
                  color: 'var(--success)',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Agreement Successfully Signed
                </span>
              </div>
              <p style={{
                margin: '0',
                color: 'var(--muted)',
                fontSize: '14px'
              }}>
                This agreement has been digitally signed and is legally binding.
              </p>
            </div>
          )}

          {/* Partial signed state — both signatures required, only first signed */}
          {agreement &&
            agreement.status !== 'SIGNED' &&
            agreement.requireBothSignatures &&
            (agreement.signatures?.length ?? 0) > 0 && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid var(--warn)',
                display: 'inline-block',
                textAlign: 'left',
                maxWidth: '640px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <UIcon name="hourglass" style={{ fontSize: '20px', color: 'var(--warn)' }} />
                  <span style={{
                    color: 'var(--warn)',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Waiting on the other signer
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', color: 'var(--muted)', fontSize: '14px' }}>
                  {agreement.signatures && agreement.signatures.length > 0 ? (
                    <>
                      Signed by <strong>{agreement.signatures[0].signerName}</strong>{' '}
                      ({agreement.signatures[0].signerEmail}).
                    </>
                  ) : null}{' '}
                  Both signatures are required for this agreement to become binding.
                </p>
                {agreement.secondSigner && agreement.signatures && (() => {
                  const signedEmails = agreement.signatures.map(s => (s.signerEmail || '').toLowerCase());
                  const primaryEmailLower = (agreement.client.email || '').toLowerCase();
                  const secondaryEmailLower = (agreement.secondSigner.email || '').toLowerCase();
                  const otherSigner = signedEmails.includes(primaryEmailLower)
                    ? `${agreement.secondSigner.firstName || ''} ${agreement.secondSigner.lastName || ''}`.trim() || agreement.secondSigner.email
                    : `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim() || agreement.client.email;
                  const otherEmail = signedEmails.includes(primaryEmailLower) ? secondaryEmailLower : primaryEmailLower;
                  return (
                    <p style={{ margin: '0', color: 'var(--muted)', fontSize: '13px' }}>
                      Awaiting signature from <strong>{otherSigner}</strong> ({otherEmail}).
                    </p>
                  );
                })()}
              </div>
            )}
        </div>

        {/* Agreement Content */}
        <div style={{
          backgroundColor: 'var(--panel)',
          padding: '24px',
          borderRadius: '12px',
          border: `1px solid var(--hairline)`,
          marginBottom: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div 
            style={{
              backgroundColor: '#fff',
              padding: '32px',
              borderRadius: '8px',
              border: '1px solid var(--hairline)',
              color: 'var(--ink)',
              lineHeight: '1.7',
              fontSize: '16px',
              fontFamily: 'Georgia, serif'
            }}
            dangerouslySetInnerHTML={{ 
              __html: sanitizeAgreementHtml(
                agreement.status === 'SIGNED' && agreement.mergedHtml 
                  ? agreement.mergedHtml 
                  : (agreement.customHtmlContent || agreement.template.htmlContent)
              )
            }}
          />
        </div>

        {/* Signature Details (if signed OR partially signed) */}
        {agreement && (agreement.status === 'SIGNED' || (agreement.signatures?.length ?? 0) > 0) && (
          <div style={{
            backgroundColor: 'var(--panel)',
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid var(--hairline)`,
            marginBottom: '32px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
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
                backgroundColor: 'var(--panel)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                <UIcon name="signature" style={{ fontSize: '18px', color: 'var(--muted)' }} />
              </div>
              <h3 style={{ 
                margin: '0', 
                fontSize: '20px', 
                color: 'var(--ink)',
                fontWeight: '700'
              }}>
                Digital Signature Details
              </h3>
            </div>

            {(() => {
              // Build a list of signature rows. Prefer rows from agreement.signatures
              // (now multi-signer aware); fall back to the legacy single-signer fields.
              const rows: Array<{
                signerName: string;
                signerEmail: string;
                signedAt: string | null;
                ip?: string | null;
              }> = (agreement.signatures && agreement.signatures.length > 0)
                ? agreement.signatures.map((s) => ({
                    signerName: s.signerName,
                    signerEmail: s.signerEmail,
                    signedAt: s.signedAt,
                    ip: null,
                  }))
                : [{
                    signerName: `${agreement.client.firstName} ${agreement.client.lastName}`.trim(),
                    signerEmail: agreement.client.email,
                    signedAt: agreement.signedAt,
                    ip: agreement.signedFromIP,
                  }];

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {rows.map((row, idx) => (
                    <div
                      key={`${row.signerEmail}-${idx}`}
                      style={{
                        padding: '16px',
                        borderLeft: '3px solid var(--success)',
                        backgroundColor: 'var(--paper)',
                        borderRadius: '6px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                          SIGNED BY
                        </p>
                        <p style={{ margin: '0', fontSize: '14px', color: 'var(--ink)' }}>
                          {row.signerName}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                          EMAIL
                        </p>
                        <p style={{ margin: '0', fontSize: '14px', color: 'var(--ink)' }}>
                          {row.signerEmail}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                          DATE & TIME SIGNED
                        </p>
                        <p style={{ margin: '0', fontSize: '14px', color: 'var(--ink)' }}>
                          {row.signedAt ? new Date(row.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
                        </p>
                      </div>
                      {row.ip && (
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                            IP ADDRESS
                          </p>
                          <p style={{ margin: '0', fontSize: '14px', color: 'var(--ink)' }}>
                            {row.ip}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '12px' : '20px', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: isMobile ? '24px' : '40px',
          padding: isMobile ? '0 16px' : '0'
        }}>
          {agreement && agreement.status === 'SIGNED' ? (
            <>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                style={{
                  backgroundColor: isDownloading ? 'var(--hairline)' : 'var(--coral)',
                  color: isDownloading ? 'var(--muted)' : 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: 'none',
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
                  borderRadius: '8px',
                  cursor: isEmailing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative',
                  boxShadow: 'none',
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
                {showEmailSentToast && (
                  <span style={{
                    position: 'absolute',
                    right: '-80px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'var(--coral)',
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
              
              <a
                href="/portal/login"
                style={{
                  backgroundColor: 'var(--coral)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  minWidth: '180px',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <UIcon name="door-open" style={{ fontSize: '18px' }} />
                Client Portal
              </a>
            </>
          ) : (
            <>
              <button
                ref={signButtonRef}
                onClick={handleSignAgreement}
                disabled={
                  isSigning ||
                  // If verified contact has already signed, prevent re-signing
                  Boolean(
                    verifiedContact &&
                      agreement.signatures &&
                      agreement.signatures.some(
                        (s) => s.signerEmail.toLowerCase() === verifiedContact.email.toLowerCase(),
                      ),
                  )
                }
                style={{
                  backgroundColor: (isSigning || Boolean(
                    verifiedContact &&
                      agreement.signatures &&
                      agreement.signatures.some(
                        (s) => s.signerEmail.toLowerCase() === verifiedContact.email.toLowerCase(),
                      ),
                  )) ? 'var(--hairline)' : 'var(--coral)',
                  color: (isSigning || Boolean(
                    verifiedContact &&
                      agreement.signatures &&
                      agreement.signatures.some(
                        (s) => s.signerEmail.toLowerCase() === verifiedContact.email.toLowerCase(),
                      ),
                  )) ? 'var(--muted)' : 'white',
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
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  minWidth: '220px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => { if (!isSigning && !e.currentTarget.disabled) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={(e) => { if (!isSigning && !e.currentTarget.disabled) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {isSigning ? (
                  <UIcon name="spinner" className="animate-spin" style={{ fontSize: '18px' }} />
                ) : (
                  <UIcon name="signature" style={{ fontSize: '18px' }} />
                )}{' '}
                {(() => {
                  if (isSigning) return 'Signing...';
                  const alreadySigned = Boolean(
                    verifiedContact &&
                      agreement.signatures &&
                      agreement.signatures.some(
                        (s) => s.signerEmail.toLowerCase() === verifiedContact.email.toLowerCase(),
                      ),
                  );
                  if (alreadySigned) return "You've signed — waiting on the other party";
                  return 'Sign Agreement';
                })()}
              </button>
              
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                style={{
                  backgroundColor: isDownloading ? 'var(--hairline)' : 'transparent',
                  color: isDownloading ? 'var(--muted)' : 'var(--ink)',
                  border: '1px solid var(--hairline)',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  minWidth: '220px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isDownloading) {
                    e.currentTarget.style.backgroundColor = 'var(--panel)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDownloading) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {isDownloading ? (
                  <UIcon name="spinner" className="animate-spin" style={{ fontSize: '18px' }} />
                ) : (
                  <UIcon name="file-pdf" style={{ fontSize: '18px' }} />
                )}{' '}
                {isDownloading ? 'Downloading...' : 'Download PDF (Unsigned)'}
              </button>
            </>
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
              backgroundColor: 'var(--panel)',
              padding: '32px',
              borderRadius: '8px',
              border: `1px solid var(--hairline)`,
              maxWidth: '400px',
              width: '90%'
            }}>
              <h2 style={{ 
                margin: '0 0 24px 0', 
                fontSize: '20px', 
                color: 'var(--ink)',
                fontFamily: 'var(--font-display), Georgia, serif'
              }}>
                Sign Agreement
              </h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'var(--ink)'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'var(--paper)';
                    e.target.style.borderColor = 'var(--coral)';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.borderColor = 'var(--hairline)';
                    e.target.style.transform = 'scale(1)';
                  }}
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px' : '12px',
                    border: `1px solid var(--hairline)`,
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    color: 'var(--ink)',
                    fontSize: isMobile ? '16px' : '14px',
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
                  color: 'var(--ink)'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'var(--paper)';
                    e.target.style.borderColor = 'var(--coral)';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.borderColor = 'var(--hairline)';
                    e.target.style.transform = 'scale(1)';
                  }}
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px' : '12px',
                    border: `1px solid var(--hairline)`,
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    color: 'var(--ink)',
                    fontSize: isMobile ? '16px' : '14px',
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
                  backgroundColor: 'var(--panel)',
                border: '1px solid var(--alert)',
                borderRadius: '8px',
                color: 'var(--alert)',
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
                  color: 'var(--ink)'
                }}>
                  <input
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      accentColor: 'var(--coral)',
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
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
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
                    color: 'var(--muted)',
                    border: `1px solid var(--hairline)`,
                    padding: isMobile ? '12px 20px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flex: isMobile ? '1 1 100%' : '0 0 auto'
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
                      backgroundColor: isSigning || !hasAgreedToTerms ? 'var(--hairline)' : 'var(--coral)',
                      color: isSigning || !hasAgreedToTerms ? 'var(--muted)' : 'white',
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
              backgroundColor: 'var(--panel)',
              padding: isMobile ? '20px' : '32px',
              borderRadius: '8px',
              border: `1px solid var(--hairline)`,
              maxWidth: '400px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ 
                margin: '0 0 24px 0', 
                fontSize: isMobile ? '18px' : '20px', 
                color: 'var(--ink)',
                fontFamily: 'var(--font-display), Georgia, serif'
              }}>
                Email Agreement
              </h2>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'var(--ink)'
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
                    border: `1px solid var(--hairline)`,
                    borderRadius: '6px',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '14px'
                  }}
                  placeholder="Enter email address"
                />
              </div>
              
              {emailError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--panel)',
                border: '1px solid var(--alert)',
                borderRadius: '8px',
                color: 'var(--alert)',
                  fontSize: '14px'
                }}>
                  {emailError}
                </div>
              )}
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
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
                    padding: isMobile ? '12px 20px' : '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flex: isMobile ? '1 1 100%' : '0 0 auto'
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
          backgroundColor: 'var(--panel)',
          borderTop: `1px solid var(--hairline)`,
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
                backgroundColor: 'var(--coral)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                <UIcon name="camera" style={{ fontSize: '14px', color: 'white' }} />
              </div>
              <h3 style={{
                margin: '0',
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--ink)'
              }}>
                Photobooth Guys
              </h3>
            </div>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: 'var(--muted)'
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
              color: 'var(--muted)'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <UIcon name="envelope" style={{ fontSize: '12px' }} />
                info@photoboothguys.ca
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <UIcon name="phone-call" style={{ fontSize: '12px' }} />
                647-378-5332
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <UIcon name="globe" style={{ fontSize: '12px' }} />
                Toronto, Ontario
              </span>
            </div>
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'var(--paper)',
              borderRadius: '6px',
              border: `1px solid var(--hairline)`,
              fontSize: '12px',
              color: 'var(--muted)'
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