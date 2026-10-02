import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { loadDashboard } from '@/lib/analytics/dashboard';
import { GET as getAnalytics } from '../route';
import { GET as getLoadForecast } from '../load-forecast/route';
import { GET as getWarnings } from '../warnings/route';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    return await loadDashboard(request, {
      analytics: getAnalytics,
      loadForecast: getLoadForecast,
      warnings: getWarnings,
    });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard analytics' }, { status: 500 });
  }
}
