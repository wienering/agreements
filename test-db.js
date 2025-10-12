const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if agreements table exists and has data
    const agreementCount = await prisma.agreement.count();
    console.log(`📊 Total agreements in database: ${agreementCount}`);
    
    // Get a few agreements to see their structure
    const agreements = await prisma.agreement.findMany({
      take: 3,
      include: {
        client: true,
        template: true,
      }
    });
    
    console.log('📋 Sample agreements:');
    agreements.forEach((agreement, index) => {
      console.log(`${index + 1}. ID: ${agreement.id}, Status: ${agreement.status}, Client: ${agreement.client?.firstName} ${agreement.client?.lastName}`);
    });
    
    // Check templates
    const templateCount = await prisma.template.count();
    console.log(`📄 Total templates in database: ${templateCount}`);
    
    // Check clients
    const clientCount = await prisma.client.count();
    console.log(`👥 Total clients in database: ${clientCount}`);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
