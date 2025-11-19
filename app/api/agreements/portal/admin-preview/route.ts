import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin email
    const isAdmin = session.user.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const clientId = searchParams.get('clientId');

    if (!email && !clientId) {
      return NextResponse.json({ error: 'Either email or clientId is required' }, { status: 400 });
    }

    // Find the client by email or ID (preferably by email to match all clients with that email)
    let client;
    if (email) {
      client = await prisma.client.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });
    } else {
      client = await prisma.client.findUnique({
        where: {
          id: clientId!,
        },
      });
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get query parameters for filtering and search (same as dashboard)
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
        email: client.email.toLowerCase(),
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

    // Process HTML content for each agreement (same logic as dashboard)
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = html;
      
      // Extract address and notes from event if available, otherwise use client data
      const address = event ? (event.eventLocation ?? '') : (client.address || '');
      const notes = event ? (event.notes ?? '') : (client.notes || '');
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, address);
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, notes);
      
      // Use event data exclusively when event exists, otherwise fall back to client event fields (backward compatibility)
      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;
      
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

    // Process agreements with HTML content
    const processedAgreements = agreements.map(agreement => {
      let processedHtml;
      
      // Use customHtmlContent if available, otherwise fall back to template.htmlContent
      const htmlToProcess = agreement.status === 'SIGNED' && agreement.mergedHtml
        ? agreement.mergedHtml
        : (agreement.customHtmlContent || agreement.template.htmlContent);
      
      if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
        processedHtml = agreement.mergedHtml;
      } else {
        processedHtml = processHtmlContent(htmlToProcess, client, agreement.id, agreement.event);
      }

      const processedClient = {
        ...client,
        packagePrice: client.packagePrice ? Number(client.packagePrice) : null
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
        client: processedClient,
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
        },
        event: agreement.event ? {
          eventName: agreement.event.eventName,
          eventDate: agreement.event.eventDate
        } : null
      };
    });

    // Get status counts for filters
    const statusCounts = await prisma.agreement.groupBy({
      by: ['status'],
      where: {
        client: {
          email: client.email.toLowerCase(),
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
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        phoneAddedAt: client.phoneAddedAt,
        addressAddedAt: client.addressAddedAt,
        eventDate: client.eventDate,
        eventType: client.eventType,
        eventLocation: client.eventLocation,
        eventPackage: client.eventPackage,
        packagePrice: client.packagePrice ? Number(client.packagePrice) : null,
      },
      isAdminPreview: true
    });

  } catch (error) {
    console.error('Error in admin portal preview:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch portal data',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
