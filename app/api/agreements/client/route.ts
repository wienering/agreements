import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    devLog('🔍 API: Looking for agreement with token:', token);

    if (!token) {
      devLog('❌ API: No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        OR: [
          { status: 'SIGNED' }, // Signed agreements bypass expiration
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        client: true,
        template: true,
        event: true
      }
    });

    devLog('📊 API: Agreement found:', !!agreement);

    if (!agreement) {
      devLog('❌ API: Agreement not found or expired');
      return NextResponse.json({ error: 'Agreement not found or expired' }, { status: 404 });
    }

    // Process smart fields in the HTML content
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));

      // Extract address and notes from event if available, otherwise use client data
      const address = event ? (event.eventLocation ?? '') : (client.address || '');
      const notes = event ? (event.notes ?? '') : (client.notes || '');

      processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, address);
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, notes);
      
      // Use event data exclusively when event exists, otherwise fall back to client event fields (backward compatibility)
      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;
      
      // Replace event fields - use event data if available, otherwise client fields
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Determine which HTML content to use (priority: mergedHtml > customHtmlContent > template.htmlContent)
    // For signed agreements, use the saved snapshot to prevent changes
    // For unsigned agreements, use customHtmlContent if available, otherwise template.htmlContent
    let processedHtml;
    const htmlToProcess = agreement.status === 'SIGNED' && agreement.mergedHtml
      ? agreement.mergedHtml
      : (agreement.customHtmlContent || agreement.template.htmlContent);
    
    devLog('🔍 CLIENT API: Agreement status:', agreement.status);
    devLog('🔍 CLIENT API: Has mergedHtml:', !!agreement.mergedHtml);
    devLog('🔍 CLIENT API: Has customHtmlContent:', !!agreement.customHtmlContent);
    devLog('🔍 CLIENT API: Using template fallback:', !agreement.customHtmlContent && !agreement.mergedHtml);
    
    if (agreement.status === 'SIGNED') {
      if (agreement.mergedHtml && agreement.mergedHtml.trim().length > 0) {
        // Use the saved snapshot for signed agreements
        devLog('🔍 CLIENT API: Using saved snapshot for signed agreement');
        processedHtml = agreement.mergedHtml;
      } else {
        // Fallback: create snapshot now if it's missing (shouldn't happen)
        devLog('🔍 CLIENT API: WARNING - Signed agreement missing snapshot, creating one now');
        processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
        
        // Save the snapshot for future use
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { mergedHtml: processedHtml }
        });
      }
    } else {
      // Process the content in real-time for unsigned agreements
      devLog('🔍 CLIENT API: Processing content in real-time for unsigned agreement');
      processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
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
