import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processHtmlContent } from '../portal/shared/agreement-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { regenerateAll = false, onlyWithEvents = false } = body;

    console.log('🔍 Starting snapshot backfill...');
    console.log(`Options: regenerateAll=${regenerateAll}, onlyWithEvents=${onlyWithEvents}`);

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

    console.log(`📋 Found ${signedAgreements.length} signed agreements`);

    // Filter agreements that need snapshots
    let agreementsNeedingSnapshots;
    if (regenerateAll) {
      // Regenerate all signed agreements
      agreementsNeedingSnapshots = signedAgreements;
      console.log(`🔄 Regenerating all ${agreementsNeedingSnapshots.length} signed agreements`);
    } else if (onlyWithEvents) {
      // Only regenerate agreements that have events linked
      agreementsNeedingSnapshots = signedAgreements.filter(a => a.eventId && a.event);
      console.log(`🔄 Regenerating ${agreementsNeedingSnapshots.length} agreements with events`);
    } else {
      // Only those without snapshots (original behavior)
      agreementsNeedingSnapshots = signedAgreements.filter(
        a => !a.mergedHtml || a.mergedHtml.trim().length === 0
      );
      console.log(`⚠️ ${agreementsNeedingSnapshots.length} need snapshots`);
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
        console.log(`Processing agreement ${agreement.id}... ${hasEvent ? '(has event)' : '(no event)'}`);
        
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
        
        console.log(`✅ Saved snapshot for ${agreement.id}`);
      } catch (error: any) {
        console.error(`❌ Error processing ${agreement.id}:`, error);
        results.push({
          id: agreement.id,
          client: `${agreement.client.firstName} ${agreement.client.lastName}`,
          success: false,
          error: error.message
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
      error: error.message
    }, { status: 500 });
  }
}

