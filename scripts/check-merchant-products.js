#!/usr/bin/env node

/**
 * Script to check if merchant has products
 * Usage: node scripts/check-merchant-products.js <tenantKey>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMerchantProducts(tenantKey) {
  try {
    console.log(`🔍 Checking merchant with tenantKey: ${tenantKey}\n`);

    // Find merchant by tenantKey
    const merchant = await prisma.merchant.findUnique({
      where: { tenantKey },
      select: {
        id: true,
        name: true,
        email: true,
        tenantKey: true,
        isActive: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!merchant) {
      console.log('❌ Merchant not found with tenantKey:', tenantKey);
      return;
    }

    console.log('✅ Merchant found:');
    console.log(`   ID: ${merchant.id}`);
    console.log(`   Name: ${merchant.name}`);
    console.log(`   Email: ${merchant.email}`);
    console.log(`   Tenant Key: ${merchant.tenantKey}`);
    console.log(`   Is Active: ${merchant.isActive}`);
    console.log(`   Total Products: ${merchant._count.products}\n`);

    // Get active products
    const activeProducts = await prisma.product.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        rentPrice: true,
        salePrice: true,
        isActive: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 10
    });

    console.log(`📦 Active Products (showing first 10):`);
    if (activeProducts.length === 0) {
      console.log('   ❌ No active products found');
    } else {
      activeProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`      Rent: $${product.rentPrice}, Sale: ${product.salePrice ? '$' + product.salePrice : 'N/A'}`);
        console.log(`      Category: ${product.category.name}`);
      });
    }

    // Get all products (including inactive)
    const allProducts = await prisma.product.findMany({
      where: {
        merchantId: merchant.id
      },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    const inactiveCount = allProducts.filter(p => !p.isActive).length;
    console.log(`\n📊 Summary:`);
    console.log(`   Total Products: ${allProducts.length}`);
    console.log(`   Active Products: ${activeProducts.length}`);
    console.log(`   Inactive Products: ${inactiveCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

const tenantKey = process.argv[2];

if (!tenantKey) {
  console.error('❌ Please provide tenantKey as argument');
  console.error('Usage: node scripts/check-merchant-products.js <tenantKey>');
  process.exit(1);
}

checkMerchantProducts(tenantKey);

