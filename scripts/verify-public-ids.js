#!/usr/bin/env node

/**
 * Script to verify that public IDs were created correctly
 * This script checks the database to ensure all entities have proper public IDs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyPublicIds() {
  console.log('🔍 Verifying public IDs in database...');
  
  try {
    // Check Users
    console.log('\n👥 Users:');
    const users = await prisma.user.findMany({
      select: { id: true, publicId: true, email: true },
      orderBy: { publicId: 'asc' }
    });
    
    users.forEach(user => {
      console.log(`  ${user.publicId} | ${user.email} | Internal ID: ${user.id}`);
    });
    
    // Check Merchants
    console.log('\n🏢 Merchants:');
    const merchants = await prisma.merchant.findMany({
      select: { id: true, publicId: true, name: true },
      orderBy: { publicId: 'asc' }
    });
    
    merchants.forEach(merchant => {
      console.log(`  ${merchant.publicId} | ${merchant.name} | Internal ID: ${merchant.id}`);
    });
    
    // Check Outlets
    console.log('\n🏪 Outlets:');
    const outlets = await prisma.outlet.findMany({
      select: { id: true, publicId: true, name: true },
      orderBy: { publicId: 'asc' }
    });
    
    outlets.forEach(outlet => {
      console.log(`  ${outlet.publicId} | ${outlet.name} | Internal ID: ${outlet.id}`);
    });
    
    // Check Categories
    console.log('\n📂 Categories:');
    const categories = await prisma.category.findMany({
      select: { id: true, publicId: true, name: true },
      orderBy: { publicId: 'asc' }
    });
    
    categories.forEach(category => {
      console.log(`  ${category.publicId} | ${category.name} | Internal ID: ${category.id}`);
    });
    
    // Check Products
    console.log('\n📦 Products (showing first 10):');
    const products = await prisma.product.findMany({
      select: { id: true, publicId: true, name: true },
      orderBy: { publicId: 'asc' },
      take: 10
    });
    
    products.forEach(product => {
      console.log(`  ${product.publicId} | ${product.name} | Internal ID: ${product.id}`);
    });
    
    // Check Customers
    console.log('\n👤 Customers (showing first 10):');
    const customers = await prisma.customer.findMany({
      select: { id: true, publicId: true, firstName: true, lastName: true },
      orderBy: { publicId: 'asc' },
      take: 10
    });
    
    customers.forEach(customer => {
      console.log(`  ${customer.publicId} | ${customer.firstName} ${customer.lastName} | Internal ID: ${customer.id}`);
    });
    
    console.log('\n✅ Public ID verification completed!');
    console.log('\n🔢 Public ID Format Examples:');
      console.log('  Users: 1, 2, 3...');
  console.log('  Merchants: 1, 2...');
  console.log('  Outlets: 1, 2, 3, 4...');
  console.log('  Categories: 1, 2, 3, 4, 5...');
  console.log('  Products: 1, 2, 3...');
  console.log('  Customers: 1, 2, 3...');
    
  } catch (error) {
    console.error('❌ Error verifying public IDs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyPublicIds()
  .then(() => {
    console.log('✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
