/**
 * Complete System Regeneration Script - 2025
 * 
 * This script will regenerate the ENTIRE system with:
 * - 2 merchants (each with 1 merchant account)
 * - Each merchant has 2 outlets (4 total outlets)
 * - Each outlet has 1 outlet admin + 1 outlet staff (8 total users)
 * - 30 customers for each merchant (60 total customers)
 * - 30 products for each merchant (60 total products)
 * - 30 orders for each outlet (120 total orders)
 * 
 * Run with: node scripts/regenerate-entire-system-2025.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// System configuration
const SYSTEM_CONFIG = {
  MERCHANTS: 2,
  OUTLETS_PER_MERCHANT: 2,
  TOTAL_OUTLETS: 4,
  CUSTOMERS_PER_MERCHANT: 30,
  TOTAL_CUSTOMERS: 60,
  PRODUCTS_PER_MERCHANT: 30,
  TOTAL_PRODUCTS: 60,
  ORDERS_PER_OUTLET: 30,
  TOTAL_ORDERS: 120,
  USERS_PER_OUTLET: 2, // 1 admin + 1 staff
  TOTAL_USERS: 8
};

// Updated order types and statuses
const ORDER_TYPES = ['RENT', 'SALE'];
const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];

// Order status flow based on order type
const ORDER_STATUS_FLOW = {
  RENT: ['RESERVED', 'PICKUPED', 'RETURNED', 'CANCELLED'],
  SALE: ['RESERVED', 'COMPLETED', 'CANCELLED']
};

// Global counter for public IDs
let publicIdCounter = 1000; // Start from 1000 to avoid conflicts

// Helper function to get next public ID
function getNextPublicId() {
  return ++publicIdCounter;
}

// Helper function to generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to pick random item from array
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Step 1: Reset entire database
async function resetDatabase() {
  console.log('🗑️  Resetting entire database...');
  
  try {
    // Delete in correct order due to foreign key constraints
    await prisma.payment.deleteMany({});
    console.log('✅ Deleted all payments');
    
    await prisma.orderItem.deleteMany({});
    console.log('✅ Deleted all order items');
    
    await prisma.order.deleteMany({});
    console.log('✅ Deleted all orders');
    
    await prisma.outletStock.deleteMany({});
    console.log('✅ Deleted all outlet stock');
    
    await prisma.product.deleteMany({});
    console.log('✅ Deleted all products');
    
    await prisma.category.deleteMany({});
    console.log('✅ Deleted all categories');
    
    await prisma.customer.deleteMany({});
    console.log('✅ Deleted all customers');
    
    await prisma.user.deleteMany({});
    console.log('✅ Deleted all users');
    
    await prisma.outlet.deleteMany({});
    console.log('✅ Deleted all outlets');
    
    await prisma.merchant.deleteMany({});
    console.log('✅ Deleted all merchants');
    
    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Step 2: Create merchants
async function createMerchants() {
  console.log('\n🏢 Creating merchants...');
  
  const merchants = [];
  
  for (let i = 1; i <= SYSTEM_CONFIG.MERCHANTS; i++) {
    const merchant = await prisma.merchant.create({
      data: {
        publicId: i,
        name: `Merchant ${i}`,
        description: `Description for Merchant ${i}`,
        isActive: true
      }
    });
    
    console.log(`✅ Created merchant: ${merchant.name} (ID: ${merchant.publicId})`);
    merchants.push(merchant);
  }
  
  return merchants;
}

// Step 3: Create merchant accounts
async function createMerchantAccounts(merchants) {
  console.log('\n👤 Creating merchant accounts...');
  
  const merchantUsers = [];
  
  for (const merchant of merchants) {
    const hashedPassword = await hashPassword('merchant123');
    
    const merchantUser = await prisma.user.create({
      data: {
        publicId: getNextPublicId(),
        email: `merchant${merchant.publicId}@example.com`,
        password: hashedPassword,
        firstName: `Merchant`,
        lastName: `${merchant.publicId}`,
        phone: `+1-555-${String(merchant.publicId).padStart(4, '0')}`,
        role: 'MERCHANT',
        isActive: true,
        merchantId: merchant.id
      }
    });
    
    console.log(`✅ Created merchant account: ${merchantUser.email} for ${merchant.name}`);
    merchantUsers.push(merchantUser);
  }
  
  return merchantUsers;
}

// Step 4: Create outlets
async function createOutlets(merchants) {
  console.log('\n🏪 Creating outlets...');
  
  const outlets = [];
  let outletId = 1;
  
  for (const merchant of merchants) {
    for (let i = 1; i <= SYSTEM_CONFIG.OUTLETS_PER_MERCHANT; i++) {
      const outlet = await prisma.outlet.create({
        data: {
          publicId: outletId++,
          name: `Outlet ${i} - ${merchant.name}`,
          address: `Address for Outlet ${i} of ${merchant.name}`,
          phone: `+1-555-${String(outletId).padStart(4, '0')}`,
          description: `Description for Outlet ${i} of ${merchant.name}`,
          isActive: true,
          merchantId: merchant.id
        }
      });
      
      console.log(`✅ Created outlet: ${outlet.name} for ${merchant.name}`);
      outlets.push(outlet);
    }
  }
  
  return outlets;
}

// Step 5: Create outlet users (admin + staff)
async function createOutletUsers(outlets) {
  console.log('\n👥 Creating outlet users...');
  
  const outletUsers = [];
  let phoneCounter = 2000; // Start from 2000 to avoid conflicts
  
  for (const outlet of outlets) {
    // Create outlet admin
    const adminPassword = await hashPassword('admin123');
    const adminUser = await prisma.user.create({
      data: {
        publicId: getNextPublicId(),
        email: `admin.outlet${outlet.publicId}@example.com`,
        password: adminPassword,
        firstName: `Admin`,
        lastName: `Outlet ${outlet.publicId}`,
        phone: `+1-555-${String(phoneCounter++).padStart(4, '0')}`,
        role: 'OUTLET_ADMIN',
        isActive: true,
        merchantId: outlet.merchantId,
        outletId: outlet.id
      }
    });
    
    // Create outlet staff
    const staffPassword = await hashPassword('staff123');
    const staffUser = await prisma.user.create({
      data: {
        publicId: getNextPublicId(),
        email: `staff.outlet${outlet.publicId}@example.com`,
        password: staffPassword,
        firstName: `Staff`,
        lastName: `Outlet ${outlet.publicId}`,
        phone: `+1-555-${String(phoneCounter++).padStart(4, '0')}`,
        role: 'OUTLET_STAFF',
        isActive: true,
        merchantId: outlet.merchantId,
        outletId: outlet.id
      }
    });
    
    console.log(`✅ Created users for ${outlet.name}:`);
    console.log(`   - Admin: ${adminUser.email}`);
    console.log(`   - Staff: ${staffUser.email}`);
    
    outletUsers.push(adminUser, staffUser);
  }
  
  return outletUsers;
}

// Step 6: Create categories
async function createCategories(merchants) {
  console.log('\n📂 Creating product categories...');
  
  const categories = [];
  let categoryId = 1;
  
  const categoryNames = [
    'Electronics', 'Tools', 'Furniture', 'Sports Equipment', 'Party Supplies',
    'Audio Equipment', 'Lighting', 'Camping Gear', 'Office Equipment', 'Medical Devices',
    'Kitchen Appliances', 'Garden Tools', 'Construction Equipment', 'Event Decorations',
    'Fitness Equipment', 'Photography Gear', 'Musical Instruments', 'Automotive Tools',
    'Cleaning Equipment', 'Safety Equipment', 'Recreation Items', 'Professional Tools',
    'Home Improvement', 'Outdoor Recreation', 'Entertainment', 'Industrial Equipment',
    'Educational Materials', 'Art Supplies', 'Craft Tools', 'Maintenance Equipment'
  ];
  
  for (const merchant of merchants) {
    for (let i = 0; i < SYSTEM_CONFIG.PRODUCTS_PER_MERCHANT; i++) {
      const category = await prisma.category.create({
        data: {
          publicId: categoryId++,
          name: categoryNames[i % categoryNames.length],
          description: `Category ${i + 1} for ${merchant.name}`,
          isActive: true,
          merchantId: merchant.id
        }
      });
      
      categories.push(category);
    }
  }
  
  console.log(`✅ Created ${categories.length} categories`);
  return categories;
}

// Step 7: Create products
async function createProducts(categories, outlets) {
  console.log('\n📦 Creating products...');
  
  const products = [];
  let productId = 1;
  
  for (const category of categories) {
    const product = await prisma.product.create({
      data: {
        publicId: productId++,
        name: `Product ${productId} - ${category.name}`,
        description: `Description for Product ${productId} in category ${category.name}`,
        barcode: `BAR${String(productId).padStart(6, '0')}`,
        totalStock: Math.floor(Math.random() * 50) + 10,
        rentPrice: Math.floor(Math.random() * 100) + 20,
        salePrice: Math.floor(Math.random() * 200) + 50,
        deposit: Math.floor(Math.random() * 50) + 10,
        images: null,
        isActive: true,
        merchantId: category.merchantId,
        categoryId: category.id
      }
    });
    
    products.push(product);
  }
  
  console.log(`✅ Created ${products.length} products`);
  
  // Debug: Show sample products
  console.log('\n📦 Sample Products Created:');
  products.slice(0, 5).forEach((product, idx) => {
    console.log(`  ${idx + 1}. ${product.name} (ID: ${product.id}, Merchant: ${product.merchantId})`);
  });
  
  // Create outlet stock for all products
  console.log('\n🏪 Creating outlet stock...');
  
  for (const outlet of outlets) {
    const outletProducts = products.filter(p => p.merchantId === outlet.merchantId);
    console.log(`  📦 Outlet ${outlet.name}: ${outletProducts.length} products`);
    
    for (const product of outletProducts) {
      await prisma.outletStock.create({
        data: {
          productId: product.id,
          outletId: outlet.id,
          stock: Math.floor(Math.random() * 20) + 5,
          available: Math.floor(Math.random() * 15) + 3,
          renting: Math.floor(Math.random() * 5) + 1
        }
      });
    }
  }
  
  console.log(`✅ Created outlet stock for all products`);
  
  return products;
}

// Step 8: Create customers
async function createCustomers(merchants) {
  console.log('\n👥 Creating customers...');
  
  const customers = [];
  let customerId = 1;
  
  const firstNames = [
    'John', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Jennifer',
    'Robert', 'Amanda', 'William', 'Jessica', 'Christopher', 'Ashley', 'Daniel',
    'Megan', 'Matthew', 'Stephanie', 'Joshua', 'Nicole', 'Andrew', 'Rebecca',
    'Kevin', 'Laura', 'Steven', 'Rachel', 'Brian', 'Amber', 'Jason', 'Heather'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker'
  ];
  
  for (const merchant of merchants) {
    for (let i = 0; i < SYSTEM_CONFIG.CUSTOMERS_PER_MERCHANT; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      
      const customer = await prisma.customer.create({
        data: {
          publicId: customerId++,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`,
          phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
          address: `Address ${i + 1} for ${merchant.name}`,
          city: 'Example City',
          state: 'Example State',
          zipCode: '12345',
          country: 'USA',
          isActive: true,
          merchantId: merchant.id
        }
      });
      
      customers.push(customer);
    }
  }
  
  console.log(`✅ Created ${customers.length} customers`);
  return customers;
}

// Step 9: Create orders
async function createOrders(outlets, customers, products, outletUsers) {
  console.log('\n📋 Creating orders...');
  
  const orders = [];
  let orderPublicId = 1;
  
  for (const outlet of outlets) {
    console.log(`\n🏪 Creating orders for outlet: ${outlet.name}`);
    
    // Get customers and products for this merchant
    const outletCustomers = customers.filter(c => c.merchantId === outlet.merchantId);
    const outletProducts = products.filter(p => p.merchantId === outlet.merchantId);
    
    // Debug logging to verify product filtering
    console.log(`  🔍 Found ${outletProducts.length} products for ${outlet.name} (merchant: ${outlet.merchantId})`);
    
    for (let i = 0; i < SYSTEM_CONFIG.ORDERS_PER_OUTLET; i++) {
      const customer = pickRandom(outletCustomers);
      const orderType = pickRandom(ORDER_TYPES);
      const availableStatuses = ORDER_STATUS_FLOW[orderType];
      const status = pickRandom(availableStatuses);
      
      // Generate 1-3 random products for this order
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      
      // Ensure we have enough unique products
      const availableProducts = [...outletProducts];
      
      for (let j = 0; j < numItems && availableProducts.length > 0; j++) {
        const randomIndex = Math.floor(Math.random() * availableProducts.length);
        const product = availableProducts.splice(randomIndex, 1)[0];
        selectedProducts.push(product);
      }
      
      // Debug logging for first few orders
      if (i < 3) {
        console.log(`    📦 Order ${i + 1}: Selected ${selectedProducts.length} products`);
        selectedProducts.forEach((product, idx) => {
          console.log(`      - Product ${idx + 1}: ${product.name} (ID: ${product.id}, Merchant: ${product.merchantId})`);
        });
      }
      
      // Calculate order totals
      let totalAmount = 0;
      let depositAmount = 0;
      let securityDeposit = 0;
      
      selectedProducts.forEach(product => {
        const quantity = Math.floor(Math.random() * 2) + 1;
        const unitPrice = orderType === 'SALE' ? (product.salePrice || product.rentPrice) : product.rentPrice;
        totalAmount += unitPrice * quantity;
        
        if (orderType === 'RENT') {
          depositAmount += (product.deposit || 0) * quantity;
          securityDeposit += (product.deposit || 0) * quantity;
        }
      });
      
      // Generate realistic dates based on status
      const now = new Date();
      let pickupPlanAt = null;
      let returnPlanAt = null;
      let pickedUpAt = null;
      let returnedAt = null;
      let rentalDuration = null;
      
      if (orderType === 'RENT') {
        if (status === 'RESERVED') {
          pickupPlanAt = randomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
          returnPlanAt = new Date(pickupPlanAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000);
          rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
        } else if (status === 'PICKUPED') {
          pickupPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
          returnPlanAt = randomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
          pickedUpAt = pickupPlanAt;
          rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
        } else if (status === 'RETURNED') {
          pickupPlanAt = randomDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
          returnPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
          pickedUpAt = pickupPlanAt;
          returnedAt = returnPlanAt;
          rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
        }
      } else if (orderType === 'SALE') {
        if (status === 'RESERVED') {
          pickupPlanAt = randomDate(now, new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
        } else if (status === 'COMPLETED') {
          pickupPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
          pickedUpAt = pickupPlanAt;
        }
      }
      
      // Generate order number (without prefix)
      const orderNumber = `ORD-${outlet.publicId.toString().padStart(3, '0')}-${(i + 1).toString().padStart(4, '0')}`;
      
      try {
        // Create the order
        const order = await prisma.order.create({
          data: {
            publicId: orderPublicId++,
            orderNumber,
            orderType,
            status,
            totalAmount: Math.round(totalAmount * 100) / 100,
            depositAmount: Math.round(depositAmount * 100) / 100,
            securityDeposit: Math.round(securityDeposit * 100) / 100,
            damageFee: 0,
            lateFee: 0,
            pickupPlanAt,
            returnPlanAt,
            pickedUpAt,
            returnedAt,
            rentalDuration,
            isReadyToDeliver: status === 'RESERVED' && Math.random() > 0.3,
            collateralType: orderType === 'RENT' ? pickRandom(['CASH', 'DOCUMENT', 'ID_CARD', 'CREDIT_CARD']) : null,
            collateralDetails: orderType === 'RENT' ? pickRandom(['ID Card', 'Passport', 'Driver License', 'Credit Card', 'Cash Deposit']) : null,
            notes: `${orderType} order for ${customer.firstName} ${customer.lastName} - ${status}`,
            pickupNotes: pickupPlanAt ? `Scheduled pickup on ${pickupPlanAt.toLocaleDateString()}` : null,
            returnNotes: returnPlanAt && orderType === 'RENT' ? `Expected return on ${returnPlanAt.toLocaleDateString()}` : null,
            damageNotes: '',
            outletId: outlet.id,
            customerId: customer.id,
            createdById: outletUsers.find(u => u.outletId === outlet.id)?.id || outletUsers[0]?.id // Use outlet user as creator
          }
        });
        
        // Create order items
        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 2) + 1;
          const unitPrice = orderType === 'SALE' ? (product.salePrice || product.rentPrice) : product.rentPrice;
          const totalPrice = unitPrice * quantity;
          
          // Debug logging for first few orders
          if (i < 3) {
            console.log(`      📝 Creating order item: ${product.name} (Product ID: ${product.id})`);
          }
          
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity,
              unitPrice,
              totalPrice,
              rentalDays: rentalDuration,
              notes: `${product.name} - ${orderType}`
            }
          });
        }
        
        // Create payment record
        if (depositAmount > 0 || status === 'COMPLETED') {
          const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DIGITAL_WALLET'];
          const paymentMethod = pickRandom(paymentMethods);
          
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: status === 'COMPLETED' ? totalAmount : depositAmount,
              method: paymentMethod,
              type: status === 'COMPLETED' ? 'FULL_PAYMENT' : 'DEPOSIT',
              status: status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED',
              reference: `PAY-${order.publicId.toString().padStart(6, '0')}`,
              notes: `${orderType} ${status === 'COMPLETED' ? 'payment' : 'deposit'} for ${orderNumber}`
            }
          });
        }
        
        orders.push(order);
        
        if (i < 5) { // Log first 5 orders for each outlet
          console.log(`  ✅ Created ${orderType} order: ${orderNumber} - ${status} - $${totalAmount.toFixed(2)}`);
        }
        
      } catch (error) {
        console.error(`❌ Error creating order ${i + 1} for outlet ${outlet.name}:`, error);
      }
    }
    
    console.log(`  📋 Created ${SYSTEM_CONFIG.ORDERS_PER_OUTLET} orders for ${outlet.name}`);
  }
  
  return orders;
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Complete System Regeneration Process...\n');
    console.log('📋 Target Configuration:');
    console.log(`  • ${SYSTEM_CONFIG.MERCHANTS} merchants (each with 1 merchant account)`);
    console.log(`  • ${SYSTEM_CONFIG.OUTLETS_PER_MERCHANT} outlets per merchant (${SYSTEM_CONFIG.TOTAL_OUTLETS} total)`);
    console.log(`  • ${SYSTEM_CONFIG.USERS_PER_OUTLET} users per outlet (${SYSTEM_CONFIG.TOTAL_USERS} total users)`);
    console.log(`  • ${SYSTEM_CONFIG.CUSTOMERS_PER_MERCHANT} customers per merchant (${SYSTEM_CONFIG.TOTAL_CUSTOMERS} total)`);
    console.log(`  • ${SYSTEM_CONFIG.PRODUCTS_PER_MERCHANT} products per merchant (${SYSTEM_CONFIG.TOTAL_PRODUCTS} total)`);
    console.log(`  • ${SYSTEM_CONFIG.ORDERS_PER_OUTLET} orders per outlet (${SYSTEM_CONFIG.TOTAL_ORDERS} total)`);
    console.log('');
    
    // Step 1: Reset database
    await resetDatabase();
    
    // Step 2: Create merchants
    const merchants = await createMerchants();
    
    // Step 3: Create merchant accounts
    const merchantUsers = await createMerchantAccounts(merchants);
    
    // Step 4: Create outlets
    const outlets = await createOutlets(merchants);
    
    // Step 5: Create outlet users
    const outletUsers = await createOutletUsers(outlets);
    
    // Step 6: Create categories
    const categories = await createCategories(merchants);
    
    // Step 7: Create products
    const products = await createProducts(categories, outlets);
    
    // Step 8: Create customers
    const customers = await createCustomers(merchants);
    
    // Step 9: Create orders
    const orders = await createOrders(outlets, customers, products, outletUsers);
    
    console.log('\n🎉 Complete system regeneration completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`  ✅ ${merchants.length} merchants created`);
    console.log(`  ✅ ${merchantUsers.length} merchant accounts created`);
    console.log(`  ✅ ${outlets.length} outlets created`);
    console.log(`  ✅ ${outletUsers.length} outlet users created`);
    console.log(`  ✅ ${categories.length} categories created`);
    console.log(`  ✅ ${products.length} products created`);
    console.log(`  ✅ ${customers.length} customers created`);
    console.log(`  ✅ ${orders.length} orders created`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('\n=== MERCHANT ACCOUNTS ===');
    merchantUsers.forEach((user, index) => {
      console.log(`  Merchant ${index + 1}: ${user.email} / merchant123`);
    });
    
    console.log('\n=== OUTLET ADMINS ===');
    const admins = outletUsers.filter(u => u.role === 'OUTLET_ADMIN');
    admins.forEach((admin, index) => {
      console.log(`  Admin ${index + 1}: ${admin.email} / admin123`);
    });
    
    console.log('\n=== OUTLET STAFF ===');
    const staff = outletUsers.filter(u => u.role === 'OUTLET_STAFF');
    staff.forEach((staffUser, index) => {
      console.log(`  Staff ${index + 1}: ${staffUser.email} / staff123`);
    });
    
    console.log('\n📈 Order Summary:');
    const orderSummary = {};
    orders.forEach(order => {
      if (!orderSummary[order.orderType]) {
        orderSummary[order.orderType] = {};
      }
      if (!orderSummary[order.orderType][order.status]) {
        orderSummary[order.orderType][order.status] = 0;
      }
      orderSummary[order.status]++;
    });
    
    Object.entries(orderSummary).forEach(([type, statuses]) => {
      console.log(`  ${type}:`);
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Fatal error during system regeneration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  resetDatabase, 
  createMerchants, 
  createMerchantAccounts, 
  createOutlets, 
  createOutletUsers, 
  createCategories, 
  createProducts, 
  createCustomers, 
  createOrders 
};
