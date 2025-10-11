import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('🔍 API: Looking for agreement with token:', token);

    if (!token) {
      console.log('❌ API: No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        client: true,
        template: true
      }
    });

    console.log('📊 API: Agreement found:', !!agreement);

    if (!agreement) {
      console.log('❌ API: Agreement not found or expired');
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
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, client.packagePrice ? `$${Number(client.packagePrice).toFixed(2)}` : '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // For signed agreements, use the saved snapshot to prevent changes
    // For unsigned agreements, process the template in real-time
    let processedHtml;
    console.log('🔍 CLIENT API: Agreement status:', agreement.status);
    console.log('🔍 CLIENT API: Has mergedHtml:', !!agreement.mergedHtml);
    console.log('🔍 CLIENT API: mergedHtml length:', agreement.mergedHtml?.length || 0);
    console.log('🔍 CLIENT API: Template content length:', agreement.template.htmlContent?.length || 0);
    
    if (agreement.status === 'SIGNED') {
      if (agreement.mergedHtml && agreement.mergedHtml.trim().length > 0) {
        // Use the saved snapshot for signed agreements
        console.log('🔍 CLIENT API: Using saved snapshot for signed agreement');
        console.log('🔍 CLIENT API: Snapshot is different from template:', agreement.mergedHtml !== agreement.template.htmlContent);
        processedHtml = agreement.mergedHtml;
      } else {
        // Fallback: create snapshot now if it's missing (shouldn't happen)
        console.log('🔍 CLIENT API: WARNING - Signed agreement missing snapshot, creating one now');
        processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);
        
        // Save the snapshot for future use
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { mergedHtml: processedHtml }
        });
      }
    } else {
      // Process the template in real-time for unsigned agreements
      console.log('🔍 CLIENT API: Processing template in real-time for unsigned agreement');
      processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);
    }

    // Convert Decimal fields to numbers for JSON serialization
    const client = {
      ...agreement.client,
      packagePrice: agreement.client.packagePrice ? Number(agreement.client.packagePrice) : null
    };

    // Return the agreement with processed HTML
    // Only return public title to clients, not internal title
    const { internalTitle, ...publicTemplate } = agreement.template;
    return NextResponse.json({
      ...agreement,
      client,
      template: {
        ...publicTemplate,
        htmlContent: processedHtml
      }
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
