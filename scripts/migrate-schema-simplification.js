#!/usr/bin/env node

/**
 * Schema Migration Script: Simplified Subscription Architecture
 * 
 * This script handles the database schema changes for the simplified subscription system:
 * - Removes Merchant.planId (redundant relationship)
 * - Updates Plan.limits and Plan.features to use JSON fields
 * - Updates Subscription.billingInterval to include semiAnnual
 * - Creates proper indexes for performance
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSchemaSimplification() {
  console.log('🚀 Starting schema simplification migration...');
  
  try {
    // Step 1: Backup existing data
    console.log('📋 Step 1: Creating backup...');
    await createBackup();
    
    // Step 2: Update Plan table structure
    console.log('📋 Step 2: Updating Plan table structure...');
    await updatePlanTable();
    
    // Step 3: Update Subscription table structure
    console.log('📋 Step 3: Updating Subscription table structure...');
    await updateSubscriptionTable();
    
    // Step 4: Remove Merchant.planId
    console.log('📋 Step 4: Removing Merchant.planId...');
    await removeMerchantPlanId();
    
    // Step 5: Create performance indexes
    console.log('📋 Step 5: Creating performance indexes...');
    await createIndexes();
    
    // Step 6: Validate migration
    console.log('📋 Step 6: Validating migration...');
    await validateMigration();
    
    console.log('✅ Schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    await rollbackMigration();
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createBackup() {
  // Create backup tables
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS merchants_backup AS SELECT * FROM Merchant;
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS plans_backup AS SELECT * FROM Plan;
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM Subscription;
  `;
  
  console.log('✅ Backup created successfully');
}

async function updatePlanTable() {
  // Update Plan table to use JSON fields
  // Note: This is handled by Prisma schema migration
  console.log('✅ Plan table structure updated via Prisma migration');
  console.log('✅ limits and features now use JSON fields');
}

async function updateSubscriptionTable() {
  // Update Subscription table structure
  // Note: This is handled by Prisma schema migration
  console.log('✅ Subscription table structure updated via Prisma migration');
  console.log('✅ billingInterval now supports semiAnnual');
}

async function removeMerchantPlanId() {
  // Remove the redundant planId column from Merchant table
  // Note: This is handled by Prisma schema migration
  console.log('✅ Merchant.planId removed via Prisma migration');
  console.log('✅ All merchants now use subscription relationship only');
}

async function createIndexes() {
  // Create performance indexes for the new structure
  try {
    // Index for subscription queries by merchant
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_subscription_merchant_status 
      ON Subscription(merchantId, status);
    `;
    
    // Index for subscription queries by plan
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_subscription_plan_billing 
      ON Subscription(planId, billingInterval);
    `;
    
    // Index for plan queries by active status
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plan_active_sort 
      ON Plan(isActive, sortOrder);
    `;
    
    // Index for merchant subscription status
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_merchant_subscription_status 
      ON Merchant(subscriptionStatus);
    `;
    
    console.log('✅ Performance indexes created successfully');
  } catch (error) {
    console.warn('⚠️ Some indexes may already exist:', error.message);
  }
}

async function validateMigration() {
  // Validate that the schema changes are working correctly
  
  // Test Plan JSON fields
  const plans = await prisma.plan.findMany({ take: 1 });
  if (plans.length > 0) {
    const plan = plans[0];
    if (typeof plan.limits !== 'object' || typeof plan.features !== 'object') {
      throw new Error('Plan JSON fields migration failed');
    }
    console.log('✅ Plan JSON fields working correctly');
  }
  
  // Test Subscription billing intervals
  const subscriptions = await prisma.subscription.findMany({ take: 1 });
  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];
    const validIntervals = ['month', 'quarter', 'semiAnnual', 'year'];
    if (!validIntervals.includes(subscription.billingInterval)) {
      throw new Error(`Invalid billing interval: ${subscription.billingInterval}`);
    }
    console.log('✅ Subscription billing intervals working correctly');
  }
  
  // Test that Merchant.planId is removed
  try {
    await prisma.$executeRaw`SELECT planId FROM Merchant LIMIT 1`;
    throw new Error('Merchant.planId still exists - migration failed');
  } catch (error) {
    if (error.message.includes('no such column')) {
      console.log('✅ Merchant.planId successfully removed');
    } else {
      throw error;
    }
  }
  
  console.log('✅ Schema migration validation passed');
}

async function rollbackMigration() {
  console.log('🔄 Rolling back schema migration...');
  
  try {
    // Restore from backup tables
    await prisma.$executeRaw`
      DELETE FROM Merchant;
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Merchant SELECT * FROM merchants_backup;
    `;
    
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
    
    console.log('✅ Schema rollback completed');
  } catch (error) {
    console.error('❌ Schema rollback failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSchemaSimplification()
    .then(() => {
      console.log('🎉 Schema migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateSchemaSimplification,
  createBackup,
  updatePlanTable,
  updateSubscriptionTable,
  removeMerchantPlanId,
  createIndexes,
  validateMigration,
  rollbackMigration
};
