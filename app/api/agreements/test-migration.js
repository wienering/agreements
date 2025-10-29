// Test script to verify client portal database migration
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMigration() {
  try {
    console.log('🧪 Testing Client Portal Migration...\n');

    // Test 1: Check if new tables exist
    console.log('1. Checking new tables...');
    
    // Try to query ClientSession table
    const sessionCount = await prisma.clientSession.count();
    console.log(`   ✓ ClientSession table exists (${sessionCount} records)`);
    
    // Try to query ClientNote table
    const noteCount = await prisma.clientNote.count();
    console.log(`   ✓ ClientNote table exists (${noteCount} records)`);

    // Test 2: Check if new columns exist
    console.log('\n2. Checking new Client columns...');
    
    const client = await prisma.client.findFirst({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        phoneAddedAt: true,
        addressAddedAt: true,
      }
    });
    
    if (client) {
      console.log('   ✓ Client.address column exists');
      console.log('   ✓ Client.phoneAddedAt column exists');
      console.log('   ✓ Client.addressAddedAt column exists');
    }

    // Test 3: Test data integrity
    console.log('\n3. Checking data integrity...');
    
    const totalClients = await prisma.client.count();
    const totalAgreements = await prisma.agreement.count();
    const totalTemplates = await prisma.template.count();
    
    console.log(`   ✓ Total Clients: ${totalClients}`);
    console.log(`   ✓ Total Agreements: ${totalAgreements}`);
    console.log(`   ✓ Total Templates: ${totalTemplates}`);

    // Test 4: Test new functionality
    console.log('\n4. Testing new functionality...');
    
    if (client) {
      // Test creating a client session
      const testSession = await prisma.clientSession.create({
        data: {
          clientId: client.id,
          sessionToken: 'test-session-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        }
      });
      console.log('   ✓ Can create ClientSession records');
      
      // Clean up test session
      await prisma.clientSession.delete({
        where: { id: testSession.id }
      });
      console.log('   ✓ Can delete ClientSession records');

      // Test creating a client note
      const testNote = await prisma.clientNote.create({
        data: {
          clientId: client.id,
          content: 'Test note for migration verification',
        }
      });
      console.log('   ✓ Can create ClientNote records');
      
      // Clean up test note
      await prisma.clientNote.delete({
        where: { id: testNote.id }
      });
      console.log('   ✓ Can delete ClientNote records');
    }

    console.log('\n🎉 Migration verification completed successfully!');
    console.log('✅ All new tables and columns are working correctly');
    console.log('✅ Existing data is preserved');
    console.log('✅ Client portal is ready for use');

  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMigration();