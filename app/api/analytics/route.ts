import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    
    // Get basic counts
    const [
      totalAgreements,
      totalClients,
      totalTemplates,
      draftAgreements,
      liveAgreements,
      signedAgreements,
      completedAgreements
    ] = await Promise.all([
      prisma.agreement.count(),
      prisma.client.count(),
      prisma.template.count(),
      prisma.agreement.count({ where: { status: 'DRAFT' } }),
      prisma.agreement.count({ where: { status: 'LIVE' } }),
      prisma.agreement.count({ where: { status: 'SIGNED' } }),
      prisma.agreement.count({ where: { status: 'COMPLETED' } })
    ]);

    // Calculate conversion rate
    const conversionRate = totalAgreements > 0 ? Math.round((signedAgreements / totalAgreements) * 100) : 0;

    // Get recent agreements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAgreements = await prisma.agreement.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        client: true,
        template: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get agreements by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await prisma.agreement.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    // Process monthly data
    const monthlyStats = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = monthlyData.filter(item => {
        const itemDate = new Date(item.createdAt);
        const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        return itemMonthKey === monthKey;
      });
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthData.reduce((sum, item) => sum + item._count.id, 0)
      };
    });

    // Get status distribution
    const statusDistribution = [
      { status: 'DRAFT', count: draftAgreements, color: '#dc2626' },
      { status: 'LIVE', count: liveAgreements, color: '#059669' },
      { status: 'SIGNED', count: signedAgreements, color: '#2563eb' },
      { status: 'COMPLETED', count: completedAgreements, color: '#7c3aed' }
    ];

    // Get top clients by agreement count
    const topClients = await prisma.client.findMany({
      include: {
        _count: {
          select: {
            agreements: true
          }
        }
      },
      orderBy: {
        agreements: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Get template usage
    const templateUsage = await prisma.template.findMany({
      include: {
        _count: {
          select: {
            agreements: true
          }
        }
      },
      orderBy: {
        agreements: {
          _count: 'desc'
        }
      }
    });

    // Calculate trends (compare current period vs previous period)
    const daysNum = days ? parseInt(days) : 7;
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - daysNum);
    
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysNum);
    
    // Get agreements for current period
    const currentPeriodAgreements = await prisma.agreement.count({
      where: {
        createdAt: {
          gte: currentPeriodStart
        }
      }
    });
    
    // Get agreements for previous period
    const previousPeriodAgreements = await prisma.agreement.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: currentPeriodStart
        }
      }
    });
    
    // Get signed agreements for both periods
    const currentPeriodSigned = await prisma.agreement.count({
      where: {
        signedAt: {
          gte: currentPeriodStart
        }
      }
    });
    
    const previousPeriodSigned = await prisma.agreement.count({
      where: {
        signedAt: {
          gte: previousPeriodStart,
          lt: currentPeriodStart
        }
      }
    });
    
    // Calculate trend percentages
    const agreementsTrend = previousPeriodAgreements > 0 
      ? Math.round(((currentPeriodAgreements - previousPeriodAgreements) / previousPeriodAgreements) * 100)
      : currentPeriodAgreements > 0 ? 100 : 0;
    
    const signedTrend = previousPeriodSigned > 0
      ? Math.round(((currentPeriodSigned - previousPeriodSigned) / previousPeriodSigned) * 100)
      : currentPeriodSigned > 0 ? 100 : 0;
    
    // Get recent clients count for trend
    const currentPeriodClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: currentPeriodStart
        }
      }
    });
    
    const previousPeriodClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: currentPeriodStart
        }
      }
    });
    
    const clientsTrend = previousPeriodClients > 0
      ? Math.round(((currentPeriodClients - previousPeriodClients) / previousPeriodClients) * 100)
      : currentPeriodClients > 0 ? 100 : 0;

    // If days parameter is provided, return simplified overview for admin page with trends
    if (days) {
      return NextResponse.json({
        overview: {
          totalAgreements,
          totalClients,
          totalTemplates,
          signedAgreements,
          draftAgreements,
          sentAgreements: liveAgreements, // Live agreements are "sent"
          conversionRate,
          trends: {
            agreements: agreementsTrend,
            signed: signedTrend,
            clients: clientsTrend
          },
          monthlyStats // Include for chart
        },
        recentActivity: recentAgreements.slice(0, 5) // Include recent activity
      });
    }

    const analytics = {
      overview: {
        totalAgreements,
        totalClients,
        totalTemplates,
        statusDistribution
      },
      recentActivity: recentAgreements,
      monthlyStats,
      topClients: topClients.map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        agreementCount: client._count.agreements
      })),
      templateUsage: templateUsage.map(template => ({
        id: template.id,
        title: template.title,
        usageCount: template._count.agreements
      }))
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
