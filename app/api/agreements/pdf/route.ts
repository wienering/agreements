import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jsPDF from 'jspdf';
import { z } from 'zod';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import { formatDateToronto, formatDateTimeToronto } from '@/lib/dates';

// Generate PDF using jsPDF (serverless-friendly)
const generatePDF = async (htmlContent: string, agreement: any, isSigned: boolean = false) => {
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
  const pageWidth = 215.9; // Letter width in mm
  const pageHeight = 279.4; // Letter height in mm
  const sideMargin = 30; // Wider side margins
  const topMargin = 25; // Top margin
  const bottomMargin = 15; // Smaller bottom margin
  const maxWidth = pageWidth - (sideMargin * 2);
  const maxYPosition = pageHeight - bottomMargin; // Maximum y position before new page
  let yPosition = topMargin; // Start below top margin

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > maxYPosition) { // Start new page if needed
        doc.addPage();
        yPosition = topMargin; // Reset to top margin
      }
      
      // Calculate x position based on alignment
      let xPosition = sideMargin;
      if (align === 'center') {
        xPosition = pageWidth / 2;
      } else if (align === 'right') {
        xPosition = pageWidth - sideMargin;
      }
      
      doc.text(line, xPosition, yPosition, { align });
      yPosition += fontSize * 0.4; // Line height
    });
  };

  // Header
  addText('AGREEMENT DOCUMENT', 20, true, 'center');
  yPosition += 5;
  addText('Photobooth Guys - Service Agreement', 14, true, 'center');
  yPosition += 10;

  // Add unsigned notice if agreement is not signed
  if (!isSigned) {
    addText('UNSIGNED DRAFT VERSION', 14, true, 'center');
    yPosition += 3;
    addText('This document is an unsigned draft and is NOT legally binding.', 10, false, 'center');
    yPosition += 3;
    addText('This version is provided for review purposes only. The agreement becomes legally binding only after it has been digitally signed by all parties.', 9, false, 'center');
    yPosition += 10;
  }

  // Client Information
  addText('CLIENT INFORMATION:', 12, true);
  yPosition += 3;
  addText(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  addText(`Email: ${agreement.client.email}`);
  addText(`Phone: ${agreement.client.phone || 'Not provided'}`);
  addText(`Event Date: ${agreement.client.eventDate ? formatDateToronto(agreement.client.eventDate) : 'Not specified'}`);
  yPosition += 8;

  // Agreement Content
  addText('AGREEMENT CONTENT:', 12, true);
  yPosition += 3;
  
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

  // Digital Signature section (only for signed agreements)
  if (isSigned) {
    addText('DIGITAL SIGNATURE:', 12, true);
    yPosition += 3;

    // List every recorded signature when available (multi-signer support);
    // fall back to the primary client + agreement.signedAt for legacy rows.
    const signatures: Array<{
      signerName: string;
      signerEmail: string;
      signedAt?: Date | string | null;
      ip?: string | null;
    }> = Array.isArray((agreement as any).signatures) && (agreement as any).signatures.length > 0
      ? (agreement as any).signatures
      : [
          {
            signerName: `${agreement.client.firstName} ${agreement.client.lastName}`,
            signerEmail: agreement.client.email,
            signedAt: agreement.signedAt,
            ip: agreement.signedFromIP,
          },
        ];

    addText(
      signatures.length > 1
        ? 'This agreement has been digitally signed by both parties:'
        : 'This agreement has been digitally signed by:'
    );
    yPosition += 2;

    signatures.forEach((s, idx) => {
      if (signatures.length > 1) {
        addText(`Signer ${idx + 1}:`, 10, true);
      }
      addText(`Name: ${s.signerName}`);
      addText(`Email: ${s.signerEmail}`);
      addText(
        `Date & Time Signed: ${s.signedAt ? formatDateTimeToronto(s.signedAt) : 'N/A'}`
      );
      addText(`IP Address: ${s.ip || 'N/A'}`);
      yPosition += 3;
    });

    addText(`Agreement ID: ${agreement.id}`);
    addText(`Generated: ${formatDateTimeToronto(new Date())}`);
    yPosition += 8;
  } else {
    // For unsigned agreements, just show agreement ID and generation date
    addText(`Agreement ID: ${agreement.id}`, 10, false);
    addText(`Generated: ${formatDateTimeToronto(new Date())}`, 10, false);
    yPosition += 8;
  }

  // Footer
  if (isSigned) {
    addText('This document is legally binding and represents the complete agreement between the parties.', 8, false, 'center');
  } else {
    addText('This is an unsigned draft version and is NOT legally binding.', 8, false, 'center');
  }
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

    // Find the agreement by token (allow both signed and unsigned)
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        OR: [
          { status: 'SIGNED' },
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        client: true,
        template: true,
        event: true,
        signatures: { orderBy: { signedAt: 'asc' } },
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found or has expired' 
      }, { status: 404 });
    }

    const isSigned = agreement.status === 'SIGNED';

    // Determine which HTML content to use (priority: mergedHtml > customHtmlContent > template.htmlContent)
    // For signed agreements, use the saved snapshot to prevent changes
    // For unsigned agreements, use customHtmlContent if available, otherwise template.htmlContent
    let processedHtml;
    const htmlToProcess = agreement.status === 'SIGNED' && agreement.mergedHtml
      ? agreement.mergedHtml
      : (agreement.customHtmlContent || agreement.template.htmlContent);
    
    if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
      // Use the saved snapshot for signed agreements
      processedHtml = agreement.mergedHtml;
    } else {
      // Process the content in real-time for unsigned agreements
      processedHtml = processHtmlContent(
        htmlToProcess,
        agreement.client,
        agreement.id,
        agreement.event,
        pickSecondSigner(agreement),
        { escapeValues: false },
      );
    }

    // Generate PDF using jsPDF (serverless-friendly)
    const pdfBuffer = await generatePDF(processedHtml, agreement, isSigned);

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
    return handleApiError(error, 'agreements/pdf');
  }
}
