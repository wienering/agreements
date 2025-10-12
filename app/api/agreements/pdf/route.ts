import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jsPDF from 'jspdf';
import { z } from 'zod';

// Generate PDF using jsPDF (serverless-friendly)
const generatePDF = async (htmlContent: string, agreement: any) => {
  // Convert HTML to plain text with proper formatting
  const convertHtmlToText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<b[^>]*>/gi, '')
      .replace(/<\/b>/gi, '')
      .replace(/<em[^>]*>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<i[^>]*>/gi, '')
      .replace(/<\/i>/gi, '')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/ \n/g, '\n');
  };

  const formattedText = convertHtmlToText(htmlContent);

  // Create PDF using jsPDF
  const doc = new jsPDF('p', 'mm', 'letter');
  
  // Set up fonts and margins
  const pageWidth = 210; // A4 width in mm
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = 20;

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFont(undefined, 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > 280) { // Start new page if needed
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition, { align });
      yPosition += fontSize * 0.4; // Line height
    });
  };

  // Header
  addText('AGREEMENT DOCUMENT', 20, true, 'center');
  yPosition += 5;
  addText('Photobooth Guys - Service Agreement', 14, true, 'center');
  yPosition += 10;

  // Client Information
  addText('CLIENT INFORMATION:', 12, true);
  yPosition += 2;
  addText(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  addText(`Email: ${agreement.client.email}`);
  addText(`Phone: ${agreement.client.phone || 'Not provided'}`);
  addText(`Event Date: ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}`);
  yPosition += 5;

  // Event Details
  addText('EVENT DETAILS:', 12, true);
  yPosition += 2;
  addText(`Event Type: ${agreement.client.eventType || 'Not specified'}`);
  addText(`Location: ${agreement.client.eventLocation || 'Not specified'}`);
  addText(`Start Time: ${agreement.client.eventStartTime || 'Not specified'}`);
  addText(`Duration: ${agreement.client.eventDuration || 'Not specified'}`);
  addText(`Package: ${agreement.client.eventPackage || 'Not specified'}`);
  yPosition += 5;

  // Agreement Content
  addText('AGREEMENT CONTENT:', 12, true);
  yPosition += 2;
  
  // Split text into lines and add each line with proper wrapping
  const lines = formattedText.split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      addText(line.trim());
    } else {
      yPosition += 3; // Extra space for empty lines
    }
  });
  yPosition += 10;

  // Digital Signature
  addText('DIGITAL SIGNATURE:', 12, true);
  yPosition += 2;
  addText('This agreement has been digitally signed by:');
  addText(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  addText(`Email: ${agreement.client.email}`);
  addText(`Date & Time Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}`);
  addText(`IP Address: ${agreement.signedFromIP || 'N/A'}`);
  addText(`Agreement ID: ${agreement.id}`);
  addText(`Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}`);
  yPosition += 10;

  // Footer
  addText('This document is legally binding and represents the complete agreement between the parties.', 8, false, 'center');
  addText('Photobooth Guys', 8, false, 'center');
  addText('Contact: info@photoboothguys.ca', 8, false, 'center');

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
};

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

    // For signed agreements, use the saved snapshot to prevent changes
    // For unsigned agreements, process the template in real-time
    let processedHtml;
    if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
      // Use the saved snapshot for signed agreements
      processedHtml = agreement.mergedHtml;
    } else {
      // Process the template in real-time for unsigned agreements
      processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);
    }

    // Generate PDF using jsPDF (serverless-friendly)
    const pdfBuffer = await generatePDF(processedHtml, agreement);

    // Return PDF as response
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
