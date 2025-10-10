#!/usr/bin/env node

/**
 * Generate Large Test Data for Performance Testing
 * Creates 100k+ orders to test real-world performance
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  TARGET_ORDERS: 100000, // 100k orders
  BATCH_SIZE: 1000,      // Insert in batches of 1000
  MERCHANTS_COUNT: 10,   // 10 merchants
  OUTLETS_PER_MERCHANT: 5, // 5 outlets per merchant
  CUSTOMERS_PER_MERCHANT: 1000, // 1000 customers per merchant
  PRODUCTS_PER_MERCHANT: 200, // 200 products per merchant
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
  return `ORD-${String(outletId).padStart(3, '0')}-${String(sequence).padStart(4, '0')}`;
}

async function createMerchants() {
  console.log('🏢 Creating merchants...');
  
  const merchants = [];
  for (let i = 1; i <= CONFIG.MERCHANTS_COUNT; i++) {
    const merchant = await prisma.merchant.create({
      data: {
        name: `Test Merchant ${i}`,
        email: `merchant${i}@test.com`,
        phone: `+123456789${i}`,
        address: `Test Address ${i}`,
        city: 'Test City',
        state: 'Test State',
        zipCode: `1234${i}`,
        country: 'Test Country',
        businessType: 'Rental Shop',
        description: `Test merchant ${i} for performance testing`,
        planId: 1, // Assuming plan 1 exists
        subscriptionStatus: 'active',
        isActive: true,
      }
    });
    merchants.push(merchant);
  }
  
  console.log(`✅ Created ${merchants.length} merchants`);
  return merchants;
}

async function createOutlets(merchants) {
  console.log('🏪 Creating outlets...');
  
  const outlets = [];
  for (const merchant of merchants) {
    for (let i = 1; i <= CONFIG.OUTLETS_PER_MERCHANT; i++) {
      const outlet = await prisma.outlet.create({
        data: {
          name: `Outlet ${i} - ${merchant.name}`,
          address: `Outlet Address ${i}`,
          phone: `+123456789${merchant.id}${i}`,
          city: 'Test City',
          state: 'Test State',
          zipCode: `1234${merchant.id}${i}`,
          country: 'Test Country',
          description: `Test outlet ${i} for merchant ${merchant.name}`,
          isActive: true,
          merchantId: merchant.id,
        }
      });
      outlets.push(outlet);
    }
  }
  
  console.log(`✅ Created ${outlets.length} outlets`);
  return outlets;
}

async function createCustomers(merchants) {
  console.log('👥 Creating customers...');
  
  const customers = [];
  for (const merchant of merchants) {
    for (let i = 1; i <= CONFIG.CUSTOMERS_PER_MERCHANT; i++) {
      const customer = await prisma.customer.create({
        data: {
          firstName: `Customer${i}`,
          lastName: `Last${i}`,
          email: `customer${i}.merchant${merchant.id}@test.com`,
          phone: `+123456789${merchant.id}${String(i).padStart(3, '0')}`,
          address: `Customer Address ${i}`,
          city: 'Test City',
          state: 'Test State',
          zipCode: `1234${merchant.id}${i}`,
          country: 'Test Country',
          isActive: true,
          merchantId: merchant.id,
        }
      });
      customers.push(customer);
    }
  }
  
  console.log(`✅ Created ${customers.length} customers`);
  return customers;
}

async function createProducts(merchants) {
  console.log('📦 Creating products...');
  
  const products = [];
  for (const merchant of merchants) {
    // Create default category
    const category = await prisma.category.create({
      data: {
        name: `Default Category - Merchant ${merchant.id}`,
        description: 'Default category for performance testing',
        isActive: true,
        merchantId: merchant.id,
      }
    });
    
    for (let i = 1; i <= CONFIG.PRODUCTS_PER_MERCHANT; i++) {
      const product = await prisma.product.create({
        data: {
          name: `Test Product ${i} - Merchant ${merchant.id}`,
          description: `Test product ${i} for performance testing`,
          barcode: `BC${merchant.id}${String(i).padStart(3, '0')}`,
          totalStock: randomInt(10, 100),
          rentPrice: randomFloat(10, 500),
          salePrice: randomFloat(100, 1000),
          deposit: randomFloat(50, 200),
          isActive: true,
          merchantId: merchant.id,
          categoryId: category.id,
        }
      });
      products.push(product);
    }
  }
  
  console.log(`✅ Created ${products.length} products`);
  return products;
}

async function createUsers(merchants, outlets) {
  console.log('👤 Creating users...');
  
  const users = [];
  let outletIndex = 0;
  
  for (const merchant of merchants) {
    // Create merchant admin user
    const merchantUser = await prisma.user.create({
      data: {
        email: `admin.merchant${merchant.id}@test.com`,
        password: 'hashedpassword123', // In real app, this should be hashed
        firstName: `Merchant${merchant.id}`,
        lastName: 'Admin',
        phone: `+123456789${merchant.id}`,
        role: 'MERCHANT',
        isActive: true,
        merchantId: merchant.id,
      }
    });
    users.push(merchantUser);
    
    // Create outlet users
    const merchantOutlets = outlets.filter(o => o.merchantId === merchant.id);
    for (const outlet of merchantOutlets) {
      // Outlet admin
      const outletAdmin = await prisma.user.create({
        data: {
          email: `admin.outlet${outlet.id}@test.com`,
          password: 'hashedpassword123',
          firstName: `Outlet${outlet.id}`,
          lastName: 'Admin',
          phone: `+123456789${outlet.id}`,
          role: 'OUTLET_ADMIN',
          isActive: true,
          merchantId: merchant.id,
          outletId: outlet.id,
        }
      });
      users.push(outletAdmin);
      
      // Outlet staff
      const outletStaff = await prisma.user.create({
        data: {
          email: `staff.outlet${outlet.id}@test.com`,
          password: 'hashedpassword123',
          firstName: `Staff${outlet.id}`,
          lastName: 'User',
          phone: `+123456789${outlet.id}1`,
          role: 'OUTLET_STAFF',
          isActive: true,
          merchantId: merchant.id,
          outletId: outlet.id,
        }
      });
      users.push(outletStaff);
    }
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function createOrders(outlets, customers, products, users) {
  console.log(`📋 Creating ${CONFIG.TARGET_ORDERS.toLocaleString()} orders...`);
  
  const orders = [];
  const orderCounts = {}; // Track order numbers per outlet
  
  // Initialize order counts
  outlets.forEach(outlet => {
    orderCounts[outlet.id] = 1;
  });
  
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');
  
  for (let i = 0; i < CONFIG.TARGET_ORDERS; i++) {
    if (i % 10000 === 0) {
      console.log(`   Progress: ${i.toLocaleString()}/${CONFIG.TARGET_ORDERS.toLocaleString()} orders`);
    }
    
    const outlet = randomChoice(outlets);
    const customer = randomChoice(customers.filter(c => c.merchantId === outlet.merchantId));
    const user = randomChoice(users.filter(u => u.outletId === outlet.id));
    const orderType = randomChoice(ORDER_TYPES);
    const status = randomChoice(ORDER_STATUSES);
    
    const orderNumber = generateOrderNumber(outlet.id, orderCounts[outlet.id]++);
    const totalAmount = randomFloat(50, 2000);
    const depositAmount = randomFloat(0, totalAmount * 0.5);
    
    const order = {
      orderNumber,
      orderType,
      status,
      totalAmount,
      depositAmount,
      securityDeposit: randomFloat(0, 200),
      damageFee: randomFloat(0, 100),
      lateFee: randomFloat(0, 50),
      discountType: Math.random() > 0.8 ? 'PERCENTAGE' : null,
      discountValue: Math.random() > 0.8 ? randomFloat(5, 20) : 0,
      discountAmount: Math.random() > 0.8 ? randomFloat(10, 100) : 0,
      pickupPlanAt: orderType === 'RENT' ? randomDate(startDate, endDate) : null,
      returnPlanAt: orderType === 'RENT' ? randomDate(startDate, endDate) : null,
      pickedUpAt: status === 'PICKUPED' || status === 'RETURNED' ? randomDate(startDate, endDate) : null,
      returnedAt: status === 'RETURNED' ? randomDate(startDate, endDate) : null,
      rentalDuration: orderType === 'RENT' ? randomInt(1, 30) : null,
      isReadyToDeliver: Math.random() > 0.5,
      notes: Math.random() > 0.7 ? `Test order notes ${i}` : null,
      createdAt: randomDate(startDate, endDate),
      updatedAt: new Date(),
      outletId: outlet.id,
      customerId: customer.id,
      createdById: user.id,
    };
    
    orders.push(order);
  }
  
  console.log(`✅ Generated ${orders.length.toLocaleString()} orders in memory`);
  return orders;
}

async function batchInsertOrders(orders) {
  console.log('💾 Inserting orders into database...');
  
  const totalBatches = Math.ceil(orders.length / CONFIG.BATCH_SIZE);
  
  for (let i = 0; i < orders.length; i += CONFIG.BATCH_SIZE) {
    const batch = orders.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    
    try {
      await prisma.order.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      console.log(`   Batch ${batchNumber}/${totalBatches}: ${batch.length} orders inserted`);
    } catch (error) {
      console.error(`   Error in batch ${batchNumber}:`, error.message);
    }
  }
  
  console.log(`✅ Inserted ${orders.length.toLocaleString()} orders`);
}

async function createOrderItems(orders, products) {
  console.log('📦 Creating order items...');
  
  const orderItems = [];
  const productMap = {};
  
  // Group products by merchant
  products.forEach(product => {
    if (!productMap[product.merchantId]) {
      productMap[product.merchantId] = [];
    }
    productMap[product.merchantId].push(product);
  });
  
  for (let i = 0; i < orders.length; i++) {
    if (i % 10000 === 0) {
      console.log(`   Progress: ${i.toLocaleString()}/${orders.length.toLocaleString()} orders`);
    }
    
    const order = orders[i];
    const orderItemCount = randomInt(1, 5); // 1-5 items per order
    
    // Get products from the same merchant as the order's outlet
    const outlet = await prisma.outlet.findUnique({
      where: { id: order.outletId },
      select: { merchantId: true }
    });
    
    const availableProducts = productMap[outlet.merchantId] || [];
    
    for (let j = 0; j < orderItemCount && availableProducts.length > 0; j++) {
      const product = randomChoice(availableProducts);
      const quantity = randomInt(1, 3);
      const unitPrice = product.rentPrice || product.salePrice || 100;
      const totalPrice = unitPrice * quantity;
      
      const orderItem = {
        quantity,
        unitPrice,
        totalPrice,
        deposit: Math.random() > 0.5 ? randomFloat(10, 100) : 0,
        rentalDays: order.orderType === 'RENT' ? randomInt(1, 30) : null,
        notes: Math.random() > 0.8 ? `Item notes ${j}` : null,
        orderId: order.id,
        productId: product.id,
      };
      
      orderItems.push(orderItem);
    }
  }
  
  console.log(`✅ Generated ${orderItems.length.toLocaleString()} order items`);
  
  // Batch insert order items
  const batchSize = 1000;
  const totalBatches = Math.ceil(orderItems.length / batchSize);
  
  console.log('💾 Inserting order items into database...');
  for (let i = 0; i < orderItems.length; i += batchSize) {
    const batch = orderItems.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      await prisma.orderItem.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      console.log(`   Batch ${batchNumber}/${totalBatches}: ${batch.length} items inserted`);
    } catch (error) {
      console.error(`   Error in batch ${batchNumber}:`, error.message);
    }
  }
  
  console.log(`✅ Inserted ${orderItems.length.toLocaleString()} order items`);
}

async function createPayments(orders) {
  console.log('💳 Creating payments...');
  
  const payments = [];
  
  for (let i = 0; i < orders.length; i++) {
    if (i % 10000 === 0) {
      console.log(`   Progress: ${i.toLocaleString()}/${orders.length.toLocaleString()} orders`);
    }
    
    const order = orders[i];
    const paymentCount = randomInt(1, 3); // 1-3 payments per order
    
    for (let j = 0; j < paymentCount; j++) {
      const amount = j === 0 ? order.depositAmount : randomFloat(50, order.totalAmount);
      const payment = {
        amount,
        currency: 'USD',
        method: randomChoice(PAYMENT_METHODS),
        type: j === 0 ? 'DEPOSIT' : randomChoice(PAYMENT_TYPES),
        status: Math.random() > 0.1 ? 'COMPLETED' : 'PENDING',
        reference: `REF${order.id}${j}`,
        description: `Payment ${j + 1} for order ${order.orderNumber}`,
        createdAt: order.createdAt,
        updatedAt: new Date(),
        orderId: order.id,
      };
      
      payments.push(payment);
    }
  }
  
  console.log(`✅ Generated ${payments.length.toLocaleString()} payments`);
  
  // Batch insert payments
  const batchSize = 1000;
  const totalBatches = Math.ceil(payments.length / batchSize);
  
  console.log('💾 Inserting payments into database...');
  for (let i = 0; i < payments.length; i += batchSize) {
    const batch = payments.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      await prisma.payment.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      console.log(`   Batch ${batchNumber}/${totalBatches}: ${batch.length} payments inserted`);
    } catch (error) {
      console.error(`   Error in batch ${batchNumber}:`, error.message);
    }
  }
  
  console.log(`✅ Inserted ${payments.length.toLocaleString()} payments`);
}

async function main() {
  console.log('🚀 Starting Large Test Data Generation');
  console.log(`📊 Target: ${CONFIG.TARGET_ORDERS.toLocaleString()} orders`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Create base data
    const merchants = await createMerchants();
    const outlets = await createOutlets(merchants);
    const customers = await createCustomers(merchants);
    const products = await createProducts(merchants);
    const users = await createUsers(merchants, outlets);
    
    // Create orders
    const orders = await createOrders(outlets, customers, products, users);
    
    // Insert orders
    await batchInsertOrders(orders);
    
    // Create related data
    await createOrderItems(orders, products);
    await createPayments(orders);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATA GENERATION COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`📊 Final database stats:`);
    
    const stats = await Promise.all([
      prisma.merchant.count(),
      prisma.outlet.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.payment.count(),
    ]);
    
    console.log(`   • Merchants: ${stats[0].toLocaleString()}`);
    console.log(`   • Outlets: ${stats[1].toLocaleString()}`);
    console.log(`   • Customers: ${stats[2].toLocaleString()}`);
    console.log(`   • Products: ${stats[3].toLocaleString()}`);
    console.log(`   • Users: ${stats[4].toLocaleString()}`);
    console.log(`   • Orders: ${stats[5].toLocaleString()}`);
    console.log(`   • Order Items: ${stats[6].toLocaleString()}`);
    console.log(`   • Payments: ${stats[7].toLocaleString()}`);
    
    console.log('\n💡 Ready for performance testing!');
    console.log('   Run: node scripts/test-order-performance.js');
    
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
