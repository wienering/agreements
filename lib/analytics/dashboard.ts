import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export type DashboardSummary = {
  totalWarnings: number;
  yellowWarnings: number;
  redWarnings: number;
  expirationWarnings: number;
};

export type DashboardPayload = {
  overview: unknown;
  recentActivity: unknown[];
  upcomingEvents: unknown[];
  forecast: unknown[];
  warnings: unknown[];
  summary: DashboardSummary;
};

const EMPTY_SUMMARY: DashboardSummary = {
  totalWarnings: 0,
  yellowWarnings: 0,
  redWarnings: 0,
  expirationWarnings: 0,
};

function forwardRequest(
  request: NextRequest,
  pathname: string,
  params: Record<string, string>,
): NextRequest {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = '';
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: 'GET', headers: request.headers });
}

async function readJson(response: NextResponse): Promise<Record<string, unknown>> {
  const body = await response.json();
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asSummary(value: unknown): DashboardSummary {
  if (!value || typeof value !== 'object') return EMPTY_SUMMARY;
  const summary = value as Partial<DashboardSummary>;
  return {
    totalWarnings: summary.totalWarnings ?? 0,
    yellowWarnings: summary.yellowWarnings ?? 0,
    redWarnings: summary.redWarnings ?? 0,
    expirationWarnings: summary.expirationWarnings ?? 0,
  };
}

/**
 * Calls the existing analytics, load-forecast, and warnings handlers and
 * merges their JSON into one dashboard payload. The three routes stay as they are.
 */
export async function loadDashboard(
  request: NextRequest,
  handlers: {
    analytics: RouteHandler;
    loadForecast: RouteHandler;
    warnings: RouteHandler;
  },
): Promise<NextResponse> {
  const requestedPeriod = new URL(request.url).searchParams.get('period') || 'month';
  const period = requestedPeriod === 'week' || requestedPeriod === 'year' ? requestedPeriod : 'month';

  const [analyticsResponse, forecastResponse, warningsResponse] = await Promise.all([
    handlers.analytics(forwardRequest(request, '/api/analytics', { days: '7', period })),
    handlers.loadForecast(forwardRequest(request, '/api/analytics/load-forecast', { weeks: '12' })),
    handlers.warnings(forwardRequest(request, '/api/analytics/warnings', {})),
  ]);

  const failed = [analyticsResponse, forecastResponse, warningsResponse].find((response) => !response.ok);
  if (failed) return failed;

  const [analytics, forecast, warnings] = await Promise.all([
    readJson(analyticsResponse),
    readJson(forecastResponse),
    readJson(warningsResponse),
  ]);

  const payload: DashboardPayload = {
    overview: analytics.overview ?? null,
    recentActivity: asArray(analytics.recentActivity),
    upcomingEvents: asArray(analytics.upcomingEvents),
    forecast: asArray(forecast.forecast),
    warnings: asArray(warnings.warnings),
    summary: asSummary(warnings.summary),
  };

  return NextResponse.json(payload);
}
