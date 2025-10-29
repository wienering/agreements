import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'Session token required',
        code: 'MISSING_TOKEN'
      }, { status: 401 });
    }

    // Validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: {
          include: {
            agreements: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                templateName: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    // Generate smart notifications based on client data
    const notifications = [];

    // Check for missing information
    if (!session.client.phone) {
      notifications.push({
        id: 'missing-phone',
        type: 'info',
        priority: 'medium',
        title: 'Complete Your Profile',
        message: 'Add your phone number to complete your profile.',
        action: 'update-client-info',
        createdAt: new Date().toISOString()
      });
    }

    if (!session.client.address) {
      notifications.push({
        id: 'missing-address',
        type: 'info',
        priority: 'medium',
        title: 'Complete Your Profile',
        message: 'Add your address to complete your profile.',
        action: 'update-client-info',
        createdAt: new Date().toISOString()
      });
    }

    // Check for upcoming events (if eventDate is set)
    if (session.client.eventDate) {
      const eventDate = new Date(session.client.eventDate);
      const now = new Date();
      const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEvent <= 7 && daysUntilEvent > 0) {
        notifications.push({
          id: 'upcoming-event',
          type: 'reminder',
          priority: 'high',
          title: 'Event Reminder',
          message: `Your event is in ${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'}.`,
          action: 'view-agreements',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Check for pending agreements
    const pendingAgreements = session.client.agreements.filter(agreement => 
      agreement.status === 'pending' || agreement.status === 'draft'
    );

    if (pendingAgreements.length > 0) {
      notifications.push({
        id: 'pending-agreements',
        type: 'action',
        priority: 'high',
        title: 'Action Required',
        message: `You have ${pendingAgreements.length} agreement${pendingAgreements.length === 1 ? '' : 's'} pending your review.`,
        action: 'view-agreements',
        createdAt: new Date().toISOString()
      });
    }

    // Add system notifications if they haven't been dismissed
    const systemNotifications = [
      {
        id: 'welcome',
        type: 'welcome',
        priority: 'low',
        title: 'Welcome to Your Client Portal',
        message: 'You can view all your agreements and add missing information here.',
        action: 'dashboard',
        createdAt: new Date().toISOString()
      }
    ];

    // Add system notifications if they haven't been dismissed
    notifications.push(...systemNotifications);

    // Sort notifications by priority and date
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      notifications,
      client: {
        id: session.client.id,
        firstName: session.client.firstName,
        lastName: session.client.lastName,
        email: session.client.email,
        phone: session.client.phone,
        address: session.client.address,
        phoneAddedAt: session.client.phoneAddedAt,
        addressAddedAt: session.client.addressAddedAt,
        eventDate: session.client.eventDate,
        eventType: session.client.eventType,
        eventLocation: session.client.eventLocation,
        eventStartTime: session.client.eventStartTime,
        eventDuration: session.client.eventDuration,
        eventPackage: session.client.eventPackage,
        packagePrice: session.client.packagePrice,
        agreementCount: session.client.agreements.length
      },
      session: {
        expiresAt: session.expiresAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error getting notifications:', error);
    return NextResponse.json({ 
      error: 'Failed to get notifications',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
