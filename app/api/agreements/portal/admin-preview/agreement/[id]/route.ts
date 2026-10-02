import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { isSigned } from '@/lib/agreementStatus';
import { displayPaymentStatus } from '@/lib/paymentStatus';

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
        signatures: { orderBy: { signedAt: 'asc' } },
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

    // Determine which HTML content to use (priority: mergedHtml > customHtmlContent > template.htmlContent)
    // Process HTML content
    let processedHtml;
    const htmlToProcess = isSigned(agreement.status) && agreement.mergedHtml
      ? agreement.mergedHtml
      : (agreement.customHtmlContent || agreement.template.htmlContent);

    if (isSigned(agreement.status) && agreement.mergedHtml) {
      processedHtml = agreement.mergedHtml;
    } else {
      processedHtml = processHtmlContent(
        htmlToProcess,
        agreement.client,
        agreement.id,
        agreement.event,
        pickSecondSigner(agreement),
      );
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
        paymentStatus: displayPaymentStatus(agreement.paymentStatus),
        stripePaymentLink: agreement.stripePaymentLink,
        stripeReceiptLink: agreement.stripeReceiptLink,
        galleryLink: agreement.galleryLink,
        galleryLinks: (() => {
          const gl = agreement.galleryLinks as Array<{ title: string; url: string }> | null;
          if (Array.isArray(gl) && gl.length > 0) {
            return gl.filter((g: any) => g?.url?.trim());
          }
          return agreement.galleryLink ? [{ title: 'Photo Gallery', url: agreement.galleryLink }] : [];
        })(),
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


