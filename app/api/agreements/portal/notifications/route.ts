import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: {
          include: {
            agreements: {
              where: {
                archived: false,
                expiresAt: {
                  gte: new Date() // Only non-expired agreements
                }
              },
              include: {
                template: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    const notifications = [];

    // Check for agreements expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringAgreements = session.client.agreements.filter(agreement => 
      agreement.expiresAt && 
      agreement.expiresAt <= sevenDaysFromNow &&
      agreement.status !== 'SIGNED' &&
      agreement.status !== 'CANCELLED'
    );

    if (expiringAgreements.length > 0) {
      notifications.push({
        id: 'expiring_agreements',
        type: 'warning',
        title: 'Agreements Expiring Soon',
        message: `${expiringAgreements.length} agreement(s) will expire within 7 days`,
        action: 'Review agreements',
        actionUrl: '/portal/dashboard?filter=expiring',
        createdAt: new Date(),
        priority: 'high'
      });
    }

    // Check for unsigned agreements
    const unsignedAgreements = session.client.agreements.filter(agreement => 
      agreement.status === 'DRAFT' || agreement.status === 'SENT'
    );

    if (unsignedAgreements.length > 0) {
      notifications.push({
        id: 'unsigned_agreements',
        type: 'info',
        title: 'Pending Agreements',
        message: `You have ${unsignedAgreements.length} agreement(s) waiting for your signature`,
        action: 'Sign agreements',
        actionUrl: '/portal/dashboard?filter=unsigned',
        createdAt: new Date(),
        priority: 'medium'
      });
    }

    // Check for missing client information
    const missingInfo = [];
    if (!session.client.phone) missingInfo.push('phone number');
    if (!session.client.address) missingInfo.push('address');

    if (missingInfo.length > 0) {
      notifications.push({
        id: 'missing_info',
        type: 'info',
        title: 'Complete Your Profile',
        message: `Please add your ${missingInfo.join(' and ')} to your profile`,
        action: 'Update profile',
        actionUrl: '/portal/profile',
        createdAt: new Date(),
        priority: 'low'
      });
    }

    // System notifications (could be stored in database)
    const systemNotifications = [
      {
        id: 'welcome_message',
        type: 'success',
        title: 'Welcome to Your Client Portal',
        message: 'You can now view all your agreements and manage your information in one place',
        action: 'Get started',
        actionUrl: '/portal/dashboard',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        priority: 'low',
        dismissible: true
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
      summary: {
        total: notifications.length,
        high: notifications.filter(n => n.priority === 'high').length,
        medium: notifications.filter(n => n.priority === 'medium').length,
        low: notifications.filter(n => n.priority === 'low').length
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notifications',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId || !action) {
      return NextResponse.json({ 
        error: 'Notification ID and action are required',
        code: 'MISSING_PARAMS'
      }, { status: 400 });
    }

    // Handle notification actions
    if (action === 'dismiss') {
      // In a real implementation, you'd store dismissed notifications
      // For now, just return success
      return NextResponse.json({
        success: true,
        message: 'Notification dismissed'
      });
    }

    if (action === 'mark_read') {
      // In a real implementation, you'd mark notification as read
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action',
      code: 'INVALID_ACTION'
    }, { status: 400 });

  } catch (error) {
    console.error('Error handling notification action:', error);
    return NextResponse.json({ 
      error: 'Failed to handle notification action',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
