import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Signed agreement not found or has expired' 
      }, { status: 404 });
    }

    // Process smart fields in the HTML content
    const processHtmlContent = (html: string, client: any, agreementId: string) => {
      let processedHtml = html;
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
      
      // Replace event fields
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    const processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);

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
