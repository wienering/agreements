import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';

export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    devLog('🔍 Admin Preview API: Looking for agreement with token:', token);

    if (!token) {
      devLog('❌ Admin Preview API: No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Admin preview should show ALL agreements regardless of expiration
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token
      },
      include: {
        client: true,
        template: true,
        event: true
      }
    });

    devLog('📊 Admin Preview API: Agreement found:', !!agreement);
    if (agreement) {
      devLog('📊 Admin Preview API: Agreement details - ID:', agreement.id, 'Status:', agreement.status, 'Archived:', agreement.archived);
    }

    if (!agreement) {
      devLog('❌ Admin Preview API: No agreement exists with token:', token);
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // For unsigned agreements, process the template in real-time
    let processedHtml;
    devLog('🔍 Admin Preview API: Agreement status:', agreement.status);
    devLog('🔍 Admin Preview API: Has mergedHtml:', !!agreement.mergedHtml);
    devLog('🔍 Admin Preview API: mergedHtml length:', agreement.mergedHtml?.length || 0);
    devLog('🔍 Admin Preview API: Template content length:', agreement.template.htmlContent?.length || 0);
    
    if (agreement.status === 'SIGNED') {
      if (agreement.mergedHtml && agreement.mergedHtml.trim().length > 0) {
        // Use the saved snapshot for signed agreements
        devLog('🔍 Admin Preview API: Using saved snapshot for signed agreement');
        processedHtml = agreement.mergedHtml;
      } else {
        // Fallback: create snapshot now if it's missing
        devLog('🔍 Admin Preview API: WARNING - Signed agreement missing snapshot, creating one now');
        const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
        processedHtml = processHtmlContent(
          htmlToProcess,
          agreement.client,
          agreement.id,
          agreement.event,
          pickSecondSigner(agreement),
        );
      }
    } else {
      // Process the content in real-time for unsigned agreements
      // Use customHtmlContent if available, otherwise fall back to template.htmlContent
      devLog('🔍 Admin Preview API: Processing content in real-time for unsigned agreement');
      const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
      processedHtml = processHtmlContent(
        htmlToProcess,
        agreement.client,
        agreement.id,
        agreement.event,
        pickSecondSigner(agreement),
      );
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
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('❌ Admin Preview API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
