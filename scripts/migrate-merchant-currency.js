#!/usr/bin/env node

/**
 * Migration Script: Add Currency to Merchants
 * 
 * This script sets the default currency (USD) for all existing merchants
 * that don't have a currency set yet.
 * 
 * Usage:
 *   node scripts/migrate-merchant-currency.js
 * 
 * What it does:
 * 1. Connects to the database
 * 2. Finds all merchants without a currency field
 * 3. Sets their currency to 'USD' (default)
 * 4. Verifies the migration
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateMerchantCurrency() {
  console.log('🚀 Starting merchant currency migration...\n');

  try {
    // Step 1: Count merchants that need migration
    const merchantsWithoutCurrency = await prisma.merchant.count({
      where: {
        OR: [
          { currency: null },
          { currency: '' }
        ]
      }
    });

    console.log(`📊 Found ${merchantsWithoutCurrency} merchants without currency`);

    if (merchantsWithoutCurrency === 0) {
      console.log('✅ All merchants already have a currency set!');
      return;
    }

    // Step 2: Update merchants to use USD as default currency
    console.log('⏳ Setting currency to USD for all merchants without currency...');
    
    const result = await prisma.merchant.updateMany({
      where: {
        OR: [
          { currency: null },
          { currency: '' }
        ]
      },
      data: {
        currency: 'USD'
      }
    });

    console.log(`✅ Updated ${result.count} merchants to use USD currency`);

    // Step 3: Verify migration
    console.log('\n🔍 Verifying migration...');
    
    const totalMerchants = await prisma.merchant.count();
    const merchantsWithCurrency = await prisma.merchant.count({
      where: {
        currency: {
          not: null,
          not: ''
        }
      }
    });

    const merchantsUSD = await prisma.merchant.count({
      where: { currency: 'USD' }
    });

    const merchantsVND = await prisma.merchant.count({
      where: { currency: 'VND' }
    });

    console.log('\n📈 Migration Results:');
    console.log(`   Total merchants: ${totalMerchants}`);
    console.log(`   Merchants with currency: ${merchantsWithCurrency}`);
    console.log(`   USD merchants: ${merchantsUSD}`);
    console.log(`   VND merchants: ${merchantsVND}`);

    // Step 4: Update related subscriptions to use merchant's currency
    console.log('\n⏳ Updating subscriptions to match merchant currency...');
    
    const merchants = await prisma.merchant.findMany({
      select: { id: true, currency: true }
    });

    let subscriptionsUpdated = 0;
    for (const merchant of merchants) {
      const updated = await prisma.subscription.updateMany({
        where: {
          merchantId: merchant.id,
          currency: {
            not: merchant.currency
          }
        },
        data: {
          currency: merchant.currency
        }
      });
      subscriptionsUpdated += updated.count;
    }

    console.log(`✅ Updated ${subscriptionsUpdated} subscriptions to match merchant currency`);

    // Step 5: Final verification
    const verification = await prisma.merchant.findMany({
      where: {
        OR: [
          { currency: null },
          { currency: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (verification.length > 0) {
      console.log('\n⚠️  Warning: Some merchants still don\'t have currency:');
      verification.forEach(m => {
        console.log(`   - ID: ${m.id}, Name: ${m.name}, Email: ${m.email}`);
      });
    } else {
      console.log('\n✅ All merchants have a valid currency!');
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateMerchantCurrency()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

