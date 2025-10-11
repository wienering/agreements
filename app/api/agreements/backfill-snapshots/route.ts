import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function processHtmlContent(html: string, client: any, agreementId: string) {
  let processedHtml = html;
  
  // Replace client fields
  processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
  processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
  processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
  processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
  processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '');
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
  
  // Replace event fields
  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
  processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, client.packagePrice ? `$${Number(client.packagePrice).toFixed(2)}` : '');
  
  // Replace agreement fields
  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
  
  return processedHtml;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting snapshot backfill...');

    // Find all signed agreements
    const signedAgreements = await prisma.agreement.findMany({
      where: {
        status: 'SIGNED'
      },
      include: {
        client: true,
        template: true
      }
    });

    console.log(`📋 Found ${signedAgreements.length} signed agreements`);

    // Filter those without snapshots
    const agreementsNeedingSnapshots = signedAgreements.filter(
      a => !a.mergedHtml || a.mergedHtml.trim().length === 0
    );

    console.log(`⚠️ ${agreementsNeedingSnapshots.length} need snapshots`);

    if (agreementsNeedingSnapshots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All signed agreements already have snapshots',
        updated: 0,
        total: signedAgreements.length
      });
    }

    const results = [];

    // Process each agreement
    for (const agreement of agreementsNeedingSnapshots) {
      try {
        console.log(`Processing agreement ${agreement.id}...`);
        
        // Create the snapshot
        const snapshot = processHtmlContent(
          agreement.template.htmlContent,
          agreement.client,
          agreement.id
        );

        // Save the snapshot
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { mergedHtml: snapshot }
        });

        results.push({
          id: agreement.id,
          client: `${agreement.client.firstName} ${agreement.client.lastName}`,
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

