'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { UIcon } from '../components/UIcon';

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

interface UpcomingEvent {
  id: string;
  clientName: string;
  eventDate: string;
  eventStartTime: string | null;
  eventType: string | null;
  eventLocation: string | null;
  daysUntil: number;
}

interface WeeklyLoadForecast {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  eventCount: number;
  totalHours: number;
  clientNames: string[];
}

export default function AdminHome() {
  // Set page title
  useEffect(() => {
    document.title = 'Admin Dashboard | Photobooth Guys';
  }, []);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warnings, setWarnings] = useState<WarningsData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loadForecast, setLoadForecast] = useState<WeeklyLoadForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
  const { isDark } = useDarkMode();
  const router = useRouter();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const periodParam = timePeriod === 'week' ? 'week' : timePeriod === 'month' ? 'month' : 'year';
      const response = await fetch(`/api/analytics?days=7&period=${periodParam}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.overview);
        setRecentActivity(data.recentActivity || []);
        setUpcomingEvents(data.upcomingEvents || []);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchStats();
    fetchWarnings();
    fetchLoadForecast();
  }, [fetchStats]);

  const fetchLoadForecast = async () => {
    try {
      setLoadingForecast(true);
      const response = await fetch('/api/analytics/load-forecast?weeks=12');
      if (response.ok) {
        const data = await response.json();
        setLoadForecast(data.forecast || []);
      }
    } catch (error) {
      console.error('Error fetching load forecast:', error);
    } finally {
      setLoadingForecast(false);
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

  const mainBg = isDark ? '#080c08' : '#f8fafc';
  const cardBg = isDark ? '#1a1d1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const mutedText = isDark ? '#8f9a8f' : '#64748b';
  const borderColor = isDark ? '#2d3530' : '#e2e8f0';

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

  // Calculate total agreements and growth for display based on period
  const chartData = stats?.monthlyStats || [];
  const totalAgreementsDisplay = chartData.reduce((sum, item) => sum + item.count, 0);
  
  let growthText = '';
  let growthValue = 0;
  if (chartData.length >= 2) {
    const currentPeriod = chartData[chartData.length - 1]?.count || 0;
    const previousPeriod = chartData[chartData.length - 2]?.count || 0;
    
    if (previousPeriod > 0) {
      growthValue = Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100);
    } else if (currentPeriod > 0) {
      growthValue = 100;
    }
    
    const periodLabel = timePeriod === 'week' ? 'last week' : timePeriod === 'year' ? 'last year' : 'last month';
    growthText = `${growthValue >= 0 ? '+' : ''}${growthValue}% vs ${periodLabel}`;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
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
            
            {/* Quick Actions - Compact */}
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'flex-start'
            }}>
              <div 
                onClick={() => router.push('/admin/clients')}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#4a9e72',
                  borderRadius: '6px'
                }}></div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>Clients</span>
              </div>

              <div 
                onClick={() => router.push('/admin/templates')}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#f59e0b',
                  borderRadius: '6px'
                }}></div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>Templates</span>
              </div>

              <div 
                onClick={() => router.push('/admin/agreements')}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '6px'
                }}></div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>Agreements</span>
              </div>
            </div>
          </div>
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
                  color: (stats.trends?.agreements || 0) >= 0 ? '#4a9e72' : '#ef4444',
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
                  color: (stats.trends?.signed || 0) >= 0 ? '#4a9e72' : '#ef4444',
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
                  color: (stats.trends?.clients || 0) >= 0 ? '#4a9e72' : '#ef4444',
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
                  {growthText || 'No comparison available'}
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
                        ? (isDark ? '#4a9e72' : '#3d8560')
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
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
                  <Bar dataKey="count" fill="#4a9e72" radius={[4, 4, 0, 0]} />
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
                        backgroundColor: isDark ? '#080c08' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#1a1d1a' : '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#080c08' : '#f8fafc';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}>
                          {warning.warningType === 'expiration' ? (
                            <UIcon name="clock" style={{ color: '#f59e0b' }} />
                          ) : warning.warningType === 'critical' ? (
                            <UIcon name="siren" style={{ color: '#dc2626' }} />
                          ) : (
                            <UIcon name="circle-exclamation" style={{ color: '#f59e0b' }} />
                          )}
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

            {/* Upcoming Events */}
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
                  Upcoming Events
                </h3>
                <svg style={{ width: '18px', height: '18px', color: mutedText }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => {
                    const eventDate = new Date(event.eventDate);
                    const dateStr = eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    });
                    return (
                      <div 
                        key={event.id}
                        onClick={() => router.push(`/admin/clients`)}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#080c08' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#1a1d1a' : '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#080c08' : '#f8fafc';
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '600', color: textColor, marginBottom: '4px' }}>
                          {dateStr}{event.eventStartTime ? `, ${event.eventStartTime}` : ''}
                        </div>
                        <div style={{ fontSize: '13px', color: textColor, marginBottom: '2px' }}>
                          {event.clientName}
                        </div>
                        {event.eventType && (
                          <div style={{ fontSize: '12px', color: mutedText, marginBottom: '2px' }}>
                            {event.eventType}
                          </div>
                        )}
                        {event.eventLocation && (
                          <div style={{ fontSize: '11px', color: mutedText, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UIcon name="marker" style={{ fontSize: '11px', flexShrink: 0 }} />
                            {event.eventLocation}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#4a9e72', fontWeight: '600' }}>
                          {event.daysUntil === 0 ? 'Today' : `${event.daysUntil} day${event.daysUntil === 1 ? '' : 's'} away`}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: mutedText, fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    No upcoming events
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity - Smaller */}
            <div style={{
              backgroundColor: cardBg,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  margin: '0', 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: textColor 
                }}>
                  Recent Activity
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity) => (
                    <div 
                      key={activity.id}
                      onClick={() => router.push('/admin/agreements')}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#1a1d1a' : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '600', color: textColor, marginBottom: '2px' }}>
                        {activity.client.firstName} {activity.client.lastName}
                      </div>
                      <div style={{ fontSize: '11px', color: mutedText }}>
                        {formatRelativeTime(activity.signedAt || activity.createdAt)}
                        {activity.status === 'SIGNED' && ' • Signed'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: mutedText, fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Load Forecast */}
        <div style={{
          backgroundColor: cardBg,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '32px'
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
                Weekly Load Forecast
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '14px', 
                color: mutedText 
              }}>
                Track upcoming events and booth hours to identify capacity constraints
              </p>
            </div>
          </div>

          {loadingForecast ? (
            <div style={{ 
              height: '300px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: mutedText
            }}>
              Loading forecast...
            </div>
          ) : loadForecast && loadForecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={loadForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke={mutedText}
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={mutedText}
                  fontSize={12}
                  label={{ value: 'Events', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: mutedText } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={mutedText}
                  fontSize={12}
                  label={{ value: 'Hours', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: mutedText } }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    
                    const data = payload[0]?.payload as WeeklyLoadForecast;
                    const eventCount = data?.eventCount || 0;
                    const totalHours = data?.totalHours || 0;
                    const clientNames = data?.clientNames || [];
                    
                    return (
                      <div style={{
                        backgroundColor: cardBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '6px',
                        padding: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ 
                          color: textColor, 
                          fontWeight: '600', 
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}>
                          {label}
                        </div>
                        <div style={{ 
                          color: textColor, 
                          marginBottom: '4px',
                          fontSize: '13px'
                        }}>
                          <strong>{eventCount}</strong> Event{eventCount !== 1 ? 's' : ''}
                        </div>
                        <div style={{ 
                          color: textColor, 
                          marginBottom: clientNames.length > 0 ? '8px' : '0',
                          fontSize: '13px'
                        }}>
                          <strong>{totalHours}</strong> Hours
                        </div>
                        {clientNames.length > 0 && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: mutedText,
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: `1px solid ${borderColor}`
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: textColor }}>Clients:</div>
                            <div>{clientNames.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => {
                    if (value === 'eventCount') return 'Events';
                    if (value === 'totalHours') return 'Hours';
                    return value;
                  }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="eventCount" 
                  fill="#4a9e72" 
                  radius={[4, 4, 0, 0]}
                  name="eventCount"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="totalHours" 
                  stroke="#4a9e72" 
                  strokeWidth={2}
                  dot={{ fill: '#4a9e72', r: 4 }}
                  name="totalHours"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ 
              height: '300px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: mutedText
            }}>
              No forecast data available
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
