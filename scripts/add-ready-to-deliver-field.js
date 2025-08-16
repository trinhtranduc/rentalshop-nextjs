#!/usr/bin/env node

/**
 * Script to add the isReadyToDeliver field to existing orders
 * This script adds the new boolean field with a default value of false
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addReadyToDeliverField() {
  try {
    console.log('🚀 Starting to add isReadyToDeliver field to existing orders...');
    
    // Check if the field already exists by trying to query it
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT isReadyToDeliver FROM "Order" LIMIT 1
      `;
      console.log('✅ Field isReadyToDeliver already exists in the database');
      return;
    } catch (error) {
      if (error.message.includes('no such column')) {
        console.log('📝 Field isReadyToDeliver does not exist, adding it...');
      } else {
        throw error;
      }
    }

    // Add the new column with default value
    console.log('🔧 Adding isReadyToDeliver column to Order table...');
    await prisma.$executeRaw`
      ALTER TABLE "Order" 
      ADD COLUMN "isReadyToDeliver" BOOLEAN NOT NULL DEFAULT false
    `;
    
    console.log('✅ Successfully added isReadyToDeliver column');
    
    // Update existing orders to set a reasonable default value
    // For orders that are already completed or cancelled, set to false
    // For active orders, set to true (assuming they're ready)
    console.log('🔄 Updating existing orders with default values...');
    
    const updateResult = await prisma.$executeRaw`
      UPDATE "Order" 
      SET "isReadyToDeliver" = CASE 
        WHEN status IN ('COMPLETED', 'CANCELLED', 'OVERDUE', 'DAMAGED') THEN false
        WHEN status IN ('CONFIRMED', 'ACTIVE') THEN true
        ELSE false
      END
      WHERE "isReadyToDeliver" IS NULL
    `;
    
    console.log(`✅ Updated ${updateResult} existing orders with default values`);
    
    // Verify the update
    const orderCount = await prisma.order.count();
    const readyCount = await prisma.order.count({
      where: { isReadyToDeliver: true }
    });
    const notReadyCount = await prisma.order.count({
      where: { isReadyToDeliver: false }
    });
    
    console.log('\n📊 Order Status Summary:');
    console.log(`  Total Orders: ${orderCount}`);
    console.log(`  Ready to Deliver: ${readyCount}`);
    console.log(`  Not Ready to Deliver: ${notReadyCount}`);
    
    console.log('\n🎉 Successfully completed adding isReadyToDeliver field!');
    
  } catch (error) {
    console.error('❌ Error adding isReadyToDeliver field:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  addReadyToDeliverField()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addReadyToDeliverField };
