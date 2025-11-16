'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';

interface RevenueData {
  total: number;
  signed: number;
  pending: number;
  average: number;
  byStatus: {
    signed: number;
    pending: number;
    total: number;
  };
}

interface RetentionData {
  totalClients: number;
  repeatClients: number;
  retentionRate: number;
  newClients: number;
  returningClients: number;
  averageBookings: number;
  totalLifetimeValue: number;
  averageLifetimeValue: number;
}

interface AuditData {
  totalActions: number;
  signatureCount: number;
  viewCount: number;
  signCount: number;
  actionBreakdown: Record<string, number>;
}

export default function EnhancedDashboard() {
  // Set page title
  useEffect(() => {
    document.title = 'Enhanced Dashboard | Admin | Photobooth Guys';
  }, []);

  const { isDark } = useDarkMode();
  const router = useRouter();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDays]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [revenueRes, retentionRes, auditRes] = await Promise.all([
        fetch(`/api/analytics/revenue?days=${selectedDays}`),
        fetch(`/api/analytics/retention?days=${selectedDays}`),
        fetch(`/api/analytics/audit?days=${selectedDays}`)
      ]);

      if (revenueRes.ok) {
        const revenue = await revenueRes.json();
        setRevenueData(revenue.revenue);
      }

      if (retentionRes.ok) {
        const retention = await retentionRes.json();
        setRetentionData(retention.retention);
      }

      if (auditRes.ok) {
        const audit = await auditRes.json();
        setAuditData(audit.audit);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ 
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: '16px'
          }}>
            Loading enhanced dashboard...
          </p>
        </div>
      </div>
    );
  }

  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        padding: '24px 0'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{
                margin: '0 0 8px 0',
                fontSize: '32px',
                fontWeight: '800',
                color: textColor
              }}>
                Enhanced Dashboard
              </h1>
              <p style={{
                margin: '0',
                fontSize: '16px',
                color: mutedText
              }}>
                Revenue tracking, client retention, and audit insights
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: textColor
              }}>
                Time Range:
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  fontSize: '14px'
                }}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Revenue Tracking */}
        {revenueData && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: textColor
            }}>
              💰 Revenue Tracking
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#10b981',
                  marginBottom: '8px'
                }}>
                  {formatCurrency(revenueData.total)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Total Revenue
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#3b82f6',
                  marginBottom: '8px'
                }}>
                  {formatCurrency(revenueData.signed)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Signed Revenue
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#f59e0b',
                  marginBottom: '8px'
                }}>
                  {formatCurrency(revenueData.pending)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Pending Revenue
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#8b5cf6',
                  marginBottom: '8px'
                }}>
                  {formatCurrency(revenueData.average)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Average per Agreement
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Retention */}
        {retentionData && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: textColor
            }}>
              🔄 Client Retention
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#10b981',
                  marginBottom: '8px'
                }}>
                  {formatPercentage(retentionData.retentionRate)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Retention Rate
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#3b82f6',
                  marginBottom: '8px'
                }}>
                  {retentionData.repeatClients}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Repeat Clients
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#f59e0b',
                  marginBottom: '8px'
                }}>
                  {retentionData.averageBookings.toFixed(1)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Avg Bookings per Client
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#8b5cf6',
                  marginBottom: '8px'
                }}>
                  {formatCurrency(retentionData.averageLifetimeValue)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Avg Lifetime Value
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit & Compliance */}
        {auditData && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: textColor
            }}>
              📋 Audit & Compliance
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#10b981',
                  marginBottom: '8px'
                }}>
                  {auditData.signatureCount}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Signatures
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#3b82f6',
                  marginBottom: '8px'
                }}>
                  {auditData.viewCount}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Views
                </div>
              </div>

              <div style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#f59e0b',
                  marginBottom: '8px'
                }}>
                  {auditData.totalActions}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: mutedText,
                  fontWeight: '500'
                }}>
                  Total Actions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '32px'
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: textColor
          }}>
            ⚡ Quick Actions
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <button
              onClick={() => router.push('/admin/agreements')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '20px' }}>📝</span>
              Create New Agreement
            </button>

            <button
              onClick={() => router.push('/admin/templates')}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '20px' }}>📋</span>
              Duplicate Last Template
            </button>

            <button
              onClick={() => {/* Implement reminder logic */}}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d97706';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '20px' }}>📧</span>
              Send Reminder to Unsigned
            </button>

            <button
              onClick={() => {/* Implement export logic */}}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '20px' }}>📊</span>
              Export All Agreements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
