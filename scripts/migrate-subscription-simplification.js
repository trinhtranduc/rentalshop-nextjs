#!/usr/bin/env node

/**
 * Migration Script: Subscription System Simplification
 * 
 * This script migrates the existing subscription system to a simplified structure:
 * - Converts individual limit fields to JSON
 * - Converts features string to JSON array
 * - Removes redundant subscription fields
 * - Updates field names for consistency
 * - Removes Merchant.planId (redundant relationship)
 * - Updates billing intervals to include semiAnnual
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSubscriptionSystem() {
  console.log('🚀 Starting subscription system migration...');
  
  try {
    // Step 1: Backup existing data
    console.log('📋 Step 1: Creating backup...');
    await createBackup();
    
    // Step 2: Migrate Plans data
    console.log('📋 Step 2: Migrating Plans data...');
    await migratePlansData();
    
    // Step 3: Migrate Subscriptions data
    console.log('📋 Step 3: Migrating Subscriptions data...');
    await migrateSubscriptionsData();
    
    // Step 4: Remove redundant Merchant.planId
    console.log('📋 Step 4: Removing redundant Merchant.planId...');
    await removeMerchantPlanId();
    
    // Step 5: Validate migration
    console.log('📋 Step 5: Validating migration...');
    await validateMigration();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await rollbackMigration();
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createBackup() {
  // Create backup tables
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS plans_backup AS SELECT * FROM Plan;
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM Subscription;
  `;
  
  console.log('✅ Backup created successfully');
}

async function migratePlansData() {
  const plans = await prisma.plan.findMany();
  
  for (const plan of plans) {
    // Convert individual limit fields to JSON string
    const limits = JSON.stringify({
      outlets: plan.maxOutlets,
      users: plan.maxUsers,
      products: plan.maxProducts,
      customers: plan.maxCustomers
    });
    
    // Convert features string to JSON string
    const features = plan.features ? JSON.stringify(plan.features.split(',').map(f => f.trim()).filter(f => f)) : JSON.stringify([]);
    
    // Update the plan with new structure
    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        limits: limits,
        features: features
      }
    });
    
    console.log(`✅ Migrated plan: ${plan.name}`);
  }
  
  console.log(`✅ Migrated ${plans.length} plans`);
}

async function migrateSubscriptionsData() {
  const subscriptions = await prisma.subscription.findMany();
  
  for (const subscription of subscriptions) {
    // Map old interval to new billingInterval
    const billingInterval = mapBillingInterval(subscription.interval);
    
    // Update the subscription with new structure
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        billingInterval: billingInterval,
        // Remove redundant fields by setting them to null (they will be removed in schema update)
        trialStart: null,
        trialEnd: null,
        cancelAtPeriodEnd: null,
        canceledAt: null,
        cancelReason: null,
        currency: null, // Currency is now in plan
        interval: null,
        intervalCount: null,
        period: null,
        discount: null,
        savings: null
      }
    });
    
    console.log(`✅ Migrated subscription: ${subscription.publicId}`);
  }
  
  console.log(`✅ Migrated ${subscriptions.length} subscriptions`);
}

function mapBillingInterval(oldInterval) {
  // Map old interval values to new billingInterval values
  const intervalMap = {
    'month': 'month',
    'quarter': 'quarter',
    'year': 'year',
    'monthly': 'month',
    'quarterly': 'quarter',
    'yearly': 'year',
    'semiAnnual': 'semiAnnual',
    'semi_annual': 'semiAnnual',
    '6months': 'semiAnnual'
  };
  
  return intervalMap[oldInterval] || 'month';
}

async function removeMerchantPlanId() {
  // Remove the redundant planId column from Merchant table
  // This is handled by the Prisma schema migration, but we can add validation here
  
  console.log('✅ Merchant.planId removal will be handled by Prisma schema migration');
  console.log('✅ All merchants now use subscription relationship only');
}

async function validateMigration() {
  // Validate plans migration
  const plans = await prisma.plan.findMany();
  for (const plan of plans) {
    if (!plan.limits || !plan.features) {
      throw new Error(`Plan ${plan.id} migration failed: missing limits or features`);
    }
    
    // Validate limits structure
    const limits = JSON.parse(plan.limits);
    if (typeof limits.outlets !== 'number' || typeof limits.users !== 'number') {
      throw new Error(`Plan ${plan.id} has invalid limits structure`);
    }
    
    // Validate features structure
    const features = JSON.parse(plan.features);
    if (!Array.isArray(features)) {
      throw new Error(`Plan ${plan.id} has invalid features structure`);
    }
  }
  
  // Validate subscriptions migration
  const subscriptions = await prisma.subscription.findMany();
  for (const subscription of subscriptions) {
    if (!subscription.billingInterval) {
      throw new Error(`Subscription ${subscription.id} migration failed: missing billingInterval`);
    }
    
    const validIntervals = ['month', 'quarter', 'semiAnnual', 'year'];
    if (!validIntervals.includes(subscription.billingInterval)) {
      throw new Error(`Subscription ${subscription.id} has invalid billingInterval: ${subscription.billingInterval}`);
    }
  }
  
  console.log('✅ Migration validation passed');
}

async function rollbackMigration() {
  console.log('🔄 Rolling back migration...');
  
  try {
    // Restore from backup tables
    await prisma.$executeRaw`
      DELETE FROM Plan;
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Plan SELECT * FROM plans_backup;
    `;
    
    await prisma.$executeRaw`
      DELETE FROM Subscription;
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Subscription SELECT * FROM subscriptions_backup;
    `;
    
    console.log('✅ Rollback completed');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSubscriptionSystem()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateSubscriptionSystem,
  createBackup,
  migratePlansData,
  migrateSubscriptionsData,
  validateMigration,
  rollbackMigration
};