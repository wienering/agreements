import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin email
    const isAdmin = session.user.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('🔍 Admin Preview API: Looking for agreement with token:', token);

    if (!token) {
      console.log('❌ Admin Preview API: No token provided');
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
        template: true,
        event: true
      }
    });

    console.log('📊 Admin Preview API: Agreement found:', !!agreement);

    if (!agreement) {
      console.log('❌ Admin Preview API: Agreement not found or expired');
      return NextResponse.json({ error: 'Agreement not found or expired' }, { status: 404 });
    }

    // Process smart fields in the HTML content
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      if (!html || !client) return html;
      
      let processedHtml = html;
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
      
      // Use event data if available, otherwise fall back to client event fields (backward compatibility)
      const eventDate = event?.eventDate || client.eventDate;
      const eventType = event?.eventType || client.eventType || '';
      const eventLocation = event?.eventLocation || client.eventLocation || '';
      const eventStartTime = event?.eventStartTime || client.eventStartTime || '';
      const eventDuration = event?.eventDuration || client.eventDuration || '';
      const eventPackage = event?.eventPackage || client.eventPackage || '';
      const packagePrice = event?.packagePrice || client.packagePrice;
      
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

    // For unsigned agreements, process the template in real-time
    let processedHtml;
    console.log('🔍 Admin Preview API: Agreement status:', agreement.status);
    console.log('🔍 Admin Preview API: Has mergedHtml:', !!agreement.mergedHtml);
    console.log('🔍 Admin Preview API: mergedHtml length:', agreement.mergedHtml?.length || 0);
    console.log('🔍 Admin Preview API: Template content length:', agreement.template.htmlContent?.length || 0);
    
    if (agreement.status === 'SIGNED') {
      if (agreement.mergedHtml && agreement.mergedHtml.trim().length > 0) {
        // Use the saved snapshot for signed agreements
        console.log('🔍 Admin Preview API: Using saved snapshot for signed agreement');
        processedHtml = agreement.mergedHtml;
      } else {
        // Fallback: create snapshot now if it's missing
        console.log('🔍 Admin Preview API: WARNING - Signed agreement missing snapshot, creating one now');
        processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id, agreement.event);
      }
    } else {
      // Process the template in real-time for unsigned agreements
      console.log('🔍 Admin Preview API: Processing template in real-time for unsigned agreement');
      processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id, agreement.event);
    }

    // Convert Decimal fields to numbers for JSON serialization
    const client = {
      ...agreement.client,
      packagePrice: agreement.client.packagePrice ? Number(agreement.client.packagePrice) : null
    };

    // Return the agreement with processed HTML
    // Only return public title to admins, not internal title
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
    console.error('❌ Admin Preview API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
