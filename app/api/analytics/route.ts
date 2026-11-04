import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import {
  addTorontoCalendarDays,
  addTorontoCalendarDaysFrom,
  formatDateToronto,
  getTorontoDateParts,
  resolveAgreementEventDate,
  torontoCalendarDaysBetween,
  torontoDateKey,
  torontoMidnightUtc,
  torontoMonthKey,
  torontoStartOfTodayUtc,
} from '@/lib/dates';

/** Booked events (not archived or cancelled), plus older agreements with no event, by event date. */
async function fetchAgreementEventDatesForChart(): Promise<Date[]> {
  const [events, legacy] = await Promise.all([
    prisma.event.findMany({
      where: { archived: false, status: { not: 'CANCELLED' }, eventDate: { not: null } },
      select: { eventDate: true },
    }),
    prisma.agreement.findMany({
      where: { archived: false, eventId: null },
      select: { client: { select: { eventDate: true } } },
    }),
  ]);
  return [
    ...events.map((row) => row.eventDate as Date),
    ...legacy.map((row) => resolveAgreementEventDate({ client: row.client })).filter((date): date is Date => date !== null),
  ];
}

export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    const period = searchParams.get('period') || 'month'; // week, month, or year
    
    // Get basic counts
    const [
      totalAgreements,
      totalClients,
      totalTemplates,
      draftAgreements,
      sentAgreements,
      signedAgreements,
      completedAgreements
    ] = await Promise.all([
      prisma.agreement.count(),
      prisma.client.count(),
      prisma.template.count(),
      prisma.agreement.count({ where: { status: 'DRAFT' } }),
      prisma.agreement.count({ where: { status: 'SENT' } }),
      prisma.agreement.count({ where: { status: 'SIGNED' } }),
      prisma.agreement.count({ where: { status: 'COMPLETED' } })
    ]);

    // Calculate conversion rate
    const conversionRate = totalAgreements > 0 ? Math.round((signedAgreements / totalAgreements) * 100) : 0;

    // Get recent agreements (last 30 Toronto calendar days)
    const thirtyDaysAgo = addTorontoCalendarDaysFrom(new Date(), -30);
    
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

    // Chart: non-archived agreements grouped by effective event date (Eastern Time).
    let chartData: Array<{ month: string; count: number }> = [];
    const eventDates = await fetchAgreementEventDatesForChart();

    if (period === 'week') {
      chartData = Array.from({ length: 7 }, (_, i) => {
        const bucketDate = addTorontoCalendarDaysFrom(new Date(), -(6 - i));
        const bucketKey = torontoDateKey(bucketDate);

        const count = eventDates.filter((date) => torontoDateKey(date) === bucketKey).length;

        return {
          month: formatDateToronto(bucketDate, { month: 'short', day: 'numeric' }),
          count,
        };
      });
    } else if (period === 'year') {
      const nowParts = getTorontoDateParts(new Date());
      let startYear = nowParts.year;
      let startMonth = nowParts.month - 11;
      while (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }

      chartData = Array.from({ length: 12 }, (_, i) => {
        let year = startYear;
        let month = startMonth + i;
        while (month > 11) {
          month -= 12;
          year += 1;
        }
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const labelDate = torontoMidnightUtc(year, month, 1);

        const count = eventDates.filter((date) => torontoMonthKey(date) === monthKey).length;

        return {
          month: formatDateToronto(labelDate, { month: 'short', year: 'numeric' }),
          count,
        };
      });
    } else {
      const nowParts = getTorontoDateParts(new Date());
      let startYear = nowParts.year;
      let startMonth = nowParts.month - 5;
      while (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }

      chartData = Array.from({ length: 6 }, (_, i) => {
        let year = startYear;
        let month = startMonth + i;
        while (month > 11) {
          month -= 12;
          year += 1;
        }
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const labelDate = torontoMidnightUtc(year, month, 1);

        const count = eventDates.filter((date) => torontoMonthKey(date) === monthKey).length;

        return {
          month: formatDateToronto(labelDate, { month: 'short', year: 'numeric' }),
          count,
        };
      });
    }

    const monthlyStats = chartData;

    // Get status distribution
    const statusDistribution = [
      { status: 'DRAFT', count: draftAgreements, color: '#9E2B2B' },
      { status: 'SENT', count: sentAgreements, color: '#2F6A4C' },
      { status: 'SIGNED', count: signedAgreements, color: '#2F6A4C' },
      { status: 'COMPLETED', count: completedAgreements, color: '#2C5878' }
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
    const currentPeriodStart = addTorontoCalendarDaysFrom(new Date(), -daysNum);
    const previousPeriodStart = addTorontoCalendarDaysFrom(currentPeriodStart, -daysNum);
    
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

    // Get upcoming events (next 14 calendar days including today) from agreements with DRAFT, SENT, or SIGNED status
    const startOfToday = torontoStartOfTodayUtc();
    const endOfRange = addTorontoCalendarDaysFrom(startOfToday, 13);
    const endOfRangeParts = getTorontoDateParts(endOfRange);
    const endOfRangeEnd = torontoMidnightUtc(
      ...(() => {
        const next = addTorontoCalendarDays(endOfRangeParts.year, endOfRangeParts.month, endOfRangeParts.day, 1);
        return [next.year, next.month, next.day] as [number, number, number];
      })(),
    );

    const eventDateInWindow = {
      gte: startOfToday,
      lt: endOfRangeEnd,
    };

    // Every upcoming booked event in the window, with or without an agreement.
    const upcomingEventRows = await prisma.event.findMany({
      where: { archived: false, status: 'UPCOMING', eventDate: eventDateInWindow },
      select: {
        id: true,
        eventDate: true,
        eventStartTime: true,
        eventType: true,
        eventLocation: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { eventDate: 'asc' },
      take: 100,
    });
    const todayKey = torontoDateKey(startOfToday);
    const endKey = torontoDateKey(endOfRange);
    const upcomingEvents = upcomingEventRows
      .filter((event) => {
        if (!event.eventDate) return false;
        const key = torontoDateKey(event.eventDate);
        return key >= todayKey && key <= endKey;
      })
      .map((event) => ({
        id: event.id,
        clientName: `${event.client.firstName} ${event.client.lastName}`,
        eventDate: (event.eventDate as Date).toISOString(),
        eventStartTime: event.eventStartTime,
        eventType: event.eventType,
        eventLocation: event.eventLocation,
        daysUntil: torontoCalendarDaysBetween(startOfToday, event.eventDate as Date),
      }));

    // If days parameter is provided, return simplified overview for admin page with trends
    if (days) {
      const activeStatusGroups = await prisma.agreement.groupBy({
        by: ['status'],
        where: { archived: false },
        _count: { id: true }
      });

      const ALL_STATUSES = [
        'DRAFT',
        'SENT',
        'SIGNED',
        'COMPLETED',
        'CANCELLED'
      ] as const;

      const countByStatus: Record<string, number> = Object.fromEntries(
        activeStatusGroups.map((g) => [g.status, g._count.id])
      );

      const byStatus = ALL_STATUSES.map((status) => ({
        status,
        count: countByStatus[status] ?? 0
      }));

      const activeAgreementsTotal = byStatus.reduce((sum, row) => sum + row.count, 0);

      return NextResponse.json({
        overview: {
          totalAgreements,
          totalClients,
          totalTemplates,
          signedAgreements,
          draftAgreements,
          sentAgreements,
          conversionRate,
          trends: {
            agreements: agreementsTrend,
            signed: signedTrend,
            clients: clientsTrend
          },
          monthlyStats, // Include for chart
          activeAgreements: {
            total: activeAgreementsTotal,
            byStatus
          }
        },
        recentActivity: recentAgreements.slice(0, 5), // Include recent activity
        upcomingEvents // Include upcoming events
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
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
