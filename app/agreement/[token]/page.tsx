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
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: textColor }}>Ready to Sign?</h3>
          <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: '16px' }}>
            Review the agreement above and click the button below to digitally sign.
          </p>
          <button
            onClick={handleSignAgreement}
            disabled={agreement.status === 'SIGNED' || isSigning}
            style={{
              backgroundColor: agreement.status === 'SIGNED' ? '#6b7280' : 
                             isSigning ? '#9ca3af' : '#059669',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              cursor: agreement.status === 'SIGNED' || isSigning ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (agreement.status !== 'SIGNED' && !isSigning) {
                e.currentTarget.style.backgroundColor = '#047857';
              }
            }}
            onMouseLeave={(e) => {
              if (agreement.status !== 'SIGNED' && !isSigning) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            title={agreement.status === 'SIGNED' ? 'Agreement already signed' : 'Sign this agreement digitally'}
          >
            {agreement.status === 'SIGNED' ? '✅ Signed' : 
             isSigning ? 'Signing...' : '✍️ Sign Agreement'}
          </button>
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
      </div>
    </div>
  );
}
