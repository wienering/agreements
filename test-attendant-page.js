const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAttendantPage() {
  try {
    console.log('Testing attendant page database queries...\n');
    
    // Test with the ID from the URL the user provided
    const testId = 'cmhp7fm0m0001jx04qc0882ky';
    console.log(`Testing with agreement ID: ${testId}\n`);
    
    // Test the exact query from the attendant page
    console.log('1. Testing agreement query (same as attendant page)...');
    const agreement = await prisma.agreement.findUnique({
      where: { id: testId },
      select: {
        id: true,
        selectedBackdropName: true,
        eventId: true,
        showPhoneNumberAlways: true,
        forceVirtualGreenScreen: true,
        client: {
          select: {
            firstName: true,
            phone: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            eventType: true,
            notes: true,
            address: true,
            isWhitelabelClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            eventType: true,
            notes: true,
            eventName: true,
            eventPhone: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
            url: true,
          },
        },
      },
    });
    
    if (!agreement) {
      console.log('❌ Agreement not found!');
      console.log('\nChecking if agreement exists with different query...');
      const anyAgreement = await prisma.agreement.findUnique({
        where: { id: testId },
      });
      if (!anyAgreement) {
        console.log('❌ Agreement does not exist in database');
      } else {
        console.log('⚠️ Agreement exists but query failed - check relations');
      }
      return;
    }
    
    console.log('✅ Agreement found!');
    console.log(`   - ID: ${agreement.id}`);
    console.log(`   - Client: ${agreement.client?.firstName || 'N/A'}`);
    console.log(`   - Has client: ${!!agreement.client}`);
    console.log(`   - Has event: ${!!agreement.event}`);
    console.log(`   - Has backdropLink: ${!!agreement.backdropLink}`);
    console.log(`   - BackdropLink URL: ${agreement.backdropLink?.url || 'N/A'}`);
    
    if (!agreement.client) {
      console.log('\n❌ ERROR: Agreement has no client - this would cause NotFoundError');
      return;
    }
    
    // Test attendantId extraction
    console.log('\n2. Testing attendantId extraction...');
    const extractAttendantIdFromUrl = (url) => {
      if (!url) return null;
      try {
        const pathMatch = url.match(/\/select\/([^/?]+)/);
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1];
        }
        
        const urlObj = new URL(url);
        const attendantIdParam = urlObj.searchParams.get('attendantId');
        if (attendantIdParam) {
          return attendantIdParam;
        }
        
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const selectIndex = pathSegments.indexOf('select');
        if (selectIndex !== -1 && pathSegments[selectIndex + 1]) {
          return pathSegments[selectIndex + 1];
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting attendant ID:', error);
        return null;
      }
    };
    
    const attendantId = agreement.backdropLink?.url 
      ? extractAttendantIdFromUrl(agreement.backdropLink.url) 
      : null;
    
    console.log(`   - Extracted attendantId: ${attendantId || 'N/A'}`);
    
    // Check if there are any agreements at all
    console.log('\n3. Checking database statistics...');
    const totalAgreements = await prisma.agreement.count();
    console.log(`   - Total agreements: ${totalAgreements}`);
    
    // Get a few sample agreement IDs
    console.log('\n4. Sample agreement IDs:');
    const sampleAgreements = await prisma.agreement.findMany({
      take: 5,
      select: {
        id: true,
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });
    
    sampleAgreements.forEach((ag, index) => {
      console.log(`   ${index + 1}. ${ag.id} (Client: ${ag.client?.firstName || 'N/A'})`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAttendantPage();

