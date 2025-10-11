// Backfill script to create snapshots for signed agreements
const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

console.log('Environment loaded, DATABASE_URL exists:', !!process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function processHtmlContent(html, client, agreementId) {
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

async function backfillSnapshots() {
  try {
    console.log('🔍 Connecting to database...');
    
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

    console.log(`📋 Found ${signedAgreements.length} total signed agreements`);

    // Filter those without snapshots
    const agreementsNeedingSnapshots = signedAgreements.filter(
      a => !a.mergedHtml || a.mergedHtml.trim().length === 0
    );

    console.log(`⚠️  ${agreementsNeedingSnapshots.length} signed agreements missing snapshots`);

    if (agreementsNeedingSnapshots.length === 0) {
      console.log('✅ All signed agreements already have snapshots!');
      return { updated: 0, total: signedAgreements.length };
    }

    console.log('\n🔧 Creating snapshots...\n');

    let successCount = 0;
    let errorCount = 0;

    // Process each agreement
    for (const agreement of agreementsNeedingSnapshots) {
      try {
        console.log(`Processing: ${agreement.client.firstName} ${agreement.client.lastName}`);
        console.log(`  Template: ${agreement.template.title}`);
        console.log(`  Signed: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'Unknown'}`);
        
        // Create the snapshot
        const snapshot = processHtmlContent(
          agreement.template.htmlContent,
          agreement.client,
          agreement.id
        );

        console.log(`  Snapshot: ${snapshot.length} characters`);

        // Save the snapshot
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { mergedHtml: snapshot }
        });

        console.log(`  ✅ Saved!\n`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🎉 Backfill Complete!`);
    console.log(`✅ Successfully updated: ${successCount} agreements`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} agreements`);
    }
    console.log('='.repeat(50));

    return { updated: successCount, errors: errorCount, total: signedAgreements.length };

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
console.log('\n' + '='.repeat(50));
console.log('🚀 Starting Snapshot Backfill Script');
console.log('='.repeat(50) + '\n');

backfillSnapshots()
  .then((result) => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });

