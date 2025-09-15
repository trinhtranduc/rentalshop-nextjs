#!/usr/bin/env node

/**
 * Rollback Script: Subscription System Simplification
 * 
 * This script rolls back the subscription system simplification migration
 * by restoring data from backup tables.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function rollbackSubscriptionSystem() {
  console.log('🔄 Starting subscription system rollback...');
  
  try {
    // Check if backup tables exist
    const backupExists = await checkBackupTables();
    if (!backupExists) {
      throw new Error('Backup tables not found. Cannot rollback migration.');
    }
    
    // Step 1: Restore Plans data
    console.log('📋 Step 1: Restoring Plans data...');
    await restorePlansData();
    
    // Step 2: Restore Subscriptions data
    console.log('📋 Step 2: Restoring Subscriptions data...');
    await restoreSubscriptionsData();
    
    // Step 3: Validate rollback
    console.log('📋 Step 3: Validating rollback...');
    await validateRollback();
    
    // Step 4: Clean up backup tables
    console.log('📋 Step 4: Cleaning up backup tables...');
    await cleanupBackupTables();
    
    console.log('✅ Rollback completed successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function checkBackupTables() {
  try {
    const plansBackup = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='plans_backup';
    `;
    
    const subscriptionsBackup = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions_backup';
    `;
    
    return plansBackup.length > 0 && subscriptionsBackup.length > 0;
  } catch (error) {
    console.error('Error checking backup tables:', error);
    return false;
  }
}

async function restorePlansData() {
  // Clear current plans
  await prisma.plan.deleteMany();
  
  // Restore from backup
  await prisma.$executeRaw`
    INSERT INTO Plan SELECT * FROM plans_backup;
  `;
  
  console.log('✅ Plans data restored');
}

async function restoreSubscriptionsData() {
  // Clear current subscriptions
  await prisma.subscription.deleteMany();
  
  // Restore from backup
  await prisma.$executeRaw`
    INSERT INTO Subscription SELECT * FROM subscriptions_backup;
  `;
  
  console.log('✅ Subscriptions data restored');
}

async function validateRollback() {
  // Validate plans restoration
  const plans = await prisma.plan.findMany();
  console.log(`✅ Restored ${plans.length} plans`);
  
  // Validate subscriptions restoration
  const subscriptions = await prisma.subscription.findMany();
  console.log(`✅ Restored ${subscriptions.length} subscriptions`);
  
  // Check if old structure is restored
  const samplePlan = await prisma.plan.findFirst();
  if (samplePlan && samplePlan.maxOutlets !== undefined) {
    console.log('✅ Plan structure restored to original format');
  } else {
    throw new Error('Plan structure not properly restored');
  }
  
  const sampleSubscription = await prisma.subscription.findFirst();
  if (sampleSubscription && sampleSubscription.interval !== undefined) {
    console.log('✅ Subscription structure restored to original format');
  } else {
    throw new Error('Subscription structure not properly restored');
  }
}

async function cleanupBackupTables() {
  try {
    await prisma.$executeRaw`DROP TABLE IF EXISTS plans_backup;`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS subscriptions_backup;`;
    console.log('✅ Backup tables cleaned up');
  } catch (error) {
    console.error('Warning: Could not clean up backup tables:', error);
  }
}

// Run rollback if called directly
if (require.main === module) {
  rollbackSubscriptionSystem()
    .then(() => {
      console.log('🎉 Rollback completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Rollback failed:', error);
      process.exit(1);
    });
}

module.exports = {
  rollbackSubscriptionSystem,
  checkBackupTables,
  restorePlansData,
  restoreSubscriptionsData,
  validateRollback,
  cleanupBackupTables
};