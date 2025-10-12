import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import PDFDocument from 'pdfkit';
import { z } from 'zod';

// Fallback PDF generation using PDFKit
const generateFallbackPDF = async (htmlContent: string, clientName: string, clientEmail: string, agreementId: string, agreement: any) => {
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

  // Create PDF using PDFKit
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: {
      top: 36,
      bottom: 36,
      left: 36,
      right: 36
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

  // Add header
  doc.fontSize(20).font('Helvetica-Bold').text('AGREEMENT DOCUMENT', { align: 'center' });
  doc.moveDown(0.5);
  
  doc.fontSize(14).text('Photobooth Guys - Service Agreement', { align: 'center' });
  doc.moveDown(1.5);

  // Client Information
  doc.fontSize(12).text('CLIENT INFORMATION:', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  doc.text(`Email: ${agreement.client.email}`);
  doc.text(`Phone: ${agreement.client.phone || 'Not provided'}`);
  doc.text(`Event Date: ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}`);
  doc.moveDown(0.5);

  // Event Details
  doc.fontSize(12).text('EVENT DETAILS:', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Event Type: ${agreement.client.eventType || 'Not specified'}`);
  doc.text(`Location: ${agreement.client.eventLocation || 'Not specified'}`);
  doc.text(`Start Time: ${agreement.client.eventStartTime || 'Not specified'}`);
  doc.text(`Duration: ${agreement.client.eventDuration || 'Not specified'}`);
  doc.text(`Package: ${agreement.client.eventPackage || 'Not specified'}`);
  doc.moveDown(0.5);

  // Agreement Content
  doc.fontSize(12).text('AGREEMENT CONTENT:', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10);
  
  // Split text into lines and add each line separately to ensure proper line breaks
  const lines = formattedText.split('\n');
  lines.forEach((line, index) => {
    if (line.trim()) {
      doc.text(line.trim(), { align: 'justify' });
      if (index < lines.length - 1) {
        doc.moveDown(0.2);
      }
    } else {
      doc.moveDown(0.3);
    }
  });
  doc.moveDown(1);

  // Digital Signature
  doc.fontSize(12).text('DIGITAL SIGNATURE:', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).text('This agreement has been digitally signed by:');
  doc.moveDown(0.3);
  doc.text(`Name: ${agreement.client.firstName} ${agreement.client.lastName}`);
  doc.text(`Email: ${agreement.client.email}`);
  doc.text(`Date & Time Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}`);
  doc.text(`IP Address: ${agreement.signedFromIP || 'N/A'}`);
  doc.text(`Agreement ID: ${agreement.id}`);
  doc.text(`Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}`);
  doc.moveDown(0.5);

  doc.fontSize(8).text('This document is legally binding and represents the complete agreement between the parties.', { align: 'center' });
  doc.moveDown(0.3);
  doc.text('Photobooth Guys', { align: 'center' });
  doc.text('Contact: info@photoboothguys.ca', { align: 'center' });

  // Finalize PDF
  doc.end();

  // Wait for PDF to be generated
  return await pdfPromise;
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

    // Create a complete HTML document for PDF generation
    const htmlDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Agreement - ${agreement.client.firstName} ${agreement.client.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.4;
              margin: 0;
              padding: 0.5in;
              color: #333;
              background: white;
              font-size: 12px;
              max-width: 7.5in;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #333;
              padding-bottom: 15px;
              page-break-inside: avoid;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #333;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
              color: #666;
            }
            .client-info, .event-info {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .client-info h3, .event-info h3 {
              font-size: 14px;
              margin: 0 0 8px 0;
              color: #3b82f6;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 11px;
            }
            .info-item {
              margin-bottom: 3px;
            }
            .info-label {
              font-weight: bold;
              display: inline-block;
              width: 80px;
            }
            .agreement-content {
              font-size: 11px;
              line-height: 1.6;
              margin-bottom: 20px;
              text-align: justify;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: anywhere;
              max-width: 100%;
              word-break: break-word;
            }
            .agreement-content p {
              margin: 8px 0;
            }
            .agreement-content h1, .agreement-content h2, .agreement-content h3 {
              margin: 15px 0 8px 0;
              font-weight: bold;
            }
            .agreement-content ul, .agreement-content ol {
              margin: 8px 0;
              padding-left: 20px;
            }
            .agreement-content li {
              margin: 4px 0;
            }
            .agreement-content * {
              word-wrap: break-word;
              overflow-wrap: anywhere;
            }
            .signature-section {
              margin-top: 30px;
              border-top: 2px solid #333;
              padding: 20px;
              page-break-inside: avoid;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .signature-section h3 {
              margin: 0 0 15px 0;
              font-size: 14px;
              color: #333;
              text-decoration: underline;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 300px;
              margin: 15px 0 5px 0;
            }
            .signature-label {
              font-size: 11px;
              color: #555;
              font-weight: bold;
            }
            .signature-details {
              margin-top: 15px;
              font-size: 11px;
              line-height: 1.4;
            }
            .footer {
              margin-top: 20px;
              font-size: 10px;
              color: #666;
              text-align: center;
              page-break-inside: avoid;
            }
            @media print {
              body { margin: 0; padding: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Service Agreement</p>
          </div>
          
          <div class="client-info">
            <h3>Client Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name:</span> ${agreement.client.firstName} ${agreement.client.lastName}
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span> ${agreement.client.email}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${agreement.client.phone || 'Not provided'}
              </div>
              <div class="info-item">
                <span class="info-label">Event Date:</span> ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}
              </div>
            </div>
          </div>
          
          <div class="event-info">
            <h3>Event Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Type:</span> ${agreement.client.eventType || 'Not specified'}
              </div>
              <div class="info-item">
                <span class="info-label">Location:</span> ${agreement.client.eventLocation || 'Not specified'}
              </div>
              <div class="info-item">
                <span class="info-label">Start Time:</span> ${agreement.client.eventStartTime || 'Not specified'}
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span> ${agreement.client.eventDuration || 'Not specified'}
              </div>
              <div class="info-item">
                <span class="info-label">Package:</span> ${agreement.client.eventPackage || 'Not specified'}
              </div>
            </div>
          </div>
          
          <div class="agreement-content">
            ${processedHtml}
          </div>
          
          <div class="signature-section">
            <h3>Digital Signature Details</h3>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <div class="signature-details">
              <p><strong>Name:</strong> ${agreement.client.firstName} ${agreement.client.lastName}</p>
              <p><strong>Email:</strong> ${agreement.client.email}</p>
              <p><strong>Date & Time Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
              <p><strong>IP Address:</strong> ${agreement.signedFromIP || 'N/A'}</p>
              <p><strong>Agreement ID:</strong> ${agreement.id}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This document was digitally signed and is legally binding.</p>
            <p>Agreement ID: ${agreement.id} | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;

    // Try to generate PDF using Puppeteer, fallback to text if it fails
    let pdfBuffer: Buffer;
    
    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlDocument, { waitUntil: 'networkidle0' });
      
             const pdfData = await page.pdf({
               format: 'Letter', // 8.5x11 inches
               margin: {
                 top: '0.5in',
                 right: '0.5in',
                 bottom: '0.5in',
                 left: '0.5in'
               },
               printBackground: true,
               preferCSSPageSize: false,
               displayHeaderFooter: false
             });
      pdfBuffer = Buffer.from(pdfData);
      
      await browser.close();
    } catch (puppeteerError) {
      console.warn('Puppeteer failed, using fallback PDF generation:', puppeteerError);
      // Use fallback PDF generation
      pdfBuffer = await generateFallbackPDF(
        processedHtml, 
        `${agreement.client.firstName} ${agreement.client.lastName}`, 
        agreement.client.email, 
        agreement.id,
        agreement
      );
    }

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
