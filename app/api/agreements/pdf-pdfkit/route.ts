import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import PDFDocument from 'pdfkit';

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

    // Create PDF using PDFKit
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Wait for PDF to finish
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Add content to PDF
    doc.fontSize(20).text('AGREEMENT DOCUMENT', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text('Photobooth Guys - Service Agreement', { align: 'center' });
    doc.moveDown(2);

    // Client Information
    doc.fontSize(14).text('CLIENT INFORMATION:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
    doc.text(`Email: ${agreement.client.email}`);
    doc.text(`Phone: ${agreement.client.phone || 'Not provided'}`);
    doc.text(`Event Date: ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}`);
    doc.moveDown();

    // Event Details
    doc.fontSize(14).text('EVENT DETAILS:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Event Type: ${agreement.client.eventType || 'Not specified'}`);
    doc.text(`Location: ${agreement.client.eventLocation || 'Not specified'}`);
    doc.text(`Start Time: ${agreement.client.eventStartTime || 'Not specified'}`);
    doc.text(`Duration: ${agreement.client.eventDuration || 'Not specified'}`);
    doc.text(`Package: ${agreement.client.eventPackage || 'Not specified'}`);
    doc.moveDown();

    // Agreement Content
    doc.fontSize(14).text('AGREEMENT CONTENT:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(plainText, { align: 'justify' });
    doc.moveDown(2);

    // Digital Signature
    doc.fontSize(14).text('DIGITAL SIGNATURE:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text('This agreement has been digitally signed by:');
    doc.moveDown(0.5);
    doc.text(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
    doc.text(`Email: ${agreement.client.email}`);
    doc.text(`Date Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}`);
    doc.text(`Agreement ID: ${agreement.id}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(10).text('This document is legally binding and represents the complete agreement between the parties.', { align: 'center' });
    doc.moveDown();
    doc.text('Photobooth Guys', { align: 'center' });
    doc.text('Contact: info@photoboothguys.ca', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    const pdfBuffer = await pdfPromise;

    // Return as proper PDF
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.pdf"`,
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
