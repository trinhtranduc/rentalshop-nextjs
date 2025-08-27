/**
 * Migration script to add phone field to outlets table
 * Run this script to add the phone field to existing outlets
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addPhoneFieldToOutlets() {
  try {
    console.log('🔍 Starting migration: Adding phone field to outlets...');
    
    // Check if the phone field already exists
    const outlets = await prisma.outlet.findMany({
      select: {
        id: true,
        name: true,
        phone: true
      }
    });
    
    console.log(`🔍 Found ${outlets.length} outlets`);
    
    // Update outlets that don't have a phone field
    let updatedCount = 0;
    
    for (const outlet of outlets) {
      if (outlet.phone === null || outlet.phone === undefined) {
        await prisma.outlet.update({
          where: { id: outlet.id },
          data: { phone: null } // Set to null explicitly
        });
        updatedCount++;
        console.log(`✅ Updated outlet: ${outlet.name}`);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updatedCount} outlets`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addPhoneFieldToOutlets();
