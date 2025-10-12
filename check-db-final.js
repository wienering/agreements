const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database After Migration Fix...');
    
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Check all tables
    console.log('\n📊 Database Statistics:');
    
    const agreementCount = await prisma.agreement.count();
    console.log(`   Agreements: ${agreementCount}`);
    
    const templateCount = await prisma.template.count();
    console.log(`   Templates: ${templateCount}`);
    
    const clientCount = await prisma.client.count();
    console.log(`   Clients: ${clientCount}`);
    
    const userCount = await prisma.user.count();
    console.log(`   Users: ${userCount}`);
    
    // Check if we can create data
    console.log('\n🧪 Testing Data Creation...');
    
    // Try to create a test template
    try {
      const testTemplate = await prisma.template.create({
        data: {
          title: 'Test Template',
          htmlContent: '<p>This is a test template</p>',
          fieldsSchema: {},
          order: 0
        }
      });
      console.log('✅ Successfully created test template:', testTemplate.id);
      
      // Clean up
      await prisma.template.delete({ where: { id: testTemplate.id } });
      console.log('✅ Successfully deleted test template');
    } catch (error) {
      console.log('❌ Failed to create test template:', error.message);
    }
    
    // Try to create a test client
    try {
      const testClient = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'Client',
          email: 'test@example.com'
        }
      });
      console.log('✅ Successfully created test client:', testClient.id);
      
      // Clean up
      await prisma.client.delete({ where: { id: testClient.id } });
      console.log('✅ Successfully deleted test client');
    } catch (error) {
      console.log('❌ Failed to create test client:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
