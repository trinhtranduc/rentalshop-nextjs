/**
 * Seed script for the tenant registry (main) database.
 *
 * Run after pushing the main schema:
 *   yarn db:generate-main
 *   yarn db:push-main
 *   node scripts/seed-main-registry.js
 */

/* eslint-disable no-console */
const path = require('path');

function loadMainPrismaClient() {
  try {
    // Generated client path defined in prisma/main/schema.prisma (output option)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require('../packages/database/src/generated/main').PrismaClient;
  } catch (error) {
    console.error('\n❌ Unable to load main Prisma client.');
    console.error('   Ensure you have generated it with: yarn db:generate-main\n');
    throw error;
  }
}

// Lazy load environment variables from .env if present
require('dotenv').config({
  path: path.resolve(process.cwd(), '.env'),
});

const { SUBSCRIPTION_PLANS, TRIAL_CONFIG } = require('@rentalshop/constants');

const MainPrismaClient = loadMainPrismaClient();
const prisma = new MainPrismaClient();

const DEFAULT_TENANT_KEY = process.env.SEED_TENANT_KEY || 'demo';
const DEFAULT_TENANT_NAME = process.env.SEED_TENANT_NAME || 'Demo Tenant';
const DEFAULT_TENANT_DATABASE_URL =
  process.env.SEED_TENANT_DATABASE_URL || process.env.DATABASE_URL;

function getTrialEndDate(plan) {
  const trialDays =
    plan.trialPeriodDays ??
    TRIAL_CONFIG?.DEFAULT_TRIAL_DAYS ??
    14;

  return trialDays > 0
    ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    : null;
}

async function upsertPlans() {
  const planEntries = Object.values(SUBSCRIPTION_PLANS);

  console.log(`\n📦 Seeding ${planEntries.length} plans into tenant registry...`);

  for (const plan of planEntries) {
    await prisma.plan.upsert({
      where: { code: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        interval: 'MONTHLY',
        trialPeriodDays:
          typeof plan.trialPeriodDays === 'number'
            ? plan.trialPeriodDays
            : TRIAL_CONFIG?.DEFAULT_TRIAL_DAYS ?? 14,
        price: plan.basePrice,
        currency: plan.currency,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        limits: plan.limits,
        features: plan.features,
        metadata: {
          platform: plan.platform,
          publicProductCheck: plan.publicProductCheck,
          upgradeFrom: plan.upgradeFrom ?? [],
          downgradeTo: plan.downgradeTo ?? [],
          badge: plan.badge ?? null,
        },
      },
      create: {
        code: plan.id,
        name: plan.name,
        description: plan.description,
        interval: 'MONTHLY',
        trialPeriodDays:
          typeof plan.trialPeriodDays === 'number'
            ? plan.trialPeriodDays
            : TRIAL_CONFIG?.DEFAULT_TRIAL_DAYS ?? 14,
        price: plan.basePrice,
        currency: plan.currency,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        limits: plan.limits,
        features: plan.features,
        metadata: {
          platform: plan.platform,
          publicProductCheck: plan.publicProductCheck,
          upgradeFrom: plan.upgradeFrom ?? [],
          downgradeTo: plan.downgradeTo ?? [],
          badge: plan.badge ?? null,
        },
      },
    });
  }

  console.log('✅ Plans seeded.');
}

async function bootstrapDefaultTenant() {
  if (!DEFAULT_TENANT_DATABASE_URL) {
    console.warn(
      '\n⚠️  SEED_TENANT_DATABASE_URL or DATABASE_URL not set. Skipping default tenant bootstrap.\n'
    );
    return;
  }

  console.log(`\n🏢 Bootstrapping default tenant "${DEFAULT_TENANT_KEY}"...`);

  const tenant = await prisma.tenant.upsert({
    where: { tenantKey: DEFAULT_TENANT_KEY },
    update: {
      name: DEFAULT_TENANT_NAME,
      databaseUrl: DEFAULT_TENANT_DATABASE_URL,
      status: 'ACTIVE',
    },
    create: {
      tenantKey: DEFAULT_TENANT_KEY,
      name: DEFAULT_TENANT_NAME,
      databaseUrl: DEFAULT_TENANT_DATABASE_URL,
      status: 'ACTIVE',
      metadata: {
        seeded: true,
      },
    },
  });

  console.log(`   ✅ Tenant ready (id: ${tenant.id})`);

  const trialPlan = await prisma.plan.findUnique({
    where: { code: 'trial' },
  });

  if (!trialPlan) {
    console.warn('   ⚠️ No plan with code "trial" found. Skipping subscription creation.');
    return;
  }

  const subscription = await prisma.subscription.upsert({
    where: {
      tenantId_planId: {
        tenantId: tenant.id,
        planId: trialPlan.id,
      },
    },
    update: {
      status: 'TRIAL',
      currentPeriodStart: new Date(),
      currentPeriodEnd: getTrialEndDate(trialPlan) ?? new Date(),
      trialEndsAt: getTrialEndDate(trialPlan),
    },
    create: {
      tenantId: tenant.id,
      planId: trialPlan.id,
      status: 'TRIAL',
      currentPeriodStart: new Date(),
      currentPeriodEnd: getTrialEndDate(trialPlan) ?? new Date(),
      trialEndsAt: getTrialEndDate(trialPlan),
      metadata: {
        seeded: true,
      },
    },
  });

  console.log(
    `   ✅ Subscription ready (status: ${subscription.status}, period end: ${subscription.currentPeriodEnd.toISOString()})`
  );
}

async function main() {
  console.log('🚀 Seeding tenant registry database\n');

  await upsertPlans();
  await bootstrapDefaultTenant();

  console.log('\n🎉 Tenant registry seeding completed!\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Failed to seed tenant registry database.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

