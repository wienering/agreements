'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardStats {
  totalClients: number;
  totalTemplates: number;
  totalAgreements: number;
  signedAgreements: number;
  draftAgreements: number;
  sentAgreements: number;
  conversionRate: number;
  trends?: {
    agreements: number;
    signed: number;
    clients: number;
  };
  monthlyStats?: Array<{
    month: string;
    count: number;
  }>;
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

interface RecentActivity {
  id: string;
  createdAt: string;
  signedAt: string | null;
  status: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
  template: {
    title: string;
  };
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warnings, setWarnings] = useState<WarningsData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
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
        setRecentActivity(data.recentActivity || []);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  // Calculate total agreements for display
  const totalAgreementsDisplay = stats?.monthlyStats?.reduce((sum, item) => sum + item.count, 0) || stats?.totalAgreements || 0;
  const lastMonthCount = stats?.monthlyStats?.[stats.monthlyStats.length - 2]?.count || 0;
  const currentMonthCount = stats?.monthlyStats?.[stats.monthlyStats.length - 1]?.count || 0;
  const monthGrowth = lastMonthCount > 0 
    ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100)
    : currentMonthCount > 0 ? 100 : 0;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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

        {/* Top Summary Cards */}
        {loading ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '32px'
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '24px',
                border: `1px solid ${borderColor}`,
                height: '120px'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '32px'
          }}>
            {/* Total Agreements Card */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '14px', color: mutedText, marginBottom: '8px' }}>Total Agreements</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: textColor, marginBottom: '8px' }}>
                {stats.totalAgreements}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: (stats.trends?.agreements || 0) >= 0 ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {(stats.trends?.agreements || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats.trends?.agreements || 0)}%
                </span>
                <span style={{ fontSize: '12px', color: mutedText }}>vs last period</span>
              </div>
            </div>

            {/* Signed Agreements Card */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '14px', color: mutedText, marginBottom: '8px' }}>Signed Agreements</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: textColor, marginBottom: '8px' }}>
                {stats.signedAgreements}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: (stats.trends?.signed || 0) >= 0 ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {(stats.trends?.signed || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats.trends?.signed || 0)}%
                </span>
                <span style={{ fontSize: '12px', color: mutedText }}>vs last period</span>
              </div>
            </div>

            {/* Conversion Rate Card */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '14px', color: mutedText, marginBottom: '8px' }}>Conversion Rate</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: textColor, marginBottom: '8px' }}>
                {stats.conversionRate}%
              </div>
              <div style={{ fontSize: '12px', color: mutedText }}>
                Signed / Total Agreements
              </div>
            </div>

            {/* Total Clients Card */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '14px', color: mutedText, marginBottom: '8px' }}>Total Clients</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: textColor, marginBottom: '8px' }}>
                {stats.totalClients}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: (stats.trends?.clients || 0) >= 0 ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {(stats.trends?.clients || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats.trends?.clients || 0)}%
                </span>
                <span style={{ fontSize: '12px', color: mutedText }}>vs last period</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main Content Area - 2 Column Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: '24px',
          marginBottom: '32px'
        }}
        className="admin-dashboard-layout"
        >
          {/* Left/Main Section - Agreements Chart */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div>
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: textColor 
                }}>
                  Agreements
                </h2>
                <div style={{ fontSize: '32px', fontWeight: '700', color: textColor, marginBottom: '4px' }}>
                  {totalAgreementsDisplay}
                </div>
                <div style={{ fontSize: '14px', color: mutedText }}>
                  {monthGrowth >= 0 ? '+' : ''}{monthGrowth}% vs last month
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['week', 'month', 'year'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: timePeriod === period 
                        ? (isDark ? '#3b82f6' : '#2563eb')
                        : 'transparent',
                      color: timePeriod === period ? '#ffffff' : mutedText,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            {stats?.monthlyStats && stats.monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                  <XAxis 
                    dataKey="month" 
                    stroke={mutedText}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={mutedText}
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textColor
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: mutedText
              }}>
                No data available
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Attention Required */}
            {warnings && warnings.summary.totalWarnings > 0 && (
              <div style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ 
                    margin: '0', 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: textColor 
                  }}>
                    Attention Required
                  </h3>
                  <div style={{
                    padding: '4px 12px',
                    backgroundColor: warnings.summary.expirationWarnings > 0 ? '#dc2626' : 
                                  warnings.summary.redWarnings > 0 ? '#dc2626' : '#f59e0b',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {warnings.summary.totalWarnings}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {warnings.warnings.slice(0, 5).map((warning) => (
                    <div 
                      key={warning.id}
                      onClick={() => router.push('/admin/agreements')}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${borderColor}`,
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#0f172a' : '#f8fafc';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '14px' }}>
                          {warning.warningType === 'expiration' ? '⏰' : 
                           warning.warningType === 'critical' ? '🚨' : '⚠️'}
                        </span>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: textColor 
                        }}>
                          {warning.client.firstName} {warning.client.lastName}
                        </span>
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: warning.warningType === 'expiration' ? '#dc2626' :
                                        warning.warningType === 'critical' ? '#dc2626' : '#f59e0b',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {warning.warningType === 'expiration' ? 'EXPIRING' :
                           warning.warningType === 'critical' ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: mutedText, marginBottom: '4px' }}>
                        {warning.template.title}
                      </div>
                      <div style={{ fontSize: '11px', color: mutedText }}>
                        {warning.warningType === 'expiration' 
                          ? `Expires in ${warning.hoursUntilExpiry}h`
                          : `Sent ${warning.daysSinceSent}d ago`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h3 style={{ 
                  margin: '0', 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: textColor 
                }}>
                  Recent Activity
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => (
                    <div 
                      key={activity.id}
                      onClick={() => router.push('/admin/agreements')}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', color: textColor, marginBottom: '4px' }}>
                        {activity.client.firstName} {activity.client.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: mutedText, marginBottom: '4px' }}>
                        {activity.template.title}
                      </div>
                      <div style={{ fontSize: '11px', color: mutedText }}>
                        {formatRelativeTime(activity.signedAt || activity.createdAt)}
                        {activity.status === 'SIGNED' && ' • Signed'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: mutedText, fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid - Below main content */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px'
        }}>
          <div 
            onClick={() => router.push('/admin/dashboard')}
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
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
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}></div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Analytics Dashboard</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              View detailed analytics, charts, and insights about your agreements and clients.
            </p>
          </div>

          <div 
            onClick={() => router.push('/admin/clients')}
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
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
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#10b981',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}></div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Manage Clients</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Add, edit, and manage your client database.
            </p>
          </div>

          <div 
            onClick={() => router.push('/admin/templates')}
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
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
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f59e0b',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}></div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Templates</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Create and manage agreement templates with smart fields.
            </p>
          </div>

          <div 
            onClick={() => router.push('/admin/agreements')}
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
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
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}></div>
              <h3 style={{ margin: '0', fontSize: '18px', color: textColor }}>Agreements</h3>
            </div>
            <p style={{ margin: '0', color: mutedText, fontSize: '14px' }}>
              Create, manage, and track client agreements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
