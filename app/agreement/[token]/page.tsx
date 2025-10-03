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

  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(`/api/agreements/client?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setAgreement(data);
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

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

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
            style={{
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#047857';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            title="Sign this agreement digitally"
          >
            ✍️ Sign Agreement
          </button>
        </div>
      </div>
    </div>
  );
}
