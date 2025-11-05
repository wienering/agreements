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
        client: true
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

    // Check if client is loaded
    if (!session.client) {
      console.error('Session client not loaded:', sessionToken);
      return NextResponse.json({ 
        error: 'Client data not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 500 });
    }

    // Get query parameters for filtering and search
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause - use email to match all client records with same email
    const whereClause: any = {
      client: {
        email: session.client.email.toLowerCase(),
      },
      archived: false
    };

    // Add status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          template: {
            title: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          template: {
            internalTitle: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'template') {
      orderBy.template = { title: sortOrder };
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Get total count for pagination
    const totalCount = await prisma.agreement.count({
      where: whereClause
    });

    console.log(`[Dashboard] Client Email: ${session.client.email}, Total agreements: ${totalCount}`);

    // Get agreements with pagination
    const agreements = await prisma.agreement.findMany({
      where: whereClause,
      include: {
        template: true,
        signature: true,
        backdropLink: true,
        event: true
      },
      orderBy,
      skip: offset,
      take: limit
    });

    // Process HTML content for each agreement
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = html;
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, client.address || '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
      
      // Use event data if available, otherwise fall back to client event fields (backward compatibility)
      const eventDate = event?.eventDate || client.eventDate;
      const eventType = event?.eventType || client.eventType || '';
      const eventLocation = event?.eventLocation || client.eventLocation || '';
      const eventStartTime = event?.eventStartTime || client.eventStartTime || '';
      const eventDuration = event?.eventDuration || client.eventDuration || '';
      const eventPackage = event?.eventPackage || client.eventPackage || '';
      const packagePrice = event?.packagePrice || client.packagePrice;
      
      // Replace event fields - use event data if available, otherwise client fields
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    console.log(`[Dashboard] Found ${agreements.length} agreements for client email ${session.client.email}`);

    // Process agreements with HTML content
    const processedAgreements = agreements.map(agreement => {
      let processedHtml;
      
      if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
        processedHtml = agreement.mergedHtml;
      } else {
        processedHtml = processHtmlContent(agreement.template.htmlContent, session.client, agreement.id, agreement.event);
      }

      const client = {
        ...session.client,
        packagePrice: session.client.packagePrice ? Number(session.client.packagePrice) : null
      };

      const { internalTitle, ...publicTemplate } = agreement.template;

      return {
        id: agreement.id,
        status: agreement.status,
        uniqueToken: agreement.uniqueToken,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        signedAt: agreement.signedAt,
        expiresAt: agreement.expiresAt,
        viewCount: agreement.viewCount,
        firstViewedAt: agreement.firstViewedAt,
        lastViewedAt: agreement.lastViewedAt,
        paymentStatus: agreement.paymentStatus,
        stripePaymentLink: agreement.stripePaymentLink,
        stripeReceiptLink: agreement.stripeReceiptLink,
        galleryLink: agreement.galleryLink,
        nextAction: agreement.nextAction,
        backdropLink: agreement.backdropLink ? {
          id: agreement.backdropLink.id,
          name: agreement.backdropLink.name,
          url: agreement.backdropLink.url
        } : null,
        client: client,
        template: {
          ...publicTemplate,
          htmlContent: processedHtml
        },
        signature: agreement.signature,
        summary: {
          templateTitle: publicTemplate.title,
          status: agreement.status,
          createdAt: agreement.createdAt,
          signedAt: agreement.signedAt,
          expiresAt: agreement.expiresAt,
          isExpired: agreement.status !== 'SIGNED' && (agreement.expiresAt ? new Date() > agreement.expiresAt : false),
          canSign: agreement.status === 'DRAFT' || agreement.status === 'SENT',
          isSigned: agreement.status === 'SIGNED',
          daysUntilExpiry: agreement.expiresAt ? Math.ceil((agreement.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
        }
      };
    });

    // Get status counts for filters - use email to match all client records
    const statusCounts = await prisma.agreement.groupBy({
      by: ['status'],
      where: {
        client: {
          email: session.client.email.toLowerCase(),
        },
        archived: false
      },
      _count: {
        status: true
      }
    });

    const statusSummary = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      agreements: processedAgreements,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      filters: {
        statusSummary,
        availableStatuses: ['DRAFT', 'SENT', 'SIGNED', 'VOID', 'LIVE', 'COMPLETED', 'CANCELLED']
      },
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
        eventPackage: session.client.eventPackage,
        packagePrice: session.client.packagePrice ? Number(session.client.packagePrice) : null,
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}