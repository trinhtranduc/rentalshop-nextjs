#!/usr/bin/env node

/**
 * Generate Massive Test Data for Stress Testing
 * Target: 1M orders, 10K stores, 100K users, 1M products, 10K customers
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

// Target configuration
const TARGET_CONFIG = {
  MERCHANTS: 100,           // 100 merchants
  OUTLETS_PER_MERCHANT: 100, // 10,000 total outlets
  USERS_PER_OUTLET: 10,      // 100,000 total users
  CUSTOMERS_PER_MERCHANT: 100, // 10,000 total customers
  PRODUCTS_PER_MERCHANT: 10000, // 1,000,000 total products
  ORDERS_PER_OUTLET: 100,    // 1,000,000 total orders
  BATCH_SIZE: 5000,         // Insert in batches of 5000
};

const ORDER_TYPES = ['RENT', 'SALE', 'RENT_TO_OWN'];
const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'CREDIT'];
const PAYMENT_TYPES = ['DEPOSIT', 'PAYMENT', 'REFUND'];

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderNumber(outletId, sequence) {
  return `ORD-${String(outletId).padStart(5, '0')}-${String(sequence).padStart(6, '0')}`;
}

async function createMassiveMerchants() {
  console.log(`🏢 Creating ${TARGET_CONFIG.MERCHANTS} merchants...`);
  
  const merchants = [];
  const batchSize = 50;
  
  for (let i = 0; i < TARGET_CONFIG.MERCHANTS; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < TARGET_CONFIG.MERCHANTS; j++) {
      const merchantId = i + j + 1;
      batch.push({
        name: `Massive Merchant ${merchantId}`,
        email: `merchant${merchantId}@stress-test.com`,
        phone: `+123456789${String(merchantId).padStart(3, '0')}`,
        address: `Stress Test Address ${merchantId}`,
        city: 'Stress City',
        state: 'Stress State',
        zipCode: `1234${String(merchantId).padStart(3, '0')}`,
        country: 'Stress Country',
        businessType: 'Rental Shop',
        description: `Stress test merchant ${merchantId}`,
        planId: 1,
        subscriptionStatus: 'active',
        isActive: true,
      });
    }
    
    try {
      const createdMerchants = await prisma.merchant.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      console.log(`   Created batch ${Math.floor(i/batchSize) + 1}: ${batch.length} merchants`);
    } catch (error) {
      console.error(`   Error creating merchant batch: ${error.message}`);
    }
  }
  
  // Fetch all created merchants
  const allMerchants = await prisma.merchant.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`✅ Created ${allMerchants.length} merchants`);
  return allMerchants;
}

async function createMassiveOutlets(merchants) {
  console.log(`🏪 Creating ${merchants.length * TARGET_CONFIG.OUTLETS_PER_MERCHANT} outlets...`);
  
  const outlets = [];
  const batchSize = 1000;
  
  for (const merchant of merchants) {
    for (let i = 0; i < TARGET_CONFIG.OUTLETS_PER_MERCHANT; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && (i + j) < TARGET_CONFIG.OUTLETS_PER_MERCHANT; j++) {
        const outletId = i + j + 1;
        batch.push({
          name: `Outlet ${outletId} - ${merchant.name}`,
          address: `Outlet Address ${outletId}`,
          phone: `+123456789${String(merchant.id).padStart(3, '0')}${String(outletId).padStart(3, '0')}`,
          city: 'Stress City',
          state: 'Stress State',
          zipCode: `1234${String(merchant.id).padStart(3, '0')}${String(outletId).padStart(3, '0')}`,
          country: 'Stress Country',
          description: `Stress test outlet ${outletId}`,
          isActive: true,
          merchantId: merchant.id,
        });
      }
      
      try {
        await prisma.outlet.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`   Merchant ${merchant.id}: Created batch ${Math.floor(i/batchSize) + 1} (${batch.length} outlets)`);
      } catch (error) {
        console.error(`   Error creating outlet batch for merchant ${merchant.id}: ${error.message}`);
      }
    }
  }
  
  // Fetch all created outlets
  const allOutlets = await prisma.outlet.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`✅ Created ${allOutlets.length} outlets`);
  return allOutlets;
}

async function createMassiveCustomers(merchants) {
  console.log(`👥 Creating ${merchants.length * TARGET_CONFIG.CUSTOMERS_PER_MERCHANT} customers...`);
  
  const customers = [];
  const batchSize = 1000;
  
  for (const merchant of merchants) {
    for (let i = 0; i < TARGET_CONFIG.CUSTOMERS_PER_MERCHANT; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && (i + j) < TARGET_CONFIG.CUSTOMERS_PER_MERCHANT; j++) {
        const customerId = i + j + 1;
        batch.push({
          firstName: `Customer${customerId}`,
          lastName: `Last${customerId}`,
          email: `customer${customerId}.merchant${merchant.id}@stress-test.com`,
          phone: `+123456789${String(merchant.id).padStart(3, '0')}${String(customerId).padStart(4, '0')}`,
          address: `Customer Address ${customerId}`,
          city: 'Stress City',
          state: 'Stress State',
          zipCode: `1234${String(merchant.id).padStart(3, '0')}${String(customerId).padStart(4, '0')}`,
          country: 'Stress Country',
          isActive: true,
          merchantId: merchant.id,
        });
      }
      
      try {
        await prisma.customer.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`   Merchant ${merchant.id}: Created batch ${Math.floor(i/batchSize) + 1} (${batch.length} customers)`);
      } catch (error) {
        console.error(`   Error creating customer batch for merchant ${merchant.id}: ${error.message}`);
      }
    }
  }
  
  // Fetch all created customers
  const allCustomers = await prisma.customer.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`✅ Created ${allCustomers.length} customers`);
  return allCustomers;
}

async function createMassiveProducts(merchants) {
  console.log(`📦 Creating ${merchants.length * TARGET_CONFIG.PRODUCTS_PER_MERCHANT} products...`);
  
  const products = [];
  const batchSize = 1000;
  
  for (const merchant of merchants) {
    // Create default category
    const category = await prisma.category.create({
      data: {
        name: `Default Category - Merchant ${merchant.id}`,
        description: 'Default category for stress testing',
        isActive: true,
        merchantId: merchant.id,
      }
    });
    
    for (let i = 0; i < TARGET_CONFIG.PRODUCTS_PER_MERCHANT; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && (i + j) < TARGET_CONFIG.PRODUCTS_PER_MERCHANT; j++) {
        const productId = i + j + 1;
        batch.push({
          name: `Product ${productId} - Merchant ${merchant.id}`,
          description: `Stress test product ${productId}`,
          barcode: `BC${String(merchant.id).padStart(3, '0')}${String(productId).padStart(6, '0')}`,
          totalStock: randomInt(10, 1000),
          rentPrice: randomFloat(10, 1000),
          salePrice: randomFloat(100, 2000),
          deposit: randomFloat(50, 500),
          isActive: true,
          merchantId: merchant.id,
          categoryId: category.id,
        });
      }
      
      try {
        await prisma.product.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`   Merchant ${merchant.id}: Created batch ${Math.floor(i/batchSize) + 1} (${batch.length} products)`);
      } catch (error) {
        console.error(`   Error creating product batch for merchant ${merchant.id}: ${error.message}`);
      }
    }
  }
  
  // Fetch all created products
  const allProducts = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`✅ Created ${allProducts.length} products`);
  return allProducts;
}

async function createMassiveUsers(merchants, outlets) {
  console.log(`👤 Creating ${merchants.length * TARGET_CONFIG.OUTLETS_PER_MERCHANT * TARGET_CONFIG.USERS_PER_OUTLET} users...`);
  
  const users = [];
  const batchSize = 1000;
  
  for (const merchant of merchants) {
    const merchantOutlets = outlets.filter(o => o.merchantId === merchant.id);
    
    // Create merchant admin
    await prisma.user.create({
      data: {
        email: `admin.merchant${merchant.id}@stress-test.com`,
        password: 'hashedpassword123',
        firstName: `Merchant${merchant.id}`,
        lastName: 'Admin',
        phone: `+123456789${merchant.id}`,
        role: 'MERCHANT',
        isActive: true,
        merchantId: merchant.id,
      }
    });
    
    for (const outlet of merchantOutlets) {
      // Create outlet users
      const outletBatch = [];
      
      // Outlet admin
      outletBatch.push({
        email: `admin.outlet${outlet.id}@stress-test.com`,
        password: 'hashedpassword123',
        firstName: `Outlet${outlet.id}`,
        lastName: 'Admin',
        phone: `+123456789${outlet.id}`,
        role: 'OUTLET_ADMIN',
        isActive: true,
        merchantId: merchant.id,
        outletId: outlet.id,
      });
      
      // Outlet staff
      for (let i = 1; i < TARGET_CONFIG.USERS_PER_OUTLET; i++) {
        outletBatch.push({
          email: `staff${i}.outlet${outlet.id}@stress-test.com`,
          password: 'hashedpassword123',
          firstName: `Staff${i}`,
          lastName: `Outlet${outlet.id}`,
          phone: `+123456789${outlet.id}${i}`,
          role: 'OUTLET_STAFF',
          isActive: true,
          merchantId: merchant.id,
          outletId: outlet.id,
        });
      }
      
      try {
        await prisma.user.createMany({
          data: outletBatch,
          skipDuplicates: true
        });
        
        console.log(`   Outlet ${outlet.id}: Created ${outletBatch.length} users`);
      } catch (error) {
        console.error(`   Error creating users for outlet ${outlet.id}: ${error.message}`);
      }
    }
  }
  
  // Fetch all created users
  const allUsers = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`✅ Created ${allUsers.length} users`);
  return allUsers;
}

async function createMassiveOrders(outlets, customers, products, users) {
  console.log(`📋 Creating ${outlets.length * TARGET_CONFIG.ORDERS_PER_OUTLET} orders...`);
  
  const orders = [];
  const batchSize = TARGET_CONFIG.BATCH_SIZE;
  const startDate = new Date('2020-01-01');
  const endDate = new Date('2024-12-31');
  
  let orderCounts = {}; // Track order numbers per outlet
  outlets.forEach(outlet => {
    orderCounts[outlet.id] = 1;
  });
  
  for (let outletIndex = 0; outletIndex < outlets.length; outletIndex++) {
    const outlet = outlets[outletIndex];
    const outletCustomers = customers.filter(c => c.merchantId === outlet.merchantId);
    const outletUsers = users.filter(u => u.outletId === outlet.id);
    const merchantProducts = products.filter(p => p.merchantId === outlet.merchantId);
    
    console.log(`   Processing outlet ${outlet.id}/${outlets.length} (Merchant ${outlet.merchantId})`);
    
    for (let orderIndex = 0; orderIndex < TARGET_CONFIG.ORDERS_PER_OUTLET; orderIndex += batchSize) {
      const currentBatchSize = Math.min(batchSize, TARGET_CONFIG.ORDERS_PER_OUTLET - orderIndex);
      const batch = [];
      
      for (let j = 0; j < currentBatchSize; j++) {
        const customer = randomChoice(outletCustomers);
        const user = randomChoice(outletUsers);
        const orderType = randomChoice(ORDER_TYPES);
        const status = randomChoice(ORDER_STATUSES);
        
        const orderNumber = generateOrderNumber(outlet.id, orderCounts[outlet.id]++);
        const totalAmount = randomFloat(50, 5000);
        const depositAmount = randomFloat(0, totalAmount * 0.5);
        
        batch.push({
          orderNumber,
          orderType,
          status,
          totalAmount,
          depositAmount,
          securityDeposit: randomFloat(0, 500),
          damageFee: randomFloat(0, 200),
          lateFee: randomFloat(0, 100),
          discountType: Math.random() > 0.8 ? 'PERCENTAGE' : null,
          discountValue: Math.random() > 0.8 ? randomFloat(5, 20) : 0,
          discountAmount: Math.random() > 0.8 ? randomFloat(10, 200) : 0,
          pickupPlanAt: orderType === 'RENT' ? randomDate(startDate, endDate) : null,
          returnPlanAt: orderType === 'RENT' ? randomDate(startDate, endDate) : null,
          pickedUpAt: status === 'PICKUPED' || status === 'RETURNED' ? randomDate(startDate, endDate) : null,
          returnedAt: status === 'RETURNED' ? randomDate(startDate, endDate) : null,
          rentalDuration: orderType === 'RENT' ? randomInt(1, 365) : null,
          isReadyToDeliver: Math.random() > 0.5,
          notes: Math.random() > 0.7 ? `Stress test order notes ${orderIndex + j}` : null,
          createdAt: randomDate(startDate, endDate),
          updatedAt: new Date(),
          outletId: outlet.id,
          customerId: customer.id,
          createdById: user.id,
        });
      }
      
      try {
        await prisma.order.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`     Batch ${Math.floor(orderIndex/batchSize) + 1}: ${batch.length} orders`);
      } catch (error) {
        console.error(`     Error creating order batch: ${error.message}`);
      }
    }
  }
  
  // Fetch final count
  const totalOrders = await prisma.order.count();
  console.log(`✅ Created ${totalOrders.toLocaleString()} orders`);
  return totalOrders;
}

async function main() {
  console.log('🚀 Starting Massive Data Generation for Stress Testing');
  console.log('=' .repeat(80));
  console.log(`📊 Target Dataset:`);
  console.log(`   • Merchants: ${TARGET_CONFIG.MERCHANTS.toLocaleString()}`);
  console.log(`   • Outlets: ${(TARGET_CONFIG.MERCHANTS * TARGET_CONFIG.OUTLETS_PER_MERCHANT).toLocaleString()}`);
  console.log(`   • Users: ${(TARGET_CONFIG.MERCHANTS * TARGET_CONFIG.OUTLETS_PER_MERCHANT * TARGET_CONFIG.USERS_PER_OUTLET).toLocaleString()}`);
  console.log(`   • Customers: ${(TARGET_CONFIG.MERCHANTS * TARGET_CONFIG.CUSTOMERS_PER_MERCHANT).toLocaleString()}`);
  console.log(`   • Products: ${(TARGET_CONFIG.MERCHANTS * TARGET_CONFIG.PRODUCTS_PER_MERCHANT).toLocaleString()}`);
  console.log(`   • Orders: ${(TARGET_CONFIG.MERCHANTS * TARGET_CONFIG.OUTLETS_PER_MERCHANT * TARGET_CONFIG.ORDERS_PER_OUTLET).toLocaleString()}`);
  console.log('=' .repeat(80));
  
  const startTime = performance.now();
  
  try {
    // Create base data
    const merchants = await createMassiveMerchants();
    const outlets = await createMassiveOutlets(merchants);
    const customers = await createMassiveCustomers(merchants);
    const products = await createMassiveProducts(merchants);
    const users = await createMassiveUsers(merchants, outlets);
    
    // Create orders
    const totalOrders = await createMassiveOrders(outlets, customers, products, users);
    
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 MASSIVE DATA GENERATION COMPLETED!');
    console.log('='.repeat(80));
    console.log(`⏱️  Total time: ${duration} seconds (${Math.round(duration/60)} minutes)`);
    console.log(`📊 Final database stats:`);
    
    const stats = await Promise.all([
      prisma.merchant.count(),
      prisma.outlet.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
    ]);
    
    console.log(`   • Merchants: ${stats[0].toLocaleString()}`);
    console.log(`   • Outlets: ${stats[1].toLocaleString()}`);
    console.log(`   • Customers: ${stats[2].toLocaleString()}`);
    console.log(`   • Products: ${stats[3].toLocaleString()}`);
    console.log(`   • Users: ${stats[4].toLocaleString()}`);
    console.log(`   • Orders: ${stats[5].toLocaleString()}`);
    
    console.log('\n💡 Ready for stress testing!');
    console.log('   Run stress tests with:');
    console.log('   • artillery run stress-tests/artillery-config.yml');
    console.log('   • k6 run stress-tests/k6-script.js');
    console.log('   • autocannon -c 100 -d 60 http://localhost:3000/api/orders');
    
  } catch (error) {
    console.error('❌ Data generation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
