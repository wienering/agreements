'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, Cell } from 'recharts';
import { UIcon } from '../components/UIcon';
import { chartTokens, statusTokens } from '../lib/adminTheme';
import { AdminButton } from '../components/AdminButton';
import { formatDateToronto } from '@/lib/dates';

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

function getAgreementsChartNote(
  chartData: Array<{ month: string; count: number }>,
  period: 'week' | 'month' | 'year',
): string {
  if (chartData.length === 0) {
    return 'Event counts use Eastern Time.';
  }

  if (period === 'week') {
    const today = chartData[chartData.length - 1];
    return `${today.count} event${today.count === 1 ? '' : 's'} scheduled for ${today.month}.`;
  }

  if (chartData.length < 2) {
    return 'Event counts use Eastern Time.';
  }

  const current = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];

  if (current.count === previous.count) {
    return `${current.month} matches ${previous.month} at ${current.count} event${current.count === 1 ? '' : 's'}.`;
  }

  if (current.count > previous.count) {
    return `${current.month} has ${current.count} events, up from ${previous.count} in ${previous.month}.`;
  }

  return `${current.month} has ${current.count} events, down from ${previous.count} in ${previous.month}.`;
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
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingForecast(true);
      const response = await adminFetch(`/api/analytics/dashboard?period=${timePeriod}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.overview);
        setUpcomingEvents(data.upcomingEvents || []);
        setWarnings({
          warnings: data.warnings || [],
          summary: data.summary || {
            totalWarnings: 0,
            yellowWarnings: 0,
            redWarnings: 0,
            expirationWarnings: 0,
          },
        });
        setLoadForecast(data.forecast || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setLoadingForecast(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const mainBg = 'var(--admin-bg)';
  const cardBg = 'var(--admin-surface)';
  const textColor = 'var(--admin-text)';
  const mutedText = 'var(--admin-muted)';
  const borderColor = 'var(--admin-hairline)';
  // Recharts passes colour props straight through to SVG fill/stroke, which do
  // not resolve CSS vars, so charts read literals from adminTheme.
  const accentGreen = chartTokens.accent;

  // Cards are white on the app background, separated by a hairline and nothing
  // else. cardPad uses clamp so the roomier desktop padding tightens on narrow
  // phones, avoiding horizontal overflow at 375px.
  const cardSurface = 'var(--admin-surface)';
  const cardBorderStrong = 'var(--admin-hairline)';
  const cardShadow = 'none';
  const cardPad = 'clamp(18px, 4vw, 26px)';
  // Prior-month and secondary chart series. Quiet enough that the accent-filled
  // current month is the first thing the eye lands on.
  const neutralBar = chartTokens.neutral;

  const chartData = stats?.monthlyStats || [];
  const totalAgreementsDisplay = chartData.reduce((sum, item) => sum + item.count, 0);
  const chartNote = getAgreementsChartNote(chartData, timePeriod);

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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              {/* Title only. The sidebar already says whose product this is. */}
              <h1 className="admin-page-title" style={{
                margin: 0,
                fontSize: '21px',
                color: textColor,
                lineHeight: 1.2
              }}>
                Overview
              </h1>
              <div className="admin-title-rule" aria-hidden="true" />
            </div>

            <div className="admin-overview-header-actions">
              <AdminButton variant="ghost" onClick={() => router.push('/admin/clients')}>
                Clients
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => router.push('/admin/agreements')}>
                Agreements
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => router.push('/admin/agreements')}
                title="Create a new agreement"
              >
                + New agreement
              </AdminButton>
            </div>
          </div>
        </div>

        {/* Active agreements + upcoming events (14 days) */}
        <div className="admin-overview-top">
          {loading ? (
            <>
              <div style={{
                backgroundColor: cardSurface,
                borderRadius: '2px',
                padding: cardPad,
                border: `1px solid ${cardBorderStrong}`,
                boxShadow: cardShadow,
                minHeight: '220px'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
              <div style={{
                backgroundColor: cardSurface,
                borderRadius: '2px',
                padding: cardPad,
                border: `1px solid ${cardBorderStrong}`,
                boxShadow: cardShadow,
                minHeight: '220px'
              }}>
                <div style={{ color: mutedText }}>Loading...</div>
              </div>
            </>
          ) : stats ? (
            <>
              <div style={{
                backgroundColor: cardSurface,
                borderRadius: '2px',
                padding: cardPad,
                border: `1px solid ${cardBorderStrong}`,
                boxShadow: cardShadow,
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
                {(() => {
                  // Render the breakdown as a single segmented bar + legend.
                  // Order is fixed left→right so the eye can track proportion
                  // over time even as counts shift: Completed → Live → Signed
                  // → Draft → anything else (e.g. Sent, Cancelled) folded into
                  // the neutral tail.
                  const SEGMENT_ORDER = ['COMPLETED', 'LIVE', 'SIGNED', 'DRAFT'] as const;
                  // Same palette as the status badges, so a segment here and a
                  // badge in a table say the same thing in the same colour.
                  const segmentColor: Record<string, string> = {
                    COMPLETED: statusTokens.strong,
                    LIVE: statusTokens.waitLight,
                    SIGNED: statusTokens.good,
                    DRAFT: statusTokens.idle,
                  };
                  const byStatus = new Map(activeByStatus.map((r) => [r.status, r.count]));
                  const rest = activeByStatus.filter((r) => !SEGMENT_ORDER.includes(r.status as typeof SEGMENT_ORDER[number]));
                  const ordered = [
                    ...SEGMENT_ORDER.map((s) => ({ status: s, count: byStatus.get(s) ?? 0, color: segmentColor[s] })),
                    ...rest.map((r) => ({ status: r.status, count: r.count, color: chartTokens.neutral })),
                  ];
                  const denom = activeTotal > 0 ? activeTotal : 1;
                  return (
                    <div style={{ marginBottom: '4px' }}>
                      <div
                        role="img"
                        aria-label={`Status breakdown out of ${activeTotal}`}
                        style={{
                          display: 'flex',
                          width: '100%',
                          height: '10px',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--admin-surface-raised)',
                          marginBottom: '14px',
                        }}
                      >
                        {ordered.filter((s) => s.count > 0).map((s) => (
                          <div
                            key={s.status}
                            title={`${AGREEMENT_STATUS_LABELS[s.status] ?? s.status}: ${s.count}`}
                            style={{
                              width: `${(s.count / denom) * 100}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        ))}
                      </div>
                      <div className="admin-overview-status-grid">
                        {ordered.filter((s) => s.count > 0).map((s) => (
                          <div
                            key={s.status}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 0',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '2px',
                                backgroundColor: s.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ flex: 1, fontSize: '13px', color: mutedText, minWidth: 0 }}>
                              {AGREEMENT_STATUS_LABELS[s.status] ?? s.status}
                            </span>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 400,
                                color: textColor,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {s.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid} />
                        <XAxis
                          dataKey="weekLabel"
                          stroke={chartTokens.axis}
                          fontSize={10}
                          angle={-40}
                          textAnchor="end"
                          height={72}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke={chartTokens.axis}
                          fontSize={11}
                          width={36}
                          label={{ value: 'Events', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: chartTokens.axis, fontSize: 10 } }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke={chartTokens.axis}
                          fontSize={11}
                          width={36}
                          label={{ value: 'Hours', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: chartTokens.axis, fontSize: 10 } }}
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
                                borderRadius: '2px',
                                padding: '12px',
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
                          fill={neutralBar}
                          radius={[1, 1, 0, 0]}
                          name="eventCount"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="totalHours"
                          stroke={accentGreen}
                          strokeWidth={2}
                          dot={{ fill: neutralBar, r: 3 }}
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
                backgroundColor: cardSurface,
                borderRadius: '2px',
                padding: cardPad,
                border: `1px solid ${cardBorderStrong}`,
                boxShadow: cardShadow,
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

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, idx) => {
                      const eventDate = new Date(event.eventDate);
                      const monthLabel = formatDateToronto(event.eventDate, { month: 'short' });
                      const dayLabel = formatDateToronto(event.eventDate, { day: 'numeric' });
                      // Split out the "c/o ..." suffix so the lead-in name reads
                      // as the primary subject and the care-of contact recedes.
                      const coMatch = event.clientName.match(/^(.*?)(\s+c\/o\s+.*)$/i);
                      const primaryName = coMatch ? coMatch[1] : event.clientName;
                      const coSuffix = coMatch ? coMatch[2].trim() : '';
                      const secondaryLine = [event.eventType, event.eventLocation].filter(Boolean).join(' · ');
                      const relativeLabel = event.daysUntil === 0
                        ? 'today'
                        : event.daysUntil === 1
                          ? 'tomorrow'
                          : `in ${event.daysUntil} days`;
                      // Only the next-up event gets accent treatment on its
                      // time; the rest stay in standard text color.
                      const isSoonest = idx === 0;
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
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '14px',
                            padding: '12px 4px',
                            borderTop: idx === 0 ? 'none' : `1px solid ${borderColor}`,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--admin-surface-raised)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* Date block */}
                          <div style={{
                            flexShrink: 0,
                            width: '40px',
                            textAlign: 'center',
                            paddingTop: '2px',
                          }}>
                            <div style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: mutedText,
                              lineHeight: 1,
                            }}>
                              {monthLabel}
                            </div>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: 500,
                              color: textColor,
                              lineHeight: 1.1,
                              marginTop: '4px',
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              {dayLabel}
                            </div>
                          </div>

                          {/* Middle: client + secondary line */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', color: textColor, lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 500 }}>{primaryName}</span>
                              {coSuffix && (
                                <span style={{ color: mutedText, fontWeight: 400 }}> {coSuffix}</span>
                              )}
                            </div>
                            {secondaryLine && (
                              <div style={{
                                fontSize: '12px',
                                color: mutedText,
                                marginTop: '4px',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {secondaryLine}
                              </div>
                            )}
                          </div>

                          {/* Right: time + relative */}
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            {event.eventStartTime && (
                              <div style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: isSoonest ? 'var(--accent)' : textColor,
                                lineHeight: 1.2,
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {event.eventStartTime}
                              </div>
                            )}
                            <div style={{
                              fontSize: '11px',
                              color: mutedText,
                              marginTop: '4px',
                              lineHeight: 1.2,
                            }}>
                              {relativeLabel}
                            </div>
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
          backgroundColor: cardSurface,
          borderRadius: '2px',
          padding: cardPad,
          border: `1px solid ${cardBorderStrong}`,
          boxShadow: cardShadow,
          marginBottom: '28px'
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
              <div style={{ fontSize: '22px', fontWeight: '700', color: textColor, marginBottom: '4px' }}>
                {totalAgreementsDisplay}
              </div>
              <div style={{ fontSize: '12px', color: mutedText, lineHeight: 1.4 }}>
                {chartNote}
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
                    borderRadius: '2px',
                    border: 'none',
                    backgroundColor: timePeriod === period
                      ? 'var(--accent)'
                      : 'transparent',
                    color: timePeriod === period ? 'var(--accent-on)' : mutedText,
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
                <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid} />
                <XAxis
                  dataKey="month"
                  stroke={chartTokens.axis}
                  fontSize={11}
                  tickMargin={4}
                />
                <YAxis stroke={chartTokens.axis} fontSize={11} width={32} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '2px',
                    color: textColor
                  }}
                />
                <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.month ?? index}
                      fill={index === chartData.length - 1 ? accentGreen : neutralBar}
                    />
                  ))}
                </Bar>
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
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              backgroundColor: cardSurface,
              borderRadius: '2px',
              padding: cardPad,
              border: `1px solid ${cardBorderStrong}`,
              boxShadow: cardShadow
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
                  backgroundColor: warnings.summary.expirationWarnings > 0 ? 'var(--alert)' :
                    warnings.summary.redWarnings > 0 ? 'var(--alert)' : 'var(--warn)',
                  color: 'var(--accent-on)',
                  borderRadius: '2px',
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
                      borderRadius: '2px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: 'var(--admin-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--admin-surface-raised)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--admin-bg)';
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
                          <UIcon name="clock" style={{ color: 'var(--warn)' }} />
                        ) : warning.warningType === 'critical' ? (
                          <UIcon name="siren" style={{ color: 'var(--alert)' }} />
                        ) : (
                          <UIcon name="circle-exclamation" style={{ color: 'var(--warn)' }} />
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
                        backgroundColor: warning.warningType === 'expiration' ? 'var(--alert)' :
                          warning.warningType === 'critical' ? 'var(--alert)' : 'var(--warn)',
                        color: 'var(--accent-on)',
                        borderRadius: '2px',
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
