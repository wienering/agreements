'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalClients: number;
  totalTemplates: number;
  totalAgreements: number;
  signedAgreements: number;
  draftAgreements: number;
  sentAgreements: number;
  conversionRate: number;
}

export default function AdminHome() {
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useDarkMode();
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/analytics?days=7');
      if (response.ok) {
        const data = await response.json();
        setStats(data.overview);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const smartFields = [
    { field: '{{client.firstName}}', description: 'Client first name', example: 'John' },
    { field: '{{client.lastName}}', description: 'Client last name', example: 'Smith' },
    { field: '{{client.email}}', description: 'Client email address', example: 'john.smith@example.com' },
    { field: '{{client.phone}}', description: 'Client phone number', example: '(555) 123-4567' },
    { field: '{{client.eventDate}}', description: 'Event date', example: '2024-06-15' },
    { field: '{{event.type}}', description: 'Type of event', example: 'Wedding Photography' },
    { field: '{{event.location}}', description: 'Event location', example: 'Grand Ballroom, Downtown Hotel' },
    { field: '{{event.startTime}}', description: 'Event start time', example: '2:00 PM' },
    { field: '{{event.duration}}', description: 'Event duration', example: '8 hours' },
    { field: '{{event.package}}', description: 'Package selected', example: 'Premium Package' },
    { field: '{{event.guests}}', description: 'Expected number of guests', example: '150' },
    { field: '{{event.specialRequests}}', description: 'Special requests or notes', example: 'Candids during ceremony' },
    { field: '{{pricing.basePrice}}', description: 'Base package price', example: '$2,500' },
    { field: '{{pricing.addOns}}', description: 'Additional services cost', example: '$500' },
    { field: '{{pricing.total}}', description: 'Total price', example: '$3,000' },
    { field: '{{pricing.deposit}}', description: 'Required deposit', example: '$1,500' },
    { field: '{{pricing.balance}}', description: 'Remaining balance', example: '$1,500' },
    { field: '{{pricing.paymentSchedule}}', description: 'Payment schedule', example: '50% deposit, 50% on delivery' },
    { field: '{{company.name}}', description: 'Your company name', example: 'Photobooth Guys' },
    { field: '{{company.phone}}', description: 'Your company phone', example: '(555) 987-6543' },
    { field: '{{company.email}}', description: 'Your company email', example: 'info@photoboothguys.ca' },
    { field: '{{company.address}}', description: 'Your company address', example: '123 Main St, City, State 12345' },
    { field: '{{company.website}}', description: 'Your website URL', example: 'www.photoboothguys.ca' },
    { field: '{{agreement.date}}', description: 'Agreement creation date', example: '2024-01-15' },
    { field: '{{agreement.expires}}', description: 'Agreement expiration date', example: '2024-02-15' },
    { field: '{{agreement.id}}', description: 'Unique agreement ID', example: 'AGR-2024-001' }
  ];

  const mainBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '32px', 
            fontWeight: '700', 
            color: textColor 
          }}>
            Welcome to Photobooth Guys
          </h1>
          <p style={{ 
            margin: '0', 
            color: mutedText, 
            fontSize: '16px' 
          }}>
            Manage your client agreements and contracts efficiently
          </p>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '32px'
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => router.push('/admin/dashboard')}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                {stats.totalClients}
              </div>
              <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Total Clients</div>
            </div>
            
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => router.push('/admin/dashboard')}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                {stats.totalAgreements}
              </div>
              <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Total Agreements</div>
            </div>
            
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => router.push('/admin/dashboard')}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                {stats.signedAgreements}
              </div>
              <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Signed Agreements</div>
            </div>
            
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => router.push('/admin/dashboard')}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                {stats.conversionRate}%
              </div>
              <div style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Conversion Rate</div>
            </div>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          onClick={() => router.push('/admin/dashboard')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <span style={{ color: 'white', fontSize: '20px' }}>ðŸ“Š</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Analytics Dashboard</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              View detailed analytics, charts, and insights about your agreements and clients.
            </p>
          </div>

          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          onClick={() => router.push('/admin/clients')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#10b981',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <span style={{ color: 'white', fontSize: '20px' }}>ðŸ‘¥</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Manage Clients</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Add, edit, and manage your client database.
            </p>
          </div>

          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          onClick={() => router.push('/admin/templates')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f59e0b',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <span style={{ color: 'white', fontSize: '20px' }}>ðŸ“„</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Templates</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Create and manage agreement templates with smart fields.
            </p>
          </div>

          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          onClick={() => router.push('/admin/agreements')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <span style={{ color: 'white', fontSize: '20px' }}>ðŸ“‹</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Agreements</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Create, manage, and track client agreements.
            </p>
          </div>
        </div>

        {/* Smart Fields Help */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ margin: '0', fontSize: '20px', color: textColor }}>
              Smart Fields Reference
            </h2>
            <button
              onClick={() => setShowSmartFields(!showSmartFields)}
              style={{
                backgroundColor: showSmartFields ? '#059669' : '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {showSmartFields ? 'Hide Smart Fields' : 'Show Smart Fields'}
            </button>
          </div>
          
          {showSmartFields && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '16px' 
            }}>
              {smartFields.map((field, index) => (
                <div key={index} style={{
                  padding: '12px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`
                }}>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#3b82f6',
                    marginBottom: '4px'
                  }}>
                    {field.field}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: textColor, 
                    marginBottom: '4px' 
                  }}>
                    {field.description}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: mutedText, 
                    fontStyle: 'italic' 
                  }}>
                    Example: {field.example}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
