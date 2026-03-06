import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSession } from '../../shared/auth';
import jsPDF from 'jspdf';

// Generate PDF using jsPDF (serverless-friendly)
const generatePDF = async (htmlContent: string, agreement: any): Promise<Buffer> => {
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
  const margin = 25;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = 25;

  // Helper function to add text with word wrapping
  const addText = (
    text: string,
    fontSize: number = 10,
    isBold: boolean = false,
    lineHeight: number = 7
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Add title
  addText('Agreement Document', 16, true, 10);
  yPosition += 5;

  // Add client info
  addText(`Client: ${agreement.client.firstName} ${agreement.client.lastName}`, 12, false);
  addText(`Agreement ID: ${agreement.id}`, 10, false);
  if (agreement.signedAt) {
    addText(`Signed: ${new Date(agreement.signedAt).toLocaleDateString()}`, 10, false);
  }
  yPosition += 10;

  // Add content
  addText(formattedText, 10, false);

  // Get PDF as buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
};

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

    // Get agreement details - verify ownership
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
        signature: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found', code: 'AGREEMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Process HTML content (use event when available, else client deprecated fields)
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = html;
      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;
      const address = event ? (event.eventLocation ?? '') : (client.address || '');
      const notes = event ? (event.notes ?? '') : (client.notes || '');

      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, address);
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, notes);
      
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Use saved snapshot for signed agreements, otherwise process in real-time
    // Use customHtmlContent if available, otherwise fall back to template.htmlContent
    let processedHtml;
    const htmlToProcess = agreement.status === 'SIGNED' && agreement.mergedHtml
      ? agreement.mergedHtml
      : (agreement.customHtmlContent || agreement.template.htmlContent);
    
    if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
      processedHtml = agreement.mergedHtml;
    } else {
      processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
    }

    // Generate PDF
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

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

