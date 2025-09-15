const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSchemaSafely() {
  console.log('🚀 Starting safe schema migration...');
  
  try {
    // Step 1: Add new columns with default values
    console.log('📋 Step 1: Adding new columns with default values...');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan ADD COLUMN limits TEXT DEFAULT '{"outlets": 0, "users": 0, "products": 0, "customers": 0}';
    `;
    console.log('✅ Added limits column');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan ADD COLUMN features TEXT DEFAULT '[]';
    `;
    console.log('✅ Added features column');
    
    // Step 2: Migrate existing data
    console.log('📋 Step 2: Migrating existing plan data...');
    
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
      
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          limits: JSON.stringify(limits),
          features: JSON.stringify(features)
        }
      });
      
      console.log(`✅ Migrated plan: ${plan.name}`);
    }
    
    // Step 3: Remove old columns
    console.log('📋 Step 3: Removing old columns...');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan DROP COLUMN maxOutlets;
    `;
    console.log('✅ Removed maxOutlets column');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan DROP COLUMN maxUsers;
    `;
    console.log('✅ Removed maxUsers column');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan DROP COLUMN maxProducts;
    `;
    console.log('✅ Removed maxProducts column');
    
    await prisma.$executeRaw`
      ALTER TABLE Plan DROP COLUMN maxCustomers;
    `;
    console.log('✅ Removed maxCustomers column');
    
    // Step 4: Remove planId from Merchant table
    console.log('📋 Step 4: Removing planId from Merchant table...');
    
    await prisma.$executeRaw`
      ALTER TABLE Merchant DROP COLUMN planId;
    `;
    console.log('✅ Removed planId from Merchant table');
    
    console.log('✅ Schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSchemaSafely()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
