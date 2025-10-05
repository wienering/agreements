import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '365');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get client retention data
    const retentionData = await prisma.clientRetention.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        totalBookings: 'desc'
      }
    });

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

    // Calculate lifetime value
    const totalLifetimeValue = retentionData.reduce((sum, client) => sum + Number(client.totalRevenue), 0);
    const averageLifetimeValue = retentionData.length > 0 ? totalLifetimeValue / retentionData.length : 0;

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
    console.error('Retention analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
