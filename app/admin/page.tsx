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

interface Warning {
  id: string;
  status: string;
  lastEmailedAt: string | null;
  expiresAt: string | null;
  daysSinceSent: number | null;
  hoursUntilExpiry: number | null;
  warningType: 'expiration' | 'critical' | 'warning';
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    title: string;
  };
}

interface WarningsData {
  warnings: Warning[];
  summary: {
    totalWarnings: number;
    yellowWarnings: number;
    redWarnings: number;
    expirationWarnings: number;
  };
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warnings, setWarnings] = useState<WarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useDarkMode();
  const router = useRouter();

  useEffect(() => {
    fetchStats();
    fetchWarnings();
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

  const fetchWarnings = async () => {
    try {
      const response = await fetch('/api/analytics/warnings');
      if (response.ok) {
        const data = await response.json();
        setWarnings(data);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
  };


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

        {/* Warnings Section */}
        {warnings && warnings.summary.totalWarnings > 0 && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '24px'
              }}>
                {warnings.summary.expirationWarnings > 0 ? '🚨' : 
                 warnings.summary.redWarnings > 0 ? '⚠️' : '⚠️'}
              </div>
              <h2 style={{
                margin: '0',
                fontSize: '20px',
                color: textColor,
                fontWeight: '700'
              }}>
                {warnings.summary.expirationWarnings > 0 ? 'Critical Alerts' : 
                 warnings.summary.redWarnings > 0 ? 'Urgent Attention Required' : 'Attention Required'}
              </h2>
              <div style={{
                padding: '4px 12px',
                backgroundColor: warnings.summary.expirationWarnings > 0 ? '#dc2626' : 
                              warnings.summary.redWarnings > 0 ? '#dc2626' : '#f59e0b',
                color: 'white',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {warnings.summary.totalWarnings} {warnings.summary.totalWarnings === 1 ? 'Issue' : 'Issues'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {warnings.warnings.slice(0, 5).map((warning) => (
                <div key={warning.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`
                }}>
                  <div style={{
                    fontSize: '20px'
                  }}>
                    {warning.warningType === 'expiration' ? '⏰' : 
                     warning.warningType === 'critical' ? '🚨' : '⚠️'}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px'
                    }}>
                      <h4 style={{
                        margin: '0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: textColor
                      }}>
                        {warning.client.firstName} {warning.client.lastName}
                      </h4>
                      <div style={{
                        padding: '2px 8px',
                        backgroundColor: warning.warningType === 'expiration' ? '#dc2626' :
                                      warning.warningType === 'critical' ? '#dc2626' : '#f59e0b',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {warning.warningType === 'expiration' ? 'EXPIRING' :
                         warning.warningType === 'critical' ? 'CRITICAL' : 'WARNING'}
                      </div>
                    </div>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: mutedText
                    }}>
                      {warning.template.title}
                    </p>
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: mutedText
                    }}>
                      {warning.warningType === 'expiration' ? (
                        `Expires in ${warning.hoursUntilExpiry} hours`
                      ) : (
                        `Sent ${warning.daysSinceSent} days ago`
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push('/admin/agreements')}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
              
              {warnings.warnings.length > 5 && (
                <div style={{
                  textAlign: 'center',
                  padding: '12px',
                  color: mutedText,
                  fontSize: '14px'
                }}>
                  +{warnings.warnings.length - 5} more issues
                </div>
              )}
            </div>
          </div>
        )}

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
                
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Agreements</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Create, manage, and track client agreements.
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
          onClick={() => router.push('/admin/pipeline')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#06b6d4',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '20px'
              }}>
                📊
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Agreement Pipeline</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Track agreements through the client journey and identify bottlenecks.
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
          onClick={() => router.push('/admin/enhanced-dashboard')}
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
                marginRight: '12px',
                fontSize: '20px'
              }}>
                💰
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Enhanced Dashboard</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Revenue tracking, client retention, audit logs, and quick actions.
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
          onClick={() => router.push('/admin/backdrop-links')}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#ec4899',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '20px'
              }}>
                🖼️
              </div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Backdrop Links</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Manage backdrop selection URLs for the client portal.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

