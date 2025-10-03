import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const pdfRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = pdfRequestSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        status: 'SIGNED' // Only allow PDF generation for signed agreements
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

    // Convert HTML to plain text for PDF
    const plainText = processedHtml
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // Create a simple text-based PDF content
    const pdfContent = `
AGREEMENT DOCUMENT
==================

Photobooth Guys - Service Agreement

Client Information:
------------------
Name: ${agreement.client.firstName} ${agreement.client.lastName}
Email: ${agreement.client.email}
Phone: ${agreement.client.phone || 'Not provided'}
Event Date: ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}

Event Details:
--------------
Event Type: ${agreement.client.eventType || 'Not specified'}
Location: ${agreement.client.eventLocation || 'Not specified'}
Start Time: ${agreement.client.eventStartTime || 'Not specified'}
Duration: ${agreement.client.eventDuration || 'Not specified'}
Package: ${agreement.client.eventPackage || 'Not specified'}

Agreement Content:
-----------------
${plainText}

Digital Signature:
-----------------
This agreement has been digitally signed by:
Name: ${agreement.client.firstName} ${agreement.client.lastName}
Email: ${agreement.client.email}
Date Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}

Agreement ID: ${agreement.id}
Generated: ${new Date().toLocaleDateString()}

This document is legally binding and represents the complete agreement between the parties.

---
Photobooth Guys
Contact: info@photoboothguys.ca
    `;

    // Convert to PDF-like format (plain text for now)
    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');

    // Return as text file for now (can be enhanced with actual PDF generation)
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.txt"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to generate PDF' 
    }, { status: 500 });
  }
}
