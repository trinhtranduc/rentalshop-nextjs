#!/usr/bin/env node

/**
 * Script to generate public IDs for existing data
 * This script populates the new publicId fields with sequential numbers
 * Run this after applying the database migration
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generatePublicIds() {
  console.log('🚀 Starting public ID generation...');
  
  try {
    // Generate public IDs for Users
    console.log('\n📝 Generating public IDs for Users...');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const publicId = i + 1;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { publicId }
      });
      
      console.log(`✅ User ${user.email}: ${publicId}`);
    }
    
    // Generate public IDs for Merchants
    console.log('\n🏢 Generating public IDs for Merchants...');
    const merchants = await prisma.merchant.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < merchants.length; i++) {
      const merchant = merchants[i];
      const publicId = i + 1;
      
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { publicId }
      });
      
      console.log(`✅ Merchant ${merchant.name}: ${publicId}`);
    }
    
    // Generate public IDs for Outlets
    console.log('\n🏪 Generating public IDs for Outlets...');
    const outlets = await prisma.outlet.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < outlets.length; i++) {
      const outlet = outlets[i];
      const publicId = i + 1;
      
      await prisma.outlet.update({
        where: { id: outlet.id },
        data: { publicId }
      });
      
      console.log(`✅ Outlet ${outlet.name}: ${publicId}`);
    }
    
    // Generate public IDs for Categories
    console.log('\n📂 Generating public IDs for Categories...');
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const publicId = i + 1;
      
      await prisma.category.update({
        where: { id: category.id },
        data: { publicId }
      });
      
      console.log(`✅ Category ${category.name}: ${publicId}`);
    }
    
    // Generate public IDs for Products
    console.log('\n📦 Generating public IDs for Products...');
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const publicId = i + 1;
      
      await prisma.product.update({
        where: { id: product.id },
        data: { publicId }
      });
      
      console.log(`✅ Product ${product.name}: ${publicId}`);
    }
    
    // Generate public IDs for Customers
    console.log('\n👥 Generating public IDs for Customers...');
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const publicId = i + 1;
      
      await prisma.customer.update({
        where: { id: customer.id },
        data: { publicId }
      });
      
      console.log(`✅ Customer ${customer.firstName} ${customer.lastName}: ${publicId}`);
    }
    
    // Generate public IDs for Orders
    console.log('\n📋 Generating public IDs for Orders...');
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const publicId = i + 1;
      
      await prisma.order.update({
        where: { id: order.id },
        data: { publicId }
      });
      
      console.log(`✅ Order ${order.orderNumber}: ${publicId}`);
    }
    
    console.log('\n🎉 Public ID generation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Merchants: ${merchants.length}`);
    console.log(`   Outlets: ${outlets.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Orders: ${orders.length}`);
    
  } catch (error) {
    console.error('❌ Error generating public IDs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generatePublicIds()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
