#!/usr/bin/env node

/**
 * Simple Database Viewer
 * Shows basic database statistics
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function viewDatabase() {
  try {
    console.log('🔍 Database Overview\n');

    const [users, categories, merchants, outlets, products, admins, staff] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.merchant.count(),
      prisma.outlet.count(),
      prisma.product.count(),
      prisma.admin.count(),
      prisma.outletStaff.count()
    ]);

    console.log('📊 Summary:');
    console.log(`  Users: ${users}`);
    console.log(`  Categories: ${categories}`);
    console.log(`  Merchants: ${merchants}`);
    console.log(`  Outlets: ${outlets}`);
    console.log(`  Products: ${products}`);
    console.log(`  Admins: ${admins}`);
    console.log(`  Staff: ${staff}`);

    console.log('\n💡 Tip: Use "yarn db:studio" for a visual interface');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

viewDatabase(); 