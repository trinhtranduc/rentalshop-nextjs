const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateComplete() {
  console.log('🚀 Starting complete subscription system migration...');
  
  try {
    // Step 1: Backup existing data
    console.log('📋 Step 1: Creating backup...');
    await createBackup();
    
    // Step 2: Migrate existing plan data to new format
    console.log('📋 Step 2: Migrating existing plan data...');
    await migratePlansData();
    
    // Step 3: Migrate subscription data
    console.log('📋 Step 3: Migrating subscription data...');
    await migrateSubscriptionsData();
    
    // Step 4: Update schema
    console.log('📋 Step 4: Updating database schema...');
    await updateSchema();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createBackup() {
  // Create backup tables
  await prisma.$executeRaw`
    CREATE TABLE plans_backup AS SELECT * FROM Plan;
  `;
  await prisma.$executeRaw`
    CREATE TABLE subscriptions_backup AS SELECT * FROM Subscription;
  `;
  console.log('✅ Backup created successfully');
}

async function migratePlansData() {
  const plans = await prisma.plan.findMany();
  console.log(`Found ${plans.length} plans to migrate`);
  
  for (const plan of plans) {
    // Create limits object from existing fields
    const limits = {
      outlets: plan.maxOutlets || 0,
      users: plan.maxUsers || 0,
      products: plan.maxProducts || 0,
      customers: plan.maxCustomers || 0
    };
    
    // Create features array from existing features string
    const features = plan.features ? plan.features.split(',').map(f => f.trim()).filter(f => f) : [];
    
    // Update the plan with new format
    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        limits: JSON.stringify(limits),
        features: JSON.stringify(features)
      }
    });
    
    console.log(`✅ Migrated plan: ${plan.name}`);
  }
}

async function migrateSubscriptionsData() {
  const subscriptions = await prisma.subscription.findMany();
  console.log(`Found ${subscriptions.length} subscriptions to migrate`);
  
  for (const subscription of subscriptions) {
    // Map billing intervals
    const intervalMap = {
      'month': 'month',
      'quarter': 'quarter',
      'semi_annual': 'semiAnnual',
      '6months': 'semiAnnual',
      'year': 'year'
    };
    
    const newInterval = intervalMap[subscription.interval] || 'month';
    
    // Update subscription with new format
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        billingInterval: newInterval
      }
    });
    
    console.log(`✅ Migrated subscription: ${subscription.publicId}`);
  }
}

async function updateSchema() {
  // Add new columns
  console.log('Adding new columns...');
  await prisma.$executeRaw`
    ALTER TABLE Plan ADD COLUMN limits_new TEXT;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan ADD COLUMN features_new TEXT;
  `;
  
  // Copy data to new columns
  console.log('Copying data to new columns...');
  await prisma.$executeRaw`
    UPDATE Plan SET limits_new = limits, features_new = features;
  `;
  
  // Drop old columns
  console.log('Dropping old columns...');
  await prisma.$executeRaw`
    ALTER TABLE Plan DROP COLUMN maxOutlets;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan DROP COLUMN maxUsers;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan DROP COLUMN maxProducts;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan DROP COLUMN maxCustomers;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan DROP COLUMN features;
  `;
  
  // Rename new columns
  console.log('Renaming new columns...');
  await prisma.$executeRaw`
    ALTER TABLE Plan RENAME COLUMN limits_new TO limits;
  `;
  await prisma.$executeRaw`
    ALTER TABLE Plan RENAME COLUMN features_new TO features;
  `;
  
  // Remove planId from Merchant table
  console.log('Removing planId from Merchant table...');
  await prisma.$executeRaw`
    ALTER TABLE Merchant DROP COLUMN planId;
  `;
  
  console.log('✅ Schema updated successfully');
}

// Run migration
migrateComplete()
  .then(() => {
    console.log('🎉 Complete migration finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
