const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDatabaseOrder() {
  try {
    console.log('🔧 Fixing database order column...');
    
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Check if order column exists
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Template' AND column_name = 'order';
    `;
    
    if (tableInfo.length === 0) {
      console.log('❌ Order column does not exist. Adding it...');
      
      // Add the order column
      await prisma.$queryRaw`ALTER TABLE "Template" ADD COLUMN "order" INTEGER DEFAULT 0;`;
      console.log('✅ Added order column');
    } else {
      console.log('✅ Order column already exists');
    }
    
    // Update existing templates with proper order values
    console.log('🔄 Updating template order values...');
    
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < templates.length; i++) {
      await prisma.template.update({
        where: { id: templates[i].id },
        data: { order: i }
      });
    }
    
    console.log(`✅ Updated order for ${templates.length} templates`);
    
    // Verify the fix
    const orderedTemplates = await prisma.template.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true, createdAt: true }
    });
    
    console.log('\n📋 Templates in order:');
    orderedTemplates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.title} (order: ${template.order})`);
    });
    
    console.log('\n✅ Database order fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseOrder();
