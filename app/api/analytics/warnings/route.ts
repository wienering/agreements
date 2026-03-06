import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    // Get agreements that were sent 3+ days ago and are still unsigned
    const yellowWarnings = await prisma.agreement.findMany({
      where: {
        lastEmailedAt: {
          lte: threeDaysAgo
        },
        status: {
          in: ['LIVE']
        },
        archived: false
      },
      select: {
        id: true,
        status: true,
        lastEmailedAt: true,
        expiresAt: true,
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
        lastEmailedAt: 'asc'
      }
    });

    // Get agreements that were sent 5+ days ago and are still unsigned
    const redWarnings = await prisma.agreement.findMany({
      where: {
        lastEmailedAt: {
          lte: fiveDaysAgo
        },
        status: {
          in: ['LIVE']
        },
        archived: false
      },
      select: {
        id: true,
        status: true,
        lastEmailedAt: true,
        expiresAt: true,
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
        lastEmailedAt: 'asc'
      }
    });

    // Get agreements expiring within 24 hours
    const expirationWarnings = await prisma.agreement.findMany({
      where: {
        expiresAt: {
          lte: oneDayFromNow,
          gte: now
        },
        status: {
          in: ['DRAFT', 'LIVE']
        },
        archived: false
      },
      select: {
        id: true,
        status: true,
        lastEmailedAt: true,
        expiresAt: true,
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
        expiresAt: 'asc'
      }
    });

    // Calculate days since sent for each warning
    type ProcessedWarning = {
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
    };

    const processWarnings = (warnings: any[]): ProcessedWarning[] => {
      return warnings.map(agreement => {
        const daysSinceSent = agreement.lastEmailedAt 
          ? Math.floor((now.getTime() - new Date(agreement.lastEmailedAt).getTime()) / (24 * 60 * 60 * 1000))
          : null;
        
        const hoursUntilExpiry = agreement.expiresAt
          ? Math.floor((new Date(agreement.expiresAt).getTime() - now.getTime()) / (60 * 60 * 1000))
          : null;

        return {
          ...agreement,
          daysSinceSent,
          hoursUntilExpiry,
          warningType: (hoursUntilExpiry !== null && hoursUntilExpiry <= 24 ? 'expiration' : 
                      daysSinceSent !== null && daysSinceSent >= 5 ? 'critical' : 'warning') as 'expiration' | 'critical' | 'warning'
        };
      });
    };

    const processedYellowWarnings = processWarnings(yellowWarnings);
    const processedRedWarnings = processWarnings(redWarnings);
    const processedExpirationWarnings = processWarnings(expirationWarnings);

    // Combine all warnings and deduplicate by agreement ID
    // Use a Map to ensure each agreement only appears once (prioritizing higher severity)
    const warningsMap = new Map<string, ProcessedWarning>();
    
    // Add warnings in priority order (expiration > critical > warning)
    // This ensures if an agreement matches multiple criteria, it gets the highest priority warning type
    // Process in reverse priority order so higher priority warnings are added first
    const priority: Record<'expiration' | 'critical' | 'warning', number> = { 
      expiration: 3, 
      critical: 2, 
      warning: 1 
    };
    
    [...processedExpirationWarnings, ...processedRedWarnings, ...processedYellowWarnings].forEach(warning => {
      const existing = warningsMap.get(warning.id);
      if (!existing) {
        warningsMap.set(warning.id, warning);
      } else {
        // If already exists, keep the one with higher priority
        if (priority[warning.warningType] > priority[existing.warningType]) {
          warningsMap.set(warning.id, warning);
        }
      }
    });

    // Convert map to array and sort by priority
    const allWarnings = Array.from(warningsMap.values()).sort((a, b) => {
      // Expiration warnings first, then by days since sent
      if (a.warningType === 'expiration' && b.warningType !== 'expiration') return -1;
      if (b.warningType === 'expiration' && a.warningType !== 'expiration') return 1;
      if (a.warningType === 'critical' && b.warningType !== 'critical') return -1;
      if (b.warningType === 'critical' && a.warningType !== 'critical') return 1;
      return (a.daysSinceSent || 0) - (b.daysSinceSent || 0);
    });

    return NextResponse.json({
      warnings: allWarnings,
      summary: {
        totalWarnings: allWarnings.length,
        yellowWarnings: processedYellowWarnings.length,
        redWarnings: processedRedWarnings.length,
        expirationWarnings: processedExpirationWarnings.length
      }
    });

  } catch (error) {
    console.error('Warnings analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warning data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
