import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get revenue data
    const revenueData = await prisma.agreement.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        archived: false,
        OR: [
          { status: 'SIGNED' },
          { status: 'COMPLETED' },
          { status: 'LIVE' }
        ]
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        signedAt: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        template: {
          select: {
            title: true
          }
        }
      }
    });

    // Calculate totals (using default values for now)
    const totalRevenue = revenueData.reduce((sum, agreement) => {
      return sum + 0; // Default to 0 until revenue fields are added
    }, 0);

    const signedRevenue = revenueData
      .filter(a => a.status === 'SIGNED' || a.status === 'COMPLETED')
      .reduce((sum, agreement) => {
        return sum + 0; // Default to 0 until revenue fields are added
      }, 0);

    const pendingRevenue = revenueData
      .filter(a => a.status === 'LIVE')
      .reduce((sum, agreement) => {
        return sum + 0; // Default to 0 until revenue fields are added
      }, 0);

    // Get average revenue per agreement
    const averageRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

    // Get revenue by status
    const revenueByStatus = {
      signed: signedRevenue,
      pending: pendingRevenue,
      total: totalRevenue
    };

    // Get top revenue clients
    const clientRevenue = revenueData.reduce((acc, agreement) => {
      const clientKey = agreement.client.email;
      if (!acc[clientKey]) {
        acc[clientKey] = {
          client: agreement.client,
          totalRevenue: 0,
          agreementCount: 0
        };
      }
      acc[clientKey].totalRevenue += 0; // Default to 0 until revenue fields are added
      acc[clientKey].agreementCount += 1;
      return acc;
    }, {} as any);

    const topClients = Object.values(clientRevenue)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        signed: signedRevenue,
        pending: pendingRevenue,
        average: averageRevenue,
        byStatus: revenueByStatus
      },
      topClients,
      timeRange: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      agreementCount: revenueData.length
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
