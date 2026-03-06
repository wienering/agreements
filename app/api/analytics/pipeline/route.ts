import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get agreement counts by status
    const statusCounts = await prisma.agreement.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        },
        archived: false
      },
      _count: {
        id: true
      }
    });

    // Get conversion rates between statuses
    const conversions = await prisma.agreement.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        archived: false
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastEmailedAt: true,
        signedAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate pipeline metrics
    const totalAgreements = conversions.length;
    const draftCount = statusCounts.find(s => s.status === 'DRAFT')?._count.id || 0;
    const liveCount = statusCounts.find(s => s.status === 'LIVE')?._count.id || 0;
    const signedCount = statusCounts.find(s => s.status === 'SIGNED')?._count.id || 0;
    const completedCount = statusCounts.find(s => s.status === 'COMPLETED')?._count.id || 0;
    const cancelledCount = statusCounts.find(s => s.status === 'CANCELLED')?._count.id || 0;

    // Calculate conversion rates
    const draftToLiveRate = totalAgreements > 0 ? ((liveCount + signedCount + completedCount) / totalAgreements) * 100 : 0;
    const liveToSignedRate = (liveCount + signedCount + completedCount) > 0 ? (signedCount / (liveCount + signedCount + completedCount)) * 100 : 0;
    const signedToCompletedRate = signedCount > 0 ? (completedCount / signedCount) * 100 : 0;

    // Calculate average times between stages
    const sentAgreements = conversions.filter(a => a.lastEmailedAt);
    const signedAgreements = conversions.filter(a => a.signedAt);
    
    const avgTimeToSign = sentAgreements.length > 0 
      ? sentAgreements.reduce((acc, agreement) => {
          if (agreement.signedAt && agreement.lastEmailedAt) {
            const timeDiff = new Date(agreement.signedAt).getTime() - new Date(agreement.lastEmailedAt).getTime();
            return acc + timeDiff;
          }
          return acc;
        }, 0) / sentAgreements.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Get recent activity for timeline
    const recentActivity = await prisma.agreement.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        archived: false
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastEmailedAt: true,
        signedAt: true,
        updatedAt: true,
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
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });

    // Create pipeline stages
    const pipelineStages = [
      {
        stage: 'Draft',
        count: draftCount,
        percentage: totalAgreements > 0 ? (draftCount / totalAgreements) * 100 : 0,
        color: '#6b7280',
        description: 'Agreements being prepared'
      },
      {
        stage: 'Sent',
        count: liveCount,
        percentage: totalAgreements > 0 ? (liveCount / totalAgreements) * 100 : 0,
        color: '#3b82f6',
        description: 'Sent to clients for review',
        conversionRate: draftToLiveRate
      },
      {
        stage: 'Signed',
        count: signedCount,
        percentage: totalAgreements > 0 ? (signedCount / totalAgreements) * 100 : 0,
        color: '#10b981',
        description: 'Digitally signed by clients',
        conversionRate: liveToSignedRate
      },
      {
        stage: 'Completed',
        count: completedCount,
        percentage: totalAgreements > 0 ? (completedCount / totalAgreements) * 100 : 0,
        color: '#8b5cf6',
        description: 'Events completed successfully',
        conversionRate: signedToCompletedRate
      }
    ];

    // Calculate drop-off points
    const dropOffs = [
      {
        from: 'Draft',
        to: 'Sent',
        dropOffRate: 100 - draftToLiveRate,
        count: draftCount - (liveCount + signedCount + completedCount)
      },
      {
        from: 'Sent',
        to: 'Signed',
        dropOffRate: 100 - liveToSignedRate,
        count: liveCount
      },
      {
        from: 'Signed',
        to: 'Completed',
        dropOffRate: 100 - signedToCompletedRate,
        count: signedCount - completedCount
      }
    ];

    return NextResponse.json({
      pipeline: {
        stages: pipelineStages,
        totalAgreements,
        dropOffs,
        metrics: {
          avgTimeToSign: Math.round(avgTimeToSign * 10) / 10,
          overallConversionRate: totalAgreements > 0 ? ((completedCount / totalAgreements) * 100) : 0,
          activeAgreements: draftCount + liveCount + signedCount,
          completedAgreements: completedCount
        }
      },
      recentActivity,
      timeRange: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Pipeline analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline analytics' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
