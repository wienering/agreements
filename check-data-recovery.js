const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataRecovery() {
  try {
    console.log('🔍 Attempting Data Recovery...');
    
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Try to access data through Prisma client
    console.log('\n📊 Checking data through Prisma client:');
    
    try {
      const clients = await prisma.client.findMany();
      console.log(`   Clients found: ${clients.length}`);
      if (clients.length > 0) {
        console.log('   Client data:');
        clients.forEach((client, index) => {
          console.log(`     ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing clients: ${error.message}`);
    }
    
    try {
      const templates = await prisma.template.findMany();
      console.log(`   Templates found: ${templates.length}`);
      if (templates.length > 0) {
        console.log('   Template data:');
        templates.forEach((template, index) => {
          console.log(`     ${index + 1}. ${template.title}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing templates: ${error.message}`);
    }
    
    try {
      const agreements = await prisma.agreement.findMany();
      console.log(`   Agreements found: ${agreements.length}`);
      if (agreements.length > 0) {
        console.log('   Agreement data:');
        agreements.forEach((agreement, index) => {
          console.log(`     ${index + 1}. Agreement ${agreement.id} - Status: ${agreement.status}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing agreements: ${error.message}`);
    }
    
    // Check if there might be data in a different environment
    console.log('\n🔍 Checking for backup possibilities...');
    
    // Check if there are any other databases or if this is a different environment
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version();`;
    console.log('   Database info:', dbInfo[0]);
    
    // Check if there are any other tables that might contain your data
    const allTables = await prisma.$queryRaw`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📋 All tables in current database:');
    allTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name} (${table.table_type})`);
    });
    
  } catch (error) {
    console.error('❌ Error during data recovery check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataRecovery();
