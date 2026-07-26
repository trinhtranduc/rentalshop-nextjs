#!/usr/bin/env node

/**
 * Backfill default inactive LoyaltyProgram + base tier for merchants that don't have one.
 *
 * Usage:
 *   node scripts/backfill-loyalty-programs.js
 *   railway run --service apis node scripts/backfill-loyalty-programs.js
 *
 * Safe / idempotent: skips merchants that already have a LoyaltyProgram.
 * Does NOT activate existing programs.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_PROGRAM_NAME = 'Chương trình khách hàng thân thiết';
const DEFAULT_TIER_NAME = 'Thành viên';

async function provisionForMerchant(merchantId) {
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { merchantId },
  });

  if (existing) {
    const tier = await prisma.loyaltyTier.findFirst({
      where: { programId: existing.id, threshold: 0 },
      orderBy: { sortOrder: 'asc' },
    });
    if (!tier) {
      await prisma.loyaltyTier.create({
        data: {
          programId: existing.id,
          name: DEFAULT_TIER_NAME,
          threshold: 0,
          multiplier: 1,
          color: '#888888',
          sortOrder: 0,
        },
      });
      return { merchantId, status: 'tier_added', programId: existing.id };
    }
    return { merchantId, status: 'skipped', programId: existing.id };
  }

  const program = await prisma.loyaltyProgram.create({
    data: {
      merchantId,
      name: DEFAULT_PROGRAM_NAME,
      isActive: false,
    },
  });

  await prisma.loyaltyTier.create({
    data: {
      programId: program.id,
      name: DEFAULT_TIER_NAME,
      threshold: 0,
      multiplier: 1,
      color: '#888888',
      sortOrder: 0,
    },
  });

  return { merchantId, status: 'created', programId: program.id };
}

async function main() {
  console.log('🔄 Backfilling inactive loyalty programs for merchants...\n');

  const merchants = await prisma.merchant.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${merchants.length} merchant(s)\n`);

  let created = 0;
  let skipped = 0;
  let tierAdded = 0;

  for (const merchant of merchants) {
    const result = await provisionForMerchant(merchant.id);
    if (result.status === 'created') {
      created += 1;
      console.log(`✅ Created inactive program for #${merchant.id} ${merchant.name}`);
    } else if (result.status === 'tier_added') {
      tierAdded += 1;
      console.log(`➕ Added default tier for #${merchant.id} ${merchant.name}`);
    } else {
      skipped += 1;
    }
  }

  console.log('\n📊 Summary');
  console.log(`  created:    ${created}`);
  console.log(`  tier_added: ${tierAdded}`);
  console.log(`  skipped:    ${skipped}`);
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
