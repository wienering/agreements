import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        expiresAt: {
          gte: new Date()
        }
      },
      include: {
        client: true,
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found or expired' }, { status: 404 });
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

    // Process the HTML content with smart fields
    const processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);

    // Return the agreement with processed HTML
    return NextResponse.json({
      ...agreement,
      template: {
        ...agreement.template,
        htmlContent: processedHtml
      }
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
