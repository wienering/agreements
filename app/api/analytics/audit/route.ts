import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const agreementId = searchParams.get('agreementId');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get audit logs
    const whereClause: any = {
      createdAt: {
        gte: startDate
      }
    };

    if (agreementId) {
      whereClause.agreementId = agreementId;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        agreement: {
          select: {
            id: true,
            uniqueToken: true,
            status: true,
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Get signature audit data
    const signatureAudit = await prisma.agreement.findMany({
      where: {
        signedAt: {
          gte: startDate
        },
        archived: false
      },
      select: {
        id: true,
        uniqueToken: true,
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
      },
      orderBy: {
        signedAt: 'desc'
      }
    });

    // Calculate audit metrics
    const totalActions = auditLogs.length;
    const signatureCount = signatureAudit.length;
    const viewCount = auditLogs.filter(log => log.action === 'viewed').length;
    const signCount = auditLogs.filter(log => log.action === 'signed').length;

    // Get action breakdown
    const actionBreakdown = auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      audit: {
        totalActions,
        signatureCount,
        viewCount,
        signCount,
        actionBreakdown
      },
      logs: auditLogs,
      signatureAudit,
      timeRange: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Audit analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit data' },
      { status: 500 }
    );
  }
}
