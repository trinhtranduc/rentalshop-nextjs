/**
 * Script to update tenantKey for existing merchants that don't have one
 * 
 * Usage:
 *   npx tsx scripts/update-merchant-tenant-keys.ts
 * 
 * This script will:
 * 1. Find all merchants with null tenantKey
 * 2. Generate unique tenantKey for each merchant
 * 3. Update merchants in database
 */

import { prisma } from '../packages/database/src/client';
import { generateUniqueTenantKey } from '../packages/utils/src/core/tenant-key';

async function updateMerchantTenantKeys() {
  console.log('🔄 Starting tenantKey update for existing merchants...\n');

  try {
    // Find all merchants without tenantKey
    const merchantsWithoutTenantKey = await prisma.merchant.findMany({
      where: {
        OR: [
          { tenantKey: null },
          { tenantKey: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        tenantKey: true
      }
    });

    console.log(`📊 Found ${merchantsWithoutTenantKey.length} merchants without tenantKey\n`);

    if (merchantsWithoutTenantKey.length === 0) {
      console.log('✅ All merchants already have tenantKey. Nothing to update.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const merchant of merchantsWithoutTenantKey) {
      try {
        // Generate unique tenantKey
        const tenantKey = await generateUniqueTenantKey(
          merchant.name,
          async (key: string) => {
            const existing = await prisma.merchant.findUnique({
              where: { tenantKey: key }
            });
            return !!existing;
          }
        );

        // Update merchant with new tenantKey
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { tenantKey }
        });

        console.log(`✅ Updated merchant "${merchant.name}" (ID: ${merchant.id}) with tenantKey: ${tenantKey}`);
        updated++;
      } catch (error: any) {
        console.error(`❌ Failed to update merchant "${merchant.name}" (ID: ${merchant.id}):`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${merchantsWithoutTenantKey.length}`);

    if (updated > 0) {
      console.log('\n✅ TenantKey update completed successfully!');
    }

  } catch (error: any) {
    console.error('❌ Error updating tenantKeys:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateMerchantTenantKeys()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

