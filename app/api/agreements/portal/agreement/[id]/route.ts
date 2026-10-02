import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { authenticateSession } from '../../shared/auth';
import { isSigned } from '@/lib/agreementStatus';
import { displayPaymentStatus } from '@/lib/paymentStatus';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate session
    const authResult = await authenticateSession(request);
    if (authResult.error) {
      return authResult.error;
    }

    const session = authResult.session;
    const sessionClient = session.client;

    const { id: agreementId } = await params;

    // Get agreement details - use email to match all client records with same email
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        client: {
          email: sessionClient.email.toLowerCase(),
        }
      },
      include: {
        client: true,
        template: true,
        event: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        signatures: { orderBy: { signedAt: 'asc' } },
        backdropLink: true
      }
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found', code: 'AGREEMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Process HTML content using processHtmlContent from shared utils
    const { processHtmlContent } = await import('../../shared/agreement-utils');
    
    // Determine which HTML content to use (priority: mergedHtml > customHtmlContent > template.htmlContent)
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

    // Return agreement data
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
        templateName: agreement.template.title,
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
        id: agreement.client.id,
        firstName: agreement.client.firstName,
        lastName: agreement.client.lastName,
        email: agreement.client.email,
        phone: agreement.client.phone,
        address: agreement.client.address,
        phoneAddedAt: agreement.client.phoneAddedAt?.toISOString() || null,
        addressAddedAt: agreement.client.addressAddedAt?.toISOString() || null,
        eventDate: agreement.client.eventDate?.toISOString() || null,
        eventType: agreement.client.eventType,
        eventLocation: agreement.client.eventLocation,
        eventStartTime: agreement.client.eventStartTime,
        eventDuration: agreement.client.eventDuration,
        eventPackage: agreement.client.eventPackage,
        packagePrice: agreement.client.packagePrice ? Number(agreement.client.packagePrice) : null
      }
    });

  } catch (error) {
    console.error('Error fetching agreement details:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
