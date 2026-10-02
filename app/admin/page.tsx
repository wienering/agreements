'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { UIcon } from '../components/UIcon';
import { chartTokens, statusTokens } from '../lib/adminTheme';
import { AdminButton } from '../components/AdminButton';
import { formatDateToronto } from '@/lib/dates';
import type { WeeklyLoadForecast } from '@/lib/analytics/DashboardCharts';
import { CalendarFeedCard } from './_components/CalendarFeedCard';
import { FollowupsDryRunCard } from './_components/FollowupsDryRunCard';

const WeeklyLoadChart = dynamic(
  () => import('@/lib/analytics/DashboardCharts').then((mod) => mod.WeeklyLoadChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[240px] items-center justify-center text-sm text-admin-muted">
        Loading forecast…
      </div>
    ),
  },
);

const AgreementsBarChart = dynamic(
  () => import('@/lib/analytics/DashboardCharts').then((mod) => mod.AgreementsBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[168px] items-center justify-center text-sm text-admin-muted">
        Loading chart…
      </div>
    ),
  },
);

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

const cardClass = 'min-w-0 rounded-sm border border-admin-border bg-admin-surface p-[clamp(18px,4vw,26px)] shadow-none';

export default function AdminHome() {
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

  const chartData = stats?.monthlyStats || [];
  const totalAgreementsDisplay = chartData.reduce((sum, item) => sum + item.count, 0);
  const chartNote = getAgreementsChartNote(chartData, timePeriod);

  const activeTotal = stats?.activeAgreements?.total ?? 0;
  const activeByStatus = stats?.activeAgreements?.byStatus ?? [];

  const attentionTone = warnings && (warnings.summary.expirationWarnings > 0 || warnings.summary.redWarnings > 0)
    ? 'bg-alert'
    : 'bg-warn';

  return (
    <div className="min-h-screen bg-admin-bg p-6 max-[768px]:p-4">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[200px] flex-1">
              <h1 className="m-0 font-display text-[21px] font-semibold leading-[1.2] tracking-[-0.01em] text-admin-text">
                Overview
              </h1>
              <div className="mt-3 h-px w-full bg-rule-strong" aria-hidden="true" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

        <div className="mb-7 grid grid-cols-1 gap-7 min-[1025px]:grid-cols-2">
          {loading ? (
            <>
              <div className={`${cardClass} min-h-[220px]`}>
                <div className="text-admin-muted">Loading...</div>
              </div>
              <div className={`${cardClass} min-h-[220px]`}>
                <div className="text-admin-muted">Loading...</div>
              </div>
            </>
          ) : stats ? (
            <>
              <div className={cardClass}>
                <h3 className="m-0 mb-1 text-base font-bold text-admin-text">
                  Active client agreements
                </h3>
                <p className="m-0 mb-4 text-[13px] text-admin-muted">
                  Non-archived · all statuses
                </p>
                <div className="mb-2 text-[clamp(28px,6vw,40px)] font-bold text-admin-text">
                  {activeTotal}
                </div>
                {(() => {
                  const SEGMENT_ORDER = ['COMPLETED', 'LIVE', 'SIGNED', 'DRAFT'] as const;
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
                    <div className="mb-1">
                      <div
                        role="img"
                        aria-label={`Status breakdown out of ${activeTotal}`}
                        className="mb-3.5 flex h-2.5 w-full overflow-hidden rounded-sm bg-admin-surface-raised"
                      >
                        {ordered.filter((s) => s.count > 0).map((s) => (
                          <div
                            key={s.status}
                            title={`${AGREEMENT_STATUS_LABELS[s.status] ?? s.status}: ${s.count}`}
                            className="h-full"
                            style={{
                              width: `${(s.count / denom) * 100}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-x-7 max-[640px]:grid-cols-1">
                        {ordered.filter((s) => s.count > 0).map((s) => (
                          <div
                            key={s.status}
                            className="flex items-center gap-2.5 py-1.5"
                          >
                            <span
                              aria-hidden
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="min-w-0 flex-1 text-[13px] text-admin-muted">
                              {AGREEMENT_STATUS_LABELS[s.status] ?? s.status}
                            </span>
                            <span className="text-[13px] font-normal tabular-nums text-admin-text">
                              {s.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-1 border-t border-admin-hairline pt-5">
                  <h3 className="m-0 mb-1.5 text-base font-bold text-admin-text">
                    Weekly load forecast
                  </h3>
                  <p className="m-0 mb-3.5 text-[13px] leading-[1.45] text-admin-muted">
                    Track upcoming events and booth hours by week to spot capacity constraints early.
                  </p>

                  {loadingForecast ? (
                    <div className="flex h-[240px] items-center justify-center text-sm text-admin-muted">
                      Loading forecast…
                    </div>
                  ) : loadForecast && loadForecast.length > 0 ? (
                    <WeeklyLoadChart data={loadForecast} />
                  ) : (
                    <div className="flex h-[240px] items-center justify-center text-sm text-admin-muted">
                      No forecast data available
                    </div>
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 mb-1.5 text-lg font-bold text-admin-text">
                      Upcoming events
                    </h3>
                    <p className="m-0 text-[13px] text-admin-muted">
                      Next 14 days (including today)
                    </p>
                  </div>
                  <svg className="h-[18px] w-[18px] shrink-0 text-admin-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="flex flex-col">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, idx) => {
                      const monthLabel = formatDateToronto(event.eventDate, { month: 'short' });
                      const dayLabel = formatDateToronto(event.eventDate, { day: 'numeric' });
                      const coMatch = event.clientName.match(/^(.*?)(\s+c\/o\s+.*)$/i);
                      const primaryName = coMatch ? coMatch[1] : event.clientName;
                      const coSuffix = coMatch ? coMatch[2].trim() : '';
                      const secondaryLine = [event.eventType, event.eventLocation].filter(Boolean).join(' · ');
                      const relativeLabel = event.daysUntil === 0
                        ? 'today'
                        : event.daysUntil === 1
                          ? 'tomorrow'
                          : `in ${event.daysUntil} days`;
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
                          className={`flex cursor-pointer items-start gap-3.5 px-1 py-3 transition-colors duration-150 hover:bg-admin-surface-raised ${
                            idx === 0 ? 'border-t-0' : 'border-t border-admin-hairline'
                          }`}
                        >
                          <div className="w-10 shrink-0 pt-0.5 text-center">
                            <div className="text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-admin-muted">
                              {monthLabel}
                            </div>
                            <div className="mt-1 text-[20px] font-medium leading-[1.1] tabular-nums text-admin-text">
                              {dayLabel}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm leading-[1.3] text-admin-text">
                              <span className="font-medium">{primaryName}</span>
                              {coSuffix && (
                                <span className="font-normal text-admin-muted"> {coSuffix}</span>
                              )}
                            </div>
                            {secondaryLine && (
                              <div className="mt-1 truncate text-xs leading-[1.3] text-admin-muted">
                                {secondaryLine}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {event.eventStartTime && (
                              <div className={`text-sm font-medium leading-[1.2] tabular-nums ${
                                isSoonest ? 'text-accent' : 'text-admin-text'
                              }`}>
                                {event.eventStartTime}
                              </div>
                            )}
                            <div className="mt-1 text-[11px] leading-[1.2] text-admin-muted">
                              {relativeLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 text-center text-sm text-admin-muted">
                      No events in the next 14 days
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className={`${cardClass} mb-7`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[min(100%,200px)]">
              <h2 className="m-0 mb-1 text-lg font-bold text-admin-text">
                Agreements
              </h2>
              <div className="mb-1 text-[22px] font-bold text-admin-text">
                {totalAgreementsDisplay}
              </div>
              <div className="text-xs leading-[1.4] text-admin-muted">
                {chartNote}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTimePeriod(period)}
                  className={`cursor-pointer rounded-sm border-0 px-3 py-1.5 text-[13px] font-medium capitalize ${
                    timePeriod === period
                      ? 'bg-accent text-accent-on'
                      : 'bg-transparent text-admin-muted'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {chartData && chartData.length > 0 ? (
            <AgreementsBarChart data={chartData} />
          ) : (
            <div className="flex h-[168px] items-center justify-center text-sm text-admin-muted">
              No data available
            </div>
          )}
        </div>

        {warnings && warnings.summary.totalWarnings > 0 && (
          <div className="mb-7">
            <div className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-lg font-bold text-admin-text">
                  Attention required
                </h3>
                <div className={`rounded-sm px-3 py-1 text-xs font-semibold text-accent-on ${attentionTone}`}>
                  {warnings.summary.totalWarnings}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {warnings.warnings.slice(0, 5).map((warning) => {
                  const severe = warning.warningType === 'expiration' || warning.warningType === 'critical';
                  return (
                    <div
                      key={warning.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push('/admin/agreements')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push('/admin/agreements');
                        }
                      }}
                      className="cursor-pointer rounded-sm border border-admin-hairline bg-admin-bg p-3 transition-colors duration-200 hover:bg-admin-surface-raised"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-sm">
                          {warning.warningType === 'expiration' ? (
                            <UIcon name="clock" className="text-warn" />
                          ) : warning.warningType === 'critical' ? (
                            <UIcon name="siren" className="text-alert" />
                          ) : (
                            <UIcon name="circle-exclamation" className="text-warn" />
                          )}
                        </span>
                        <span className="text-sm font-semibold text-admin-text">
                          {warning.client.firstName} {warning.client.lastName}
                        </span>
                        <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-accent-on ${
                          severe ? 'bg-alert' : 'bg-warn'
                        }`}>
                          {warning.warningType === 'expiration' ? 'EXPIRING' :
                            warning.warningType === 'critical' ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </div>
                      <div className="mb-1 text-xs text-admin-muted">
                        {warning.template.title}
                      </div>
                      <div className="text-[11px] text-admin-muted">
                        {warning.warningType === 'expiration'
                          ? `Expires in ${warning.hoursUntilExpiry}h`
                          : `Sent ${warning.daysSinceSent}d ago`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <FollowupsDryRunCard className={cardClass} />
        <CalendarFeedCard className={cardClass} />
      </div>
    </div>
  );
}
