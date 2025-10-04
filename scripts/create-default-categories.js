#!/usr/bin/env node

/**
 * Migration Script: Create Default Categories for Existing Merchants
 * 
 * This script ensures every existing merchant has a default "General" category
 * for products that don't specify a category.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultCategoriesForExistingMerchants() {
  console.log('🚀 Starting migration: Create default categories for existing merchants...');
  
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      include: { 
        categories: {
          where: { name: 'General' }
        }
      }
    });

    console.log(`📊 Found ${merchants.length} merchants to check`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const merchant of merchants) {
      // Check if merchant already has a "General" category
      const hasGeneralCategory = merchant.categories.length > 0;
      
      if (hasGeneralCategory) {
        console.log(`⏭️  Merchant ${merchant.id} (${merchant.name}) already has General category - skipping`);
        skippedCount++;
        continue;
      }

      // Create default "General" category
      const lastCategory = await prisma.category.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
      });
      const nextCategoryId = (lastCategory?.id || 0) + 1;

      const defaultCategory = await prisma.category.create({
        data: {
          id: nextCategoryId,
          name: 'General',
          description: 'Default category for general products',
          merchantId: merchant.id,
          isActive: true
        }
      });

      console.log(`✅ Created General category (ID: ${defaultCategory.id}) for merchant ${merchant.id} (${merchant.name})`);
      createdCount++;
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   • Merchants processed: ${merchants.length}`);
    console.log(`   • Categories created: ${createdCount}`);
    console.log(`   • Categories skipped: ${skippedCount}`);
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  createDefaultCategoriesForExistingMerchants()
    .then(() => {
      console.log('🎉 Default categories migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createDefaultCategoriesForExistingMerchants };
