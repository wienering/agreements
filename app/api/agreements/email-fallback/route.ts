import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import { formatDateToronto } from '@/lib/dates';
import { getEmailGreeting } from '@/lib/email/greeting';

const emailFallbackSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  recipientEmail: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = emailFallbackSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        status: 'SIGNED' // Only allow email for signed agreements
      },
      include: {
        client: true,
        template: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Signed agreement not found or has expired' 
      }, { status: 404 });
    }

    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const processedHtml = processHtmlContent(
      htmlToProcess,
      agreement.client,
      agreement.id,
      agreement.event,
      pickSecondSigner(agreement),
      { escapeValues: false },
    );

    // Create a shareable link instead of sending email
    // Get the base URL from the request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const agreementUrl = `${baseUrl}/agreement/${validatedData.token}`;
    
    // Create a simple text version for sharing
    const shareableContent = `
AGREEMENT SHARING LINK
======================

Hello ${getEmailGreeting(agreement.client)},

Your signed agreement is ready! You can access it using the link below:

Agreement Link: ${agreementUrl}

Agreement Details:
- Client: ${agreement.client.firstName} ${agreement.client.lastName}
- Email: ${agreement.client.email}
- Date Signed: ${agreement.signedAt ? formatDateToronto(agreement.signedAt) : 'N/A'}
- Agreement ID: ${agreement.id}

You can:
1. View the agreement online
2. Download a PDF copy
3. Share this link with others

This link will remain active and can be used to access your agreement at any time.

Best regards,
Photobooth Guys
Contact: info@photoboothguys.ca
    `;

    return NextResponse.json({
      message: 'Agreement sharing link generated successfully',
      recipientEmail: validatedData.recipientEmail,
      shareableLink: agreementUrl,
      shareableContent: shareableContent,
      note: 'Email service is not configured. Use the shareable link above to access your agreement.'
    });

  } catch (error) {
    return handleApiError(error, 'agreements/email-fallback');
  }
}
