/**
 * Migration Script: Add isDefault field to outlets
 * 
 * This script adds the isDefault field to all existing outlets.
 * The first outlet for each merchant will be set as the default outlet.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateOutlets() {
  try {
    console.log('🚀 Starting migration: Add isDefault field to outlets...');
    
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      select: { id: true, publicId: true, name: true },
      orderBy: { publicId: 'asc' }
    });
    
    console.log(`📊 Found ${merchants.length} merchants to process`);
    
    for (const merchant of merchants) {
      console.log(`\n🏪 Processing merchant: ${merchant.name} (ID: ${merchant.publicId})`);
      
      // Get all outlets for this merchant, ordered by creation date
      const outlets = await prisma.outlet.findMany({
        where: { merchantId: merchant.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, publicId: true, name: true, createdAt: true }
      });
      
      if (outlets.length === 0) {
        console.log(`   ⚠️  No outlets found for merchant ${merchant.name}`);
        continue;
      }
      
      console.log(`   📍 Found ${outlets.length} outlets for merchant ${merchant.name}`);
      
      // Set the first (oldest) outlet as default
      const defaultOutlet = outlets[0];
      console.log(`   ✅ Setting "${defaultOutlet.name}" (ID: ${defaultOutlet.publicId}) as default outlet`);
      
      // Update the default outlet
      await prisma.outlet.update({
        where: { id: defaultOutlet.id },
        data: { isDefault: true }
      });
      
      // Set all other outlets as non-default
      if (outlets.length > 1) {
        const nonDefaultOutlets = outlets.slice(1);
        console.log(`   🔄 Setting ${nonDefaultOutlets.length} other outlets as non-default`);
        
        for (const outlet of nonDefaultOutlets) {
          await prisma.outlet.update({
            where: { id: outlet.id },
            data: { isDefault: false }
          });
        }
      }
      
      console.log(`   ✨ Completed migration for merchant ${merchant.name}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Added isDefault field to all outlets');
    console.log('   - Set first outlet of each merchant as default');
    console.log('   - Set all other outlets as non-default');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateOutlets()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
