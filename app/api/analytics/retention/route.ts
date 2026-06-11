import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { addTorontoCalendarDaysFrom } from '@/lib/dates';

export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '365');

    const startDate = addTorontoCalendarDaysFrom(new Date(), -days);

    // Get client retention data (simplified for now)
    const retentionData: any[] = []; // Empty array until ClientRetention model is added

    // Calculate retention metrics
    const totalClients = await prisma.client.count();
    const repeatClients = retentionData.filter(c => c.isRepeatClient).length;
    const retentionRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

    // Get new vs returning clients
    const newClients = retentionData.filter(c => c.totalBookings === 1).length;
    const returningClients = retentionData.filter(c => c.totalBookings > 1).length;

    // Calculate average bookings per client
    const averageBookings = retentionData.length > 0 
      ? retentionData.reduce((sum, client) => sum + client.totalBookings, 0) / retentionData.length 
      : 0;

    // Get top repeat clients
    const topRepeatClients = retentionData
      .filter(c => c.isRepeatClient)
      .slice(0, 5);

    // Calculate lifetime value (default values for now)
    const totalLifetimeValue = 0; // Default to 0 until ClientRetention model is added
    const averageLifetimeValue = 0; // Default to 0 until ClientRetention model is added

    return NextResponse.json({
      retention: {
        totalClients,
        repeatClients,
        retentionRate,
        newClients,
        returningClients,
        averageBookings,
        totalLifetimeValue,
        averageLifetimeValue
      },
      topRepeatClients,
      timeRange: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });

  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Retention analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention data' },
      { status: 500 }
    );
  }
}
