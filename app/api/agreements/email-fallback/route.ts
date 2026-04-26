import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';

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

    // Process smart fields in the HTML content (use event when available, else client deprecated fields)
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));
      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;

      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, event ? (event.notes ?? client.notes ?? '') : (client.notes || ''));
      
      // Replace event fields
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Use customHtmlContent if available, otherwise fall back to template.htmlContent
    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);

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

Hello ${agreement.client.firstName},

Your signed agreement is ready! You can access it using the link below:

Agreement Link: ${agreementUrl}

Agreement Details:
- Client: ${agreement.client.firstName} ${agreement.client.lastName}
- Email: ${agreement.client.email}
- Date Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}
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

  } catch (error: any) {
    console.error('Error generating shareable link:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to generate shareable link' 
    }, { status: 500 });
  }
}
