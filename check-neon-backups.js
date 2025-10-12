const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNeonBackups() {
  try {
    console.log('🔍 Checking Neon Database Backup Options...');
    
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Check if we can access any backup-related information
    console.log('\n📊 Checking for backup-related tables or views...');
    
    try {
      // Check if there are any backup tables
      const backupTables = await prisma.$queryRaw`
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name ILIKE '%backup%' OR table_name ILIKE '%archive%' OR table_name ILIKE '%history%')
        ORDER BY table_name;
      `;
      
      if (backupTables.length > 0) {
        console.log('   Found potential backup tables:');
        backupTables.forEach((table, index) => {
          console.log(`     ${index + 1}. ${table.table_name} (${table.table_type})`);
        });
      } else {
        console.log('   No backup tables found');
      }
    } catch (error) {
      console.log(`   ❌ Error checking backup tables: ${error.message}`);
    }
    
    // Check database version and capabilities
    console.log('\n🔍 Checking database capabilities...');
    
    try {
      const dbInfo = await prisma.$queryRaw`
        SELECT 
          current_database() as database_name,
          current_user as current_user,
          version() as version,
          pg_database_size(current_database()) as database_size_bytes
      `;
      
      console.log('   Database Information:');
      console.log(`     Name: ${dbInfo[0].database_name}`);
      console.log(`     User: ${dbInfo[0].current_user}`);
      console.log(`     Version: ${dbInfo[0].version}`);
      console.log(`     Size: ${Math.round(dbInfo[0].database_size_bytes / 1024 / 1024)} MB`);
    } catch (error) {
      console.log(`   ❌ Error getting database info: ${error.message}`);
    }
    
    // Check if there are any recent changes or audit logs
    console.log('\n🔍 Checking for audit logs or change history...');
    
    try {
      const auditLogs = await prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      if (auditLogs.length > 0) {
        console.log(`   Found ${auditLogs.length} recent audit log entries:`);
        auditLogs.forEach((log, index) => {
          console.log(`     ${index + 1}. ${log.action} - ${log.createdAt}`);
        });
      } else {
        console.log('   No audit logs found');
      }
    } catch (error) {
      console.log(`   ❌ Error checking audit logs: ${error.message}`);
    }
    
    console.log('\n💡 Backup Recovery Options:');
    console.log('   1. Check Neon Dashboard for point-in-time recovery');
    console.log('   2. Look for any exported data files on your computer');
    console.log('   3. Check if you have any database dumps or exports');
    console.log('   4. Contact Neon support for backup assistance');
    
  } catch (error) {
    console.error('❌ Error during backup check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNeonBackups();
