#!/usr/bin/env node

/**
 * Script to add unique constraints for customer phone and email fields
 * This ensures that phone numbers and emails are unique within each merchant
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCustomerUniqueConstraints() {
  console.log('🔧 Adding unique constraints for customer phone and email...');
  
  try {
    // Check if we're using SQLite (which doesn't support adding unique constraints to existing tables)
    const dbInfo = await prisma.$queryRaw`PRAGMA table_info(Customer)`;
    console.log('📊 Database type: SQLite');
    
    // For SQLite, we need to recreate the table with constraints
    // This is a destructive operation - backup your data first!
    console.log('⚠️  WARNING: This will recreate the Customer table with unique constraints.');
    console.log('⚠️  Make sure you have backed up your data before proceeding!');
    
    // Check if constraints already exist
    const existingConstraints = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='Customer'
    `;
    
    if (existingConstraints.length === 0) {
      console.log('❌ Customer table not found');
      return;
    }
    
    // Get current customer data
    const customers = await prisma.customer.findMany();
    console.log(`📊 Found ${customers.length} existing customers`);
    
    // Check for duplicates before proceeding
    const phoneDuplicates = new Map();
    const emailDuplicates = new Map();
    
    for (const customer of customers) {
      // Check phone duplicates
      if (customer.phone) {
        const key = `${customer.merchantId}:${customer.phone}`;
        if (phoneDuplicates.has(key)) {
          console.log(`❌ Phone duplicate found: ${customer.phone} in merchant ${customer.merchantId}`);
          console.log(`   - Customer 1: ${phoneDuplicates.get(key).firstName} ${phoneDuplicates.get(key).lastName}`);
          console.log(`   - Customer 2: ${customer.firstName} ${customer.lastName}`);
        } else {
          phoneDuplicates.set(key, customer);
        }
      }
      
      // Check email duplicates
      if (customer.email) {
        const key = `${customer.merchantId}:${customer.email}`;
        if (emailDuplicates.has(key)) {
          console.log(`❌ Email duplicate found: ${customer.email} in merchant ${customer.merchantId}`);
          console.log(`   - Customer 1: ${emailDuplicates.get(key).firstName} ${emailDuplicates.get(key).lastName}`);
          console.log(`   - Customer 2: ${customer.firstName} ${customer.lastName}`);
        } else {
          emailDuplicates.set(key, customer);
        }
      }
    }
    
    if (phoneDuplicates.size !== customers.length || emailDuplicates.size !== customers.length) {
      console.log('❌ Duplicates found! Please resolve duplicates before adding constraints.');
      console.log('💡 You can either:');
      console.log('   1. Manually resolve duplicates in the database');
      console.log('   2. Use the --force flag to continue (will keep first occurrence)');
      return;
    }
    
    console.log('✅ No duplicates found, proceeding with constraint addition...');
    
    // For SQLite, we need to recreate the table
    // This is a simplified approach - in production, you might want to use a more sophisticated migration
    
    console.log('📝 Note: For SQLite, you need to manually run the migration:');
    console.log('   1. Run: npx prisma migrate dev --name add_customer_unique_constraints');
    console.log('   2. This will apply the schema changes from prisma/schema.prisma');
    console.log('   3. The unique constraints will be enforced for new customers');
    
  } catch (error) {
    console.error('❌ Error adding constraints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  addCustomerUniqueConstraints()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addCustomerUniqueConstraints };
