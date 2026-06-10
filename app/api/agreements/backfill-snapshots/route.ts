import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { processHtmlContent } from '../portal/shared/agreement-utils';

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const { regenerateAll = false, onlyWithEvents = false } = body;

    devLog('🔍 Starting snapshot backfill...');
    devLog(`Options: regenerateAll=${regenerateAll}, onlyWithEvents=${onlyWithEvents}`);

    // Find all signed agreements
    const signedAgreements = await prisma.agreement.findMany({
      where: {
        status: 'SIGNED'
      },
      include: {
        client: true,
        template: true,
        event: true
      }
    });

    devLog(`📋 Found ${signedAgreements.length} signed agreements`);

    // Filter agreements that need snapshots
    let agreementsNeedingSnapshots;
    if (regenerateAll) {
      // Regenerate all signed agreements
      agreementsNeedingSnapshots = signedAgreements;
      devLog(`🔄 Regenerating all ${agreementsNeedingSnapshots.length} signed agreements`);
    } else if (onlyWithEvents) {
      // Only regenerate agreements that have events linked
      agreementsNeedingSnapshots = signedAgreements.filter(a => a.eventId && a.event);
      devLog(`🔄 Regenerating ${agreementsNeedingSnapshots.length} agreements with events`);
    } else {
      // Only those without snapshots (original behavior)
      agreementsNeedingSnapshots = signedAgreements.filter(
        a => !a.mergedHtml || a.mergedHtml.trim().length === 0
      );
      devLog(`⚠️ ${agreementsNeedingSnapshots.length} need snapshots`);
    }

    if (agreementsNeedingSnapshots.length === 0) {
      return NextResponse.json({
        success: true,
        message: regenerateAll 
          ? 'No signed agreements found' 
          : onlyWithEvents 
            ? 'No signed agreements with events found'
            : 'All signed agreements already have snapshots',
        updated: 0,
        total: signedAgreements.length
      });
    }

    const results = [];

    // Process each agreement
    for (const agreement of agreementsNeedingSnapshots) {
      try {
        const hasEvent = agreement.eventId && agreement.event;
        devLog(`Processing agreement ${agreement.id}... ${hasEvent ? '(has event)' : '(no event)'}`);
        
        // Create the snapshot using the updated logic with event data
        const snapshot = processHtmlContent(
          agreement.template.htmlContent,
          agreement.client,
          agreement.id,
          agreement.event || null
        );

        // Save the snapshot
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { mergedHtml: snapshot }
        });

        results.push({
          id: agreement.id,
          client: `${agreement.client.firstName} ${agreement.client.lastName}`,
          hasEvent: hasEvent,
          success: true
        });
        
        devLog(`✅ Saved snapshot for ${agreement.id}`);
      } catch (error: any) {
        console.error(`❌ Error processing ${agreement.id}:`, error);
        results.push({
          id: agreement.id,
          client: `${agreement.client.firstName} ${agreement.client.lastName}`,
          success: false,
          error: 'Snapshot processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Backfilled ${successCount} snapshots`,
      updated: successCount,
      errors: errorCount,
      total: signedAgreements.length,
      details: results
    });

  } catch (error: any) {
    console.error('❌ Backfill error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backfill operation failed',
    }, { status: 500 });
  }
}

