import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';
import { z } from 'zod';

// Fallback PDF generation using HTML to PDF conversion
const generateFallbackPDF = async (htmlContent: string, clientName: string, clientEmail: string, agreementId: string) => {
  // For now, return a simple text-based response
  // In production, you might want to use a service like PDFShift, HTML/CSS to PDF API, or similar
  const textContent = `
AGREEMENT - ${clientName}
Email: ${clientEmail}
Agreement ID: ${agreementId}
Generated: ${new Date().toLocaleDateString()}

${htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}

This is a text version of the agreement. For a properly formatted PDF, please contact support.
  `;
  
  return Buffer.from(textContent, 'utf-8');
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
              font-size: 12px;
              line-height: 1.4;
              margin-bottom: 20px;
            }
            .signature-section {
              margin-top: 30px;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              page-break-inside: avoid;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              width: 250px;
              margin: 15px 0 5px 0;
            }
            .signature-label {
              font-size: 10px;
              color: #666;
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
            <p><strong>Digital Signature:</strong></p>
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <p style="margin-top: 20px;">
              <strong>Name:</strong> ${agreement.client.firstName} ${agreement.client.lastName}<br>
              <strong>Email:</strong> ${agreement.client.email}<br>
              <strong>Date & Time Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}<br>
              <strong>IP Address:</strong> ${agreement.signedFromIP || 'N/A'}<br>
              <strong>Agreement ID:</strong> ${agreement.id}
            </p>
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
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
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
        agreement.id
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
