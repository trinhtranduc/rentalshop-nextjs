/**
 * Migration Script: Add Discount Fields to Orders
 * 
 * This script adds the missing discount fields to existing orders:
 * - discountType: 'amount' | 'percentage'
 * - discountValue: number
 * - discountAmount: number
 * 
 * Usage: node scripts/add-discount-fields.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDiscountFields() {
  console.log('🔄 Starting discount fields migration...');
  
  try {
    // First, check if the fields already exist
    const sampleOrder = await prisma.order.findFirst({
      select: {
        id: true,
        discountType: true,
        discountValue: true,
        discountAmount: true
      }
    });

    if (sampleOrder && sampleOrder.discountType !== undefined) {
      console.log('✅ Discount fields already exist in the database');
      return;
    }

    console.log('📋 Adding discount fields to existing orders...');

    // Update all existing orders to have default discount values
    const result = await prisma.order.updateMany({
      data: {
        discountType: 'amount',
        discountValue: 0,
        discountAmount: 0
      }
    });

    console.log(`✅ Updated ${result.count} orders with default discount values`);
    console.log('🎉 Discount fields migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error.message.includes('Unknown field')) {
      console.log('\n💡 The discount fields need to be added to the database schema first.');
      console.log('   Run: npx prisma db push');
      console.log('   Or: npx prisma migrate dev --name add-discount-fields');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  addDiscountFields()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addDiscountFields };
