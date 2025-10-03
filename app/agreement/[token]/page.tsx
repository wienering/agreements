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
        // Process smart fields for the updated agreement
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
        setShowSignModal(false);
        // Show success message
        alert('Agreement signed successfully!');
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

      // If Puppeteer fails, try the serverless fallback
      if (!response.ok) {
        console.log('Puppeteer endpoint failed, trying serverless fallback...');
        response = await fetch('/api/agreements/pdf-serverless', {
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
      // Try the main email endpoint first
      let response = await fetch('/api/agreements/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          recipientEmail: emailAddress.trim(),
        }),
      });

      // If the main email endpoint fails, try the fallback
      if (!response.ok) {
        console.log('Main email endpoint failed, trying fallback...');
        response = await fetch('/api/agreements/email-fallback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            recipientEmail: emailAddress.trim(),
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        setShowEmailModal(false);
        
        if (data.shareableLink) {
          // Show the shareable link
          const shareText = `Your agreement is ready!\n\nShareable Link: ${data.shareableLink}\n\nYou can copy this link and share it with others to access your signed agreement.`;
          alert(shareText);
          
          // Copy link to clipboard
          try {
            await navigator.clipboard.writeText(data.shareableLink);
            alert('Shareable link copied to clipboard!');
          } catch (clipboardErr) {
            console.log('Could not copy to clipboard:', clipboardErr);
          }
        } else {
          alert('Agreement sent successfully!');
        }
      } else {
        const errorData = await response.json();
        setEmailError(errorData.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      setEmailError('Error sending email. Please try again later.');
    } finally {
      setIsEmailing(false);
    }
  };

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: mainBg,
        color: textColor
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '16px' }}>Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: mainBg,
        color: textColor
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: textColor }}>Agreement Not Found</h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '24px' }}>
            {error || 'This agreement link is invalid or has expired.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg, 
      color: textColor,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: textColor, fontWeight: 'bold' }}>
                Photobooth Guys
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
                Service Agreement
              </p>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
          
          <div style={{ 
            padding: '16px', 
            backgroundColor: isDark ? '#0f172a' : '#f8fafc', 
            borderRadius: '6px',
            border: `1px solid ${borderColor}`
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: textColor }}>Agreement Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>Client</p>
                <p style={{ margin: 0, fontSize: '16px', color: textColor, fontWeight: '500' }}>
                  {agreement.client.firstName} {agreement.client.lastName}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>Email</p>
                <p style={{ margin: 0, fontSize: '16px', color: textColor, fontWeight: '500' }}>
                  {agreement.client.email}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>Status</p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  color: agreement.status === 'SIGNED' ? '#059669' : 
                        agreement.status === 'SENT' ? '#3b82f6' : '#6b7280',
                  fontWeight: '500'
                }}>
                  {agreement.status}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Content */}
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '32px', 
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: agreement.mergedHtml || agreement.template.htmlContent 
            }}
            style={{
              fontFamily: 'Georgia, serif',
              lineHeight: '1.6',
              fontSize: '16px',
              color: textColor
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ 
          backgroundColor: cardBg, 
          padding: '24px', 
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
       {agreement.status === 'SIGNED' ? (
         <>
           <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Agreement Signed!</h3>
           <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: '16px' }}>
             Your agreement has been digitally signed. You can download a PDF copy or email it to yourself.
           </p>
           <div style={{ 
             display: 'flex', 
             gap: '12px', 
             justifyContent: 'center',
             flexWrap: 'wrap',
             marginBottom: '24px'
           }}>
             <button
               onClick={handleDownloadPDF}
               disabled={isDownloading}
               style={{
                 backgroundColor: isDownloading ? '#9ca3af' : '#dc2626',
                 color: 'white',
                 border: 'none',
                 padding: '12px 24px',
                 borderRadius: '6px',
                 cursor: isDownloading ? 'not-allowed' : 'pointer',
                 fontSize: '16px',
                 fontWeight: '500',
                 transition: 'background-color 0.2s',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px'
               }}
               onMouseEnter={(e) => {
                 if (!isDownloading) {
                   e.currentTarget.style.backgroundColor = '#b91c1c';
                 }
               }}
               onMouseLeave={(e) => {
                 if (!isDownloading) {
                   e.currentTarget.style.backgroundColor = '#dc2626';
                 }
               }}
               title="Download PDF copy of the agreement"
             >
               {isDownloading ? '⏳' : '📄'} {isDownloading ? 'Downloading...' : 'Download PDF'}
             </button>
             <button
               onClick={handleEmailAgreement}
               disabled={isEmailing}
               style={{
                 backgroundColor: isEmailing ? '#9ca3af' : '#3b82f6',
                 color: 'white',
                 border: 'none',
                 padding: '12px 24px',
                 borderRadius: '6px',
                 cursor: isEmailing ? 'not-allowed' : 'pointer',
                 fontSize: '16px',
                 fontWeight: '500',
                 transition: 'background-color 0.2s',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px'
               }}
               onMouseEnter={(e) => {
                 if (!isEmailing) {
                   e.currentTarget.style.backgroundColor = '#2563eb';
                 }
               }}
               onMouseLeave={(e) => {
                 if (!isEmailing) {
                   e.currentTarget.style.backgroundColor = '#3b82f6';
                 }
               }}
               title="Email a copy of the agreement"
             >
               {isEmailing ? '⏳' : '📧'} {isEmailing ? 'Sending...' : 'Email Copy'}
             </button>
           </div>
           
           {/* Signing Details */}
           <div style={{
             backgroundColor: isDark ? '#1e293b' : '#f8fafc',
             border: `1px solid ${borderColor}`,
             borderRadius: '8px',
             padding: '20px',
             marginTop: '20px'
           }}>
             <h4 style={{ 
               margin: '0 0 16px 0', 
               fontSize: '16px', 
               color: textColor,
               fontWeight: '600',
               textAlign: 'center'
             }}>
               ✍️ Digital Signature Details
             </h4>
             <div style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
               gap: '16px',
               textAlign: 'center'
             }}>
               <div>
                 <div style={{ 
                   fontSize: '12px', 
                   color: '#94a3b8', 
                   marginBottom: '4px',
                   fontWeight: '500',
                   textTransform: 'uppercase',
                   letterSpacing: '0.5px'
                 }}>
                   Signed By
                 </div>
                 <div style={{ 
                   fontSize: '14px', 
                   color: textColor,
                   fontWeight: '600'
                 }}>
                   {agreement.client.firstName} {agreement.client.lastName}
                 </div>
               </div>
               <div>
                 <div style={{ 
                   fontSize: '12px', 
                   color: '#94a3b8', 
                   marginBottom: '4px',
                   fontWeight: '500',
                   textTransform: 'uppercase',
                   letterSpacing: '0.5px'
                 }}>
                   Email Address
                 </div>
                 <div style={{ 
                   fontSize: '14px', 
                   color: textColor,
                   fontWeight: '600'
                 }}>
                   {agreement.client.email}
                 </div>
               </div>
               <div>
                 <div style={{ 
                   fontSize: '12px', 
                   color: '#94a3b8', 
                   marginBottom: '4px',
                   fontWeight: '500',
                   textTransform: 'uppercase',
                   letterSpacing: '0.5px'
                 }}>
                   Date & Time
                 </div>
                 <div style={{ 
                   fontSize: '14px', 
                   color: textColor,
                   fontWeight: '600'
                 }}>
                   {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
                 </div>
               </div>
               <div>
                 <div style={{ 
                   fontSize: '12px', 
                   color: '#94a3b8', 
                   marginBottom: '4px',
                   fontWeight: '500',
                   textTransform: 'uppercase',
                   letterSpacing: '0.5px'
                 }}>
                   Agreement ID
                 </div>
                 <div style={{ 
                   fontSize: '14px', 
                   color: textColor,
                   fontWeight: '600',
                   fontFamily: 'monospace'
                 }}>
                   {agreement.id}
                 </div>
               </div>
             </div>
             <div style={{
               marginTop: '16px',
               padding: '12px',
               backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
               borderRadius: '6px',
               border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
             }}>
               <div style={{
                 fontSize: '12px',
                 color: '#94a3b8',
                 textAlign: 'center',
                 lineHeight: '1.4'
               }}>
                 This document has been digitally signed and is legally binding. 
                 The signature includes verification of identity through email confirmation.
               </div>
             </div>
           </div>
         </>
       ) : (
            <>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Ready to Sign?</h3>
              <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: '16px' }}>
                Review the agreement above and click the button below to digitally sign.
              </p>
              <button
                onClick={handleSignAgreement}
                disabled={isSigning}
                style={{
                  backgroundColor: isSigning ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  cursor: isSigning ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSigning) {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSigning) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                title="Sign this agreement digitally"
              >
                {isSigning ? 'Signing...' : '✍️ Sign Agreement'}
              </button>
            </>
          )}
        </div>

        {/* Signing Modal */}
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ 
                margin: '0 0 20px 0', 
                fontSize: '24px', 
                color: textColor, 
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Digital Signature
              </h2>
              
              <p style={{ 
                margin: '0 0 24px 0', 
                color: '#94a3b8', 
                fontSize: '16px',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Please confirm your information to digitally sign this agreement. 
                By signing, you agree to the terms and conditions outlined above.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your full name"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your email address"
                />
              </div>

              {signError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {signError}
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowSignModal(false)}
                  disabled={isSigning}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: isSigning ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSigning) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                      e.currentTarget.style.color = textColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSigning) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = mutedText;
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSign}
                  disabled={isSigning || !clientName.trim() || !clientEmail.trim()}
                  style={{
                    backgroundColor: isSigning || !clientName.trim() || !clientEmail.trim() ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: isSigning || !clientName.trim() || !clientEmail.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSigning && clientName.trim() && clientEmail.trim()) {
                      e.currentTarget.style.backgroundColor = '#047857';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSigning && clientName.trim() && clientEmail.trim()) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '8px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ 
                margin: '0 0 20px 0', 
                fontSize: '24px', 
                color: textColor, 
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Email Agreement Copy
              </h2>
              
              <p style={{ 
                margin: '0 0 24px 0', 
                color: '#94a3b8', 
                fontSize: '16px',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Enter the email address where you&apos;d like to receive a copy of your signed agreement.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: textColor,
                  fontSize: '14px'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    backgroundColor: cardBg,
                    color: textColor,
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter email address"
                />
              </div>

              {emailError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  {emailError}
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowEmailModal(false)}
                  disabled={isEmailing}
                  style={{
                    backgroundColor: 'transparent',
                    color: mutedText,
                    border: `1px solid ${borderColor}`,
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: isEmailing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isEmailing) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                      e.currentTarget.style.color = textColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isEmailing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = mutedText;
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isEmailing || !emailAddress.trim()}
                  style={{
                    backgroundColor: isEmailing || !emailAddress.trim() ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: isEmailing || !emailAddress.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isEmailing && emailAddress.trim()) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isEmailing && emailAddress.trim()) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  {isEmailing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
