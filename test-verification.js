const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runVerification() {
  try {
    console.log('Running whitelist fields verification...\n');

    // 1. Check isWhitelistClient column
    const clientColumn = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Client' AND column_name = 'isWhitelistClient'
    `;

    if (clientColumn.length > 0) {
      console.log('✓ Client.isWhitelistClient column exists');
      console.log(`  Type: ${clientColumn[0].data_type}`);
      console.log(`  Nullable: ${clientColumn[0].is_nullable}`);
      console.log(`  Default: ${clientColumn[0].column_default || 'none'}`);
    } else {
      console.log('✗ Client.isWhitelistClient column is MISSING');
    }

    // 2. Check eventName column
    const eventNameColumn = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Event' AND column_name = 'eventName'
    `;

    if (eventNameColumn.length > 0) {
      console.log('\n✓ Event.eventName column exists');
      console.log(`  Type: ${eventNameColumn[0].data_type}`);
      console.log(`  Nullable: ${eventNameColumn[0].is_nullable}`);
    } else {
      console.log('\n✗ Event.eventName column is MISSING');
    }

    // 3. Check eventPhone column
    const eventPhoneColumn = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Event' AND column_name = 'eventPhone'
    `;

    if (eventPhoneColumn.length > 0) {
      console.log('\n✓ Event.eventPhone column exists');
      console.log(`  Type: ${eventPhoneColumn[0].data_type}`);
      console.log(`  Nullable: ${eventPhoneColumn[0].is_nullable}`);
    } else {
      console.log('\n✗ Event.eventPhone column is MISSING');
    }

    // 4. Get statistics
    const clientStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE "isWhitelistClient" = true) as whitelist_clients,
        COUNT(*) FILTER (WHERE "isWhitelistClient" = false) as regular_clients
      FROM "Client"
    `;

    const eventStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE "eventName" IS NOT NULL) as events_with_name,
        COUNT(*) FILTER (WHERE "eventPhone" IS NOT NULL) as events_with_phone
      FROM "Event"
    `;

    console.log('\n--- Statistics ---');
    console.log('Clients:');
    console.log(`  Total: ${clientStats[0].total_clients}`);
    console.log(`  Whitelist: ${clientStats[0].whitelist_clients}`);
    console.log(`  Regular: ${clientStats[0].regular_clients}`);
    
    console.log('\nEvents:');
    console.log(`  Total: ${eventStats[0].total_events}`);
    console.log(`  With event name: ${eventStats[0].events_with_name}`);
    console.log(`  With event phone: ${eventStats[0].events_with_phone}`);

    // Final verification
    const allColumnsExist = 
      clientColumn.length > 0 && 
      eventNameColumn.length > 0 && 
      eventPhoneColumn.length > 0;

    console.log('\n========================================');
    if (allColumnsExist) {
      console.log('✓ VERIFICATION SUCCESSFUL!');
      console.log('All required columns for whitelist client feature are present.');
    } else {
      console.log('✗ VERIFICATION FAILED!');
      console.log('Some required columns are missing.');
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('Error running verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();

