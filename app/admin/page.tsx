'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { UIcon } from '../components/UIcon';
import { accentTokens } from '../lib/adminTheme';

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
  activeAgreements?: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
}

const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  LIVE: 'Live',
  SIGNED: 'Signed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  VOID: 'Void'
};

function StatusDonut({
  fraction,
  accent,
  track
}: {
  fraction: number;
  accent: string;
  track: string;
}) {
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  const dash = f * circumference;
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r={r} fill="none" stroke={track} strokeWidth={2.5} />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
      />
    </svg>
  );
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
  // Literal hex (mirrors --accent in globals.css) — recharts passes this
  // through to SVG fill/stroke attributes, which don't resolve CSS vars.
  const accentGreen = accentTokens.accent;
  const donutTrack = isDark ? '#2a2f2a' : '#e2e8f0';

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

  const activeTotal = stats?.activeAgreements?.total ?? 0;
  const activeByStatus = stats?.activeAgreements?.byStatus ?? [];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: mainBg
    }}
    className="admin-page-root"
    >
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
                margin: '0',
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: '700', 
                color: textColor 
              }}>
                Welcome to Photobooth Guys
              </h1>
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
                  backgroundColor: 'var(--accent)',
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

        {/* Active agreements + upcoming events (14 days) */}
        <div className="admin-overview-top">
          {loading ? (
            <>
              <div style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '24px',
                border: `1px solid ${borderColor}`,
                minHeight: '220px'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
              <div style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '24px',
                border: `1px solid ${borderColor}`,
                minHeight: '220px'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
            </>
          ) : stats ? (
            <>
              <div style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '22px 24px',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                minWidth: 0
              }}>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: textColor
                }}>
                  Active client agreements
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: mutedText }}>
                  Non-archived · all statuses
                </p>
                <div style={{
                  fontSize: 'clamp(28px, 6vw, 40px)',
                  fontWeight: '700',
                  color: textColor,
                  marginBottom: '8px'
                }}>
                  {activeTotal}
                </div>
                <div className="admin-overview-status-grid">
                  {activeByStatus.filter((row) => row.count > 0).map((row) => (
                    <div
                      key={row.status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 0',
                        borderBottom: `1px solid ${borderColor}`
                      }}
                    >
                      <StatusDonut
                        fraction={activeTotal > 0 ? row.count / activeTotal : 0}
                        accent={accentGreen}
                        track={donutTrack}
                      />
                      <span style={{
                        flex: 1,
                        fontSize: '14px',
                        color: textColor,
                        minWidth: 0
                      }}>
                        {AGREEMENT_STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: textColor,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {row.count} / {activeTotal}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '4px',
                  paddingTop: '20px',
                  borderTop: `1px solid ${borderColor}`
                }}>
                  <h3 style={{
                    margin: '0 0 6px 0',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: textColor
                  }}>
                    Weekly load forecast
                  </h3>
                  <p style={{
                    margin: '0 0 14px 0',
                    fontSize: '13px',
                    color: mutedText,
                    lineHeight: 1.45
                  }}>
                    Track upcoming events and booth hours by week to spot capacity constraints early.
                  </p>

                  {loadingForecast ? (
                    <div style={{
                      height: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: mutedText,
                      fontSize: '14px'
                    }}>
                      Loading forecast…
                    </div>
                  ) : loadForecast && loadForecast.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={loadForecast}>
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis
                          dataKey="weekLabel"
                          stroke={mutedText}
                          fontSize={10}
                          angle={-40}
                          textAnchor="end"
                          height={72}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke={mutedText}
                          fontSize={11}
                          width={36}
                          label={{ value: 'Events', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: mutedText, fontSize: 10 } }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke={mutedText}
                          fontSize={11}
                          width={36}
                          label={{ value: 'Hours', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: mutedText, fontSize: 10 } }}
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
                          wrapperStyle={{ paddingTop: '12px' }}
                          formatter={(value) => {
                            if (value === 'eventCount') return 'Events';
                            if (value === 'totalHours') return 'Hours';
                            return value;
                          }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="eventCount"
                          fill={accentGreen}
                          radius={[4, 4, 0, 0]}
                          name="eventCount"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="totalHours"
                          stroke={accentGreen}
                          strokeWidth={2}
                          dot={{ fill: accentGreen, r: 3 }}
                          name="totalHours"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{
                      height: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: mutedText,
                      fontSize: '14px'
                    }}>
                      No forecast data available
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                backgroundColor: cardBg,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${borderColor}`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                minWidth: 0
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{
                      margin: '0 0 6px 0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: textColor
                    }}>
                      Upcoming events
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: mutedText }}>
                      Next 14 days (including today)
                    </p>
                  </div>
                  <svg style={{ width: '18px', height: '18px', color: mutedText, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/attendant/${event.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(`/attendant/${event.id}`);
                            }
                          }}
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
                          <div style={{ fontSize: '11px', color: accentGreen, fontWeight: '600' }}>
                            {event.daysUntil === 0 ? 'Today' : `${event.daysUntil} day${event.daysUntil === 1 ? '' : 's'} away`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: mutedText, fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                      No events in the next 14 days
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Agreements over time — compact */}
        <div style={{
          backgroundColor: cardBg,
          borderRadius: '12px',
          padding: '16px 20px',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ minWidth: 'min(100%, 200px)' }}>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: textColor
              }}>
                Agreements
              </h2>
              <div style={{ fontSize: '22px', fontWeight: '700', color: textColor, marginBottom: '2px' }}>
                {totalAgreementsDisplay}
              </div>
              <div style={{ fontSize: '12px', color: mutedText }}>
                {growthText || 'No comparison available'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTimePeriod(period)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: timePeriod === period
                      ? (isDark ? accentGreen : 'var(--accent)')
                      : 'transparent',
                    color: timePeriod === period ? '#ffffff' : mutedText,
                    fontSize: '13px',
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

          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={168}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                <XAxis
                  dataKey="month"
                  stroke={mutedText}
                  fontSize={11}
                  tickMargin={4}
                />
                <YAxis stroke={mutedText} fontSize={11} width={32} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    color: textColor
                  }}
                />
                <Bar dataKey="count" fill={accentGreen} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: '168px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mutedText,
              fontSize: '14px'
            }}>
              No data available
            </div>
          )}
        </div>

        {warnings && warnings.summary.totalWarnings > 0 && (
          <div style={{ marginBottom: '24px' }}>
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
                  Attention required
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
                      marginBottom: '4px',
                      flexWrap: 'wrap'
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
          </div>
        )}

      </div>
    </div>
  );
}
