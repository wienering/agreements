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

    // Create a properly formatted PDF using a simple approach
    // This creates a valid PDF structure
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 2000
>>
stream
BT
/F1 12 Tf
50 750 Td
(AGREEMENT DOCUMENT) Tj
0 -20 Td
(Photobooth Guys - Service Agreement) Tj
0 -30 Td
(Client Information:) Tj
0 -15 Td
(Name: ${agreement.client.firstName} ${agreement.client.lastName}) Tj
0 -15 Td
(Email: ${agreement.client.email}) Tj
0 -15 Td
(Phone: ${agreement.client.phone || 'Not provided'}) Tj
0 -15 Td
(Event Date: ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : 'Not specified'}) Tj
0 -30 Td
(Event Details:) Tj
0 -15 Td
(Event Type: ${agreement.client.eventType || 'Not specified'}) Tj
0 -15 Td
(Location: ${agreement.client.eventLocation || 'Not specified'}) Tj
0 -15 Td
(Start Time: ${agreement.client.eventStartTime || 'Not specified'}) Tj
0 -15 Td
(Duration: ${agreement.client.eventDuration || 'Not specified'}) Tj
0 -15 Td
(Package: ${agreement.client.eventPackage || 'Not specified'}) Tj
0 -30 Td
(Agreement Content:) Tj
0 -15 Td
(${plainText.substring(0, 200)}...) Tj
0 -30 Td
(Digital Signature:) Tj
0 -15 Td
(This agreement has been digitally signed by:) Tj
0 -15 Td
(Name: ${agreement.client.firstName} ${agreement.client.lastName}) Tj
0 -15 Td
(Email: ${agreement.client.email}) Tj
0 -15 Td
(Date Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}) Tj
0 -15 Td
(Agreement ID: ${agreement.id}) Tj
0 -15 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -30 Td
(This document is legally binding and represents the complete agreement between the parties.) Tj
0 -15 Td
(Photobooth Guys) Tj
0 -15 Td
(Contact: info@photoboothguys.ca) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000002340 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
2400
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');

    // Return as proper PDF
    return new NextResponse(pdfBuffer, {
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
