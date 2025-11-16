import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: agreementId } = await params;

    if (!email && !clientId) {
      return NextResponse.json({ error: 'Either email or clientId is required' }, { status: 400 });
    }

    // Find the client by email or ID
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

    // Get agreement details - use email to match all client records with same email
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        client: {
          email: client.email.toLowerCase(),
        }
      },
      include: {
        client: true,
        template: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        signature: true,
        backdropLink: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found', code: 'AGREEMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Process HTML content
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      if (!html || !client) return html;
      
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
      
      // Use event data exclusively when event exists, otherwise fall back to client event fields
      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;
      
      // Replace event fields
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

    // Process HTML content
    let processedHtml;
    if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
      processedHtml = agreement.mergedHtml;
    } else {
      processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id, agreement.event);
    }

    // Convert Decimal fields to numbers for JSON serialization
    const processedClient = {
      ...agreement.client,
      packagePrice: agreement.client.packagePrice ? Number(agreement.client.packagePrice) : null
    };

    // Return agreement data (only return public title, not internal title)
    const { internalTitle, ...publicTemplate } = agreement.template;
    
    return NextResponse.json({
      agreement: {
        id: agreement.id,
        uniqueToken: agreement.uniqueToken,
        status: agreement.status,
        expiresAt: agreement.expiresAt?.toISOString() || null,
        createdAt: agreement.createdAt.toISOString(),
        signedAt: agreement.signedAt?.toISOString() || null,
        cancelledAt: agreement.cancelledAt?.toISOString() || null,
        firstViewedAt: agreement.firstViewedAt?.toISOString() || null,
        lastViewedAt: agreement.lastViewedAt?.toISOString() || null,
        viewCount: agreement.viewCount,
        templateName: publicTemplate.title,
        mergedHtml: processedHtml,
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
        selectedBackdropName: agreement.selectedBackdropName,
        notes: agreement.notes.map(note => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt.toISOString()
        }))
      },
      client: {
        id: processedClient.id,
        firstName: processedClient.firstName,
        lastName: processedClient.lastName,
        email: processedClient.email,
        phone: processedClient.phone,
        address: processedClient.address,
        phoneAddedAt: processedClient.phoneAddedAt?.toISOString() || null,
        addressAddedAt: processedClient.addressAddedAt?.toISOString() || null,
        eventDate: processedClient.eventDate?.toISOString() || null,
        eventType: processedClient.eventType,
        eventLocation: processedClient.eventLocation,
        eventStartTime: processedClient.eventStartTime,
        eventDuration: processedClient.eventDuration,
        eventPackage: processedClient.eventPackage,
        packagePrice: processedClient.packagePrice
      },
      isAdminPreview: true
    });

  } catch (error) {
    console.error('Error fetching agreement details in admin preview:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}


