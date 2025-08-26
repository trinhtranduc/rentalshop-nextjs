#!/usr/bin/env node

/**
 * Script to check for duplicate customer phone numbers and emails
 * This helps identify data issues before adding unique constraints
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomerDuplicates() {
  console.log('🔍 Checking for duplicate customer phone numbers and emails...');
  
  try {
    // Get all customers
    const customers = await prisma.customer.findMany({
      include: {
        merchant: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${customers.length} customers`);
    
    // Check for phone duplicates
    const phoneMap = new Map();
    const phoneDuplicates = [];
    
    for (const customer of customers) {
      if (customer.phone) {
        const key = `${customer.merchantId}:${customer.phone}`;
        if (phoneMap.has(key)) {
          phoneDuplicates.push({
            phone: customer.phone,
            merchant: customer.merchant.name,
            customer1: phoneMap.get(key),
            customer2: customer
          });
        } else {
          phoneMap.set(key, customer);
        }
      }
    }
    
    // Check for email duplicates
    const emailMap = new Map();
    const emailDuplicates = [];
    
    for (const customer of customers) {
      if (customer.email) {
        const key = `${customer.merchantId}:${customer.email}`;
        if (emailMap.has(key)) {
          emailDuplicates.push({
            email: customer.email,
            merchant: customer.merchant.name,
            customer1: emailMap.get(key),
            customer2: customer
          });
        } else {
          emailMap.set(key, customer);
        }
      }
    }
    
    // Report results
    console.log('\n📱 Phone Number Duplicates:');
    if (phoneDuplicates.length === 0) {
      console.log('✅ No phone number duplicates found');
    } else {
      console.log(`❌ Found ${phoneDuplicates.length} phone number duplicates:`);
      phoneDuplicates.forEach((dup, index) => {
        console.log(`\n   ${index + 1}. Phone: ${dup.phone} (Merchant: ${dup.merchant})`);
        console.log(`      Customer 1: ${dup.customer1.firstName} ${dup.customer1.lastName} (ID: ${dup.customer1.id})`);
        console.log(`      Customer 2: ${dup.customer2.firstName} ${dup.customer2.lastName} (ID: ${dup.customer2.id})`);
      });
    }
    
    console.log('\n📧 Email Duplicates:');
    if (emailDuplicates.length === 0) {
      console.log('✅ No email duplicates found');
    } else {
      console.log(`❌ Found ${emailDuplicates.length} email duplicates:`);
      emailDuplicates.forEach((dup, index) => {
        console.log(`\n   ${index + 1}. Email: ${dup.email} (Merchant: ${dup.merchant})`);
        console.log(`      Customer 1: ${dup.customer1.firstName} ${dup.customer1.lastName} (ID: ${dup.customer1.id})`);
        console.log(`      Customer 2: ${dup.customer2.firstName} ${dup.customer2.lastName} (ID: ${dup.customer2.id})`);
      });
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Total customers: ${customers.length}`);
    console.log(`   Phone duplicates: ${phoneDuplicates.length}`);
    console.log(`   Email duplicates: ${emailDuplicates.length}`);
    
    if (phoneDuplicates.length > 0 || emailDuplicates.length > 0) {
      console.log('\n⚠️  Duplicates found! You need to resolve these before adding unique constraints.');
      console.log('💡 Options to resolve duplicates:');
      console.log('   1. Merge duplicate customers (keep one, delete others)');
      console.log('   2. Update phone/email for duplicate customers');
      console.log('   3. Delete duplicate customers if they are truly duplicates');
      console.log('\n🔧 After resolving duplicates, run:');
      console.log('   npx prisma migrate dev --name add_customer_unique_constraints');
    } else {
      console.log('\n✅ No duplicates found! You can safely add unique constraints.');
      console.log('🔧 Run: npx prisma migrate dev --name add_customer_unique_constraints');
    }
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  checkCustomerDuplicates()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkCustomerDuplicates };
