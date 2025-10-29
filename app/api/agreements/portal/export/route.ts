import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv, pdf
    const agreementId = searchParams.get('agreementId');
    const includeHtml = searchParams.get('includeHtml') === 'true';

    let agreements;

    if (agreementId) {
      // Export single agreement
      const agreement = await prisma.agreement.findFirst({
        where: {
          id: agreementId,
          clientId: session.client.id,
          archived: false
        },
        include: {
          template: true,
          signature: true
        }
      });

      if (!agreement) {
        return NextResponse.json({ 
          error: 'Agreement not found',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }

      agreements = [agreement];
    } else {
      // Export all agreements
      agreements = await prisma.agreement.findMany({
        where: {
          clientId: session.client.id,
          archived: false
        },
        include: {
          template: true,
          signature: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Process agreements for export
    const exportData = agreements.map(agreement => {
      const baseData = {
        id: agreement.id,
        status: agreement.status,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        signedAt: agreement.signedAt,
        expiresAt: agreement.expiresAt,
        viewCount: agreement.viewCount,
        templateTitle: agreement.template.title,
        templateVersion: agreement.template.version,
        clientInfo: {
          firstName: session.client.firstName,
          lastName: session.client.lastName,
          email: session.client.email,
          phone: session.client.phone,
          address: session.client.address,
          eventDate: session.client.eventDate,
          eventType: session.client.eventType,
          eventLocation: session.client.eventLocation,
          eventStartTime: session.client.eventStartTime,
          eventDuration: session.client.eventDuration,
          eventPackage: session.client.eventPackage,
          packagePrice: session.client.packagePrice ? Number(session.client.packagePrice) : null
        }
      };

      if (includeHtml) {
        // Process HTML content
        let processedHtml = agreement.status === 'SIGNED' && agreement.mergedHtml 
          ? agreement.mergedHtml 
          : processHtmlContent(agreement.template.htmlContent, session.client, agreement.id);
        
        return {
          ...baseData,
          htmlContent: processedHtml,
          rawHtmlContent: agreement.template.htmlContent
        };
      }

      return baseData;
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    // Return data based on format
    if (format === 'csv') {
      return generateCSVResponse(exportData);
    } else if (format === 'pdf') {
      return generatePDFResponse(exportData, session.client);
    } else {
      // Default JSON response
      return NextResponse.json({
        success: true,
        exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          clientId: session.client.id,
          clientName: `${session.client.firstName} ${session.client.lastName}`,
          totalAgreements: exportData.length,
          format: 'json'
        }
      });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ 
      error: 'Failed to export data',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

function processHtmlContent(html: string, client: any, agreementId: string): string {
  let processedHtml = html;
  
  // Replace client fields
  processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
  processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
  processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
  processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
  processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, client.address || '');
  processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString() : '');
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
  
  // Replace event fields
  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
  processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, client.packagePrice ? `$${Number(client.packagePrice).toFixed(2)}` : '');
  
  // Replace agreement fields
  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
  
  return processedHtml;
}

function generateCSVResponse(data: any[]): NextResponse {
  const headers = [
    'ID', 'Status', 'Template Title', 'Created At', 'Signed At', 'Expires At',
    'Client Name', 'Client Email', 'Client Phone', 'Event Date', 'Event Type',
    'Event Location', 'Package', 'Price', 'View Count'
  ];

  const csvRows = [
    headers.join(','),
    ...data.map(item => [
      item.id,
      item.status,
      `"${item.templateTitle}"`,
      item.createdAt,
      item.signedAt || '',
      item.expiresAt || '',
      `"${item.clientInfo.firstName} ${item.clientInfo.lastName}"`,
      item.clientInfo.email,
      item.clientInfo.phone || '',
      item.clientInfo.eventDate || '',
      item.clientInfo.eventType || '',
      `"${item.clientInfo.eventLocation || ''}"`,
      item.clientInfo.eventPackage || '',
      item.clientInfo.packagePrice || '',
      item.viewCount
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="agreements-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function generatePDFResponse(data: any[], client: any): NextResponse {
  // For now, return a simple text response
  // In production, you'd use a PDF library like puppeteer or pdfkit
  const pdfContent = `
AGREEMENTS EXPORT FOR ${client.firstName} ${client.lastName}
Generated: ${new Date().toLocaleString()}

${data.map((item, index) => `
${index + 1}. Agreement ID: ${item.id}
   Status: ${item.status}
   Template: ${item.templateTitle}
   Created: ${item.createdAt}
   Signed: ${item.signedAt || 'Not signed'}
   Expires: ${item.expiresAt || 'No expiration'}
`).join('\n')}
  `;

  return new NextResponse(pdfContent, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="agreements-export-${new Date().toISOString().split('T')[0]}.txt"`
    }
  });
}
