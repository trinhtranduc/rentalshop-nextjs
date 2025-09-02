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
  TOTAL_USERS: 8,
  BILLING_CYCLES: 4,
  PLANS: 3,
  SUBSCRIPTIONS: 2
};

// Updated order types and statuses
const ORDER_TYPES = ['RENT', 'SALE'];
const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];

// Order status flow based on order type
const ORDER_STATUS_FLOW = {
  RENT: ['RESERVED', 'PICKUPED', 'RETURNED', 'CANCELLED'],
  SALE: ['RESERVED', 'COMPLETED', 'CANCELLED']
};

// Payment types and methods
const PAYMENT_TYPES = ['DEPOSIT', 'FULL_PAYMENT', 'REFUND', 'LATE_FEE', 'DAMAGE_FEE'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DIGITAL_WALLET', 'CHECK'];
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];

// Subscription statuses
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'CANCELLED', 'EXPIRED', 'PAUSED'];

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
    await prisma.subscriptionPayment.deleteMany({});
    console.log('✅ Deleted all subscription payments');
    
    await prisma.subscription.deleteMany({});
    console.log('✅ Deleted all subscriptions');
    
    await prisma.plan.deleteMany({});
    console.log('✅ Deleted all plans');
    
    await prisma.billingCycle.deleteMany({});
    console.log('✅ Deleted all billing cycles');
    
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
        email: `merchant${i}@example.com`,
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
    const merchantPassword = await hashPassword('merchant123');
    const merchantUser = await prisma.user.create({
      data: {
        publicId: getNextPublicId(),
        email: `merchant${merchant.publicId}@example.com`,
        password: merchantPassword,
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

// Step 3.5: Create super admin user
async function createSuperAdmin() {
  console.log('\n👑 Creating super admin user...');
  
  const adminPassword = await hashPassword('admin123');
  const superAdmin = await prisma.user.create({
    data: {
      publicId: getNextPublicId(),
      email: 'admin@rentalshop.com',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Administrator',
      phone: '+1-555-0001',
      role: 'ADMIN',
      isActive: true,
      // No merchantId or outletId for super admin (system-wide access)
      merchantId: null,
      outletId: null
    }
  });
  
  console.log(`✅ Created super admin: ${superAdmin.email} / admin123`);
  return superAdmin;
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
              deposit: product.deposit || 0,
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

// Step 10: Create billing cycles
async function createBillingCycles() {
  console.log('\n💳 Creating billing cycles...');
  
  const billingCycles = [];
  let cycleId = 1;
  
  const cycleData = [
    { name: 'Monthly', value: 'monthly', months: 1, discount: 0, sortOrder: 1 },
    { name: 'Quarterly', value: 'quarterly', months: 3, discount: 5, sortOrder: 2 },
    { name: 'Semi-Annual', value: 'semi-annual', months: 6, discount: 10, sortOrder: 3 },
    { name: 'Annual', value: 'annual', months: 12, discount: 20, sortOrder: 4 }
  ];
  
  for (const cycle of cycleData) {
    const billingCycle = await prisma.billingCycle.create({
      data: {
        publicId: cycleId++,
        name: cycle.name,
        value: cycle.value,
        months: cycle.months,
        discount: cycle.discount,
        description: `${cycle.name} billing cycle with ${cycle.discount}% discount`,
        isActive: true,
        sortOrder: cycle.sortOrder
      }
    });
    
    console.log(`✅ Created billing cycle: ${billingCycle.name} (${billingCycle.discount}% discount)`);
    billingCycles.push(billingCycle);
  }
  
  return billingCycles;
}

// Step 11: Create subscription plans
async function createPlans(billingCycles) {
  console.log('\n📋 Creating subscription plans...');
  
  const plans = [];
  let planId = 1;
  
  const planData = [
    {
      name: 'Starter',
      description: 'Perfect for small rental businesses just getting started',
      price: 29.99,
      trialDays: 14,
      maxOutlets: 1,
      maxUsers: 3,
      maxProducts: 100,
      maxCustomers: 500,
      features: JSON.stringify([
        'Basic order management',
        'Customer management',
        'Product catalog',
        'Basic reporting',
        'Email support'
      ]),
      isPopular: false,
      sortOrder: 1,
      billingCycleValue: 'monthly'
    },
    {
      name: 'Professional',
      description: 'Ideal for growing rental businesses with multiple outlets',
      price: 79.99,
      trialDays: 14,
      maxOutlets: 5,
      maxUsers: 15,
      maxProducts: 1000,
      maxCustomers: 2000,
      features: JSON.stringify([
        'Advanced order management',
        'Multi-outlet support',
        'Advanced reporting & analytics',
        'Inventory management',
        'Payment processing',
        'Priority support',
        'API access'
      ]),
      isPopular: true,
      sortOrder: 2,
      billingCycleValue: 'monthly'
    },
    {
      name: 'Enterprise',
      description: 'For large rental businesses with unlimited needs',
      price: 199.99,
      trialDays: 30,
      maxOutlets: -1, // unlimited
      maxUsers: -1, // unlimited
      maxProducts: -1, // unlimited
      maxCustomers: -1, // unlimited
      features: JSON.stringify([
        'Unlimited everything',
        'Custom integrations',
        'Advanced analytics',
        'White-label options',
        'Dedicated support',
        'Custom training',
        'SLA guarantee'
      ]),
      isPopular: false,
      sortOrder: 3,
      billingCycleValue: 'annual'
    }
  ];
  
  for (const plan of planData) {
    const billingCycle = billingCycles.find(bc => bc.value === plan.billingCycleValue);
    
    const subscriptionPlan = await prisma.plan.create({
      data: {
        publicId: planId++,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        trialDays: plan.trialDays,
        maxOutlets: plan.maxOutlets,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        maxCustomers: plan.maxCustomers,
        features: plan.features,
        isActive: true,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        billingCycleId: billingCycle?.id
      }
    });
    
    console.log(`✅ Created plan: ${subscriptionPlan.name} - $${subscriptionPlan.price}/${plan.billingCycleValue}`);
    plans.push(subscriptionPlan);
  }
  
  return plans;
}

// Step 12: Create subscriptions for merchants
async function createSubscriptions(merchants, plans) {
  console.log('\n🔄 Creating merchant subscriptions...');
  
  const subscriptions = [];
  let subscriptionId = 1;
  
  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const plan = plans[i % plans.length]; // Rotate through plans
    
    // Calculate subscription dates
    const startDate = new Date();
    const trialEndDate = new Date(startDate.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000));
    const nextBillingDate = new Date(trialEndDate);
    
    // Determine subscription status
    const status = Math.random() > 0.2 ? 'ACTIVE' : 'TRIAL'; // 80% active, 20% trial
    
    const subscription = await prisma.subscription.create({
      data: {
        publicId: subscriptionId++,
        merchantId: merchant.id,
        planId: plan.id,
        status: status,
        startDate: startDate,
        endDate: status === 'ACTIVE' ? new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)) : null,
        trialEndDate: trialEndDate,
        nextBillingDate: nextBillingDate,
        amount: plan.price,
        currency: 'USD',
        billingCycleId: plan.billingCycleId,
        autoRenew: true,
        cancelledAt: null,
        cancellationReason: null
      }
    });
    
    // Update merchant with plan reference
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        planId: plan.id,
        subscriptionStatus: status.toLowerCase()
      }
    });
    
    console.log(`✅ Created ${status.toLowerCase()} subscription for ${merchant.name} - ${plan.name}`);
    subscriptions.push(subscription);
  }
  
  return subscriptions;
}

// Step 13: Create additional payments for orders
async function createAdditionalPayments(orders) {
  console.log('\n💳 Creating additional payments...');
  
  const payments = [];
  let paymentId = 1;
  
  for (const order of orders) {
    // Create additional payments for some orders (late fees, damage fees, refunds)
    const shouldCreateAdditionalPayment = Math.random() > 0.7; // 30% chance
    
    if (shouldCreateAdditionalPayment) {
      const paymentTypes = ['LATE_FEE', 'DAMAGE_FEE', 'REFUND'];
      const paymentType = pickRandom(paymentTypes);
      const paymentMethod = pickRandom(PAYMENT_METHODS);
      const paymentStatus = pickRandom(PAYMENT_STATUSES);
      
      let amount = 0;
      let description = '';
      
      switch (paymentType) {
        case 'LATE_FEE':
          amount = Math.floor(Math.random() * 50) + 10; // $10-$60
          description = `Late fee for order ${order.orderNumber}`;
          break;
        case 'DAMAGE_FEE':
          amount = Math.floor(Math.random() * 200) + 50; // $50-$250
          description = `Damage fee for order ${order.orderNumber}`;
          break;
        case 'REFUND':
          amount = Math.floor(Math.random() * order.totalAmount * 0.5) + 10; // Partial refund
          description = `Refund for order ${order.orderNumber}`;
          break;
      }
      
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: amount,
          method: paymentMethod,
          type: paymentType,
          status: paymentStatus,
          reference: `PAY-${paymentId.toString().padStart(6, '0')}`,
          notes: description
        }
      });
      
      payments.push(payment);
      paymentId++;
      
      if (payments.length <= 10) { // Log first 10 additional payments
        console.log(`  💳 Created ${paymentType} payment: $${amount} - ${paymentStatus}`);
      }
    }
  }
  
  console.log(`✅ Created ${payments.length} additional payments`);
  return payments;
}

// Step 14: Create subscription payments
async function createSubscriptionPayments(subscriptions) {
  console.log('\n🔄 Creating subscription payments...');
  
  const subscriptionPayments = [];
  let paymentId = 1;
  
  for (const subscription of subscriptions) {
    // Create 1-3 payments per subscription
    const numPayments = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numPayments; i++) {
      const paymentMethod = pickRandom(PAYMENT_METHODS);
      const paymentStatus = Math.random() > 0.1 ? 'COMPLETED' : 'FAILED'; // 90% success rate
      
      const payment = await prisma.subscriptionPayment.create({
        data: {
          publicId: paymentId++,
          subscriptionId: subscription.id,
          amount: subscription.amount,
          currency: subscription.currency,
          method: paymentMethod,
          status: paymentStatus,
          transactionId: `TXN-${paymentId.toString().padStart(8, '0')}`,
          invoiceNumber: `INV-${subscription.publicId}-${i + 1}`,
          description: `Subscription payment for ${subscription.plan?.name || 'Plan'}`,
          failureReason: paymentStatus === 'FAILED' ? 'Insufficient funds' : null,
          processedAt: paymentStatus === 'COMPLETED' ? new Date() : null
        }
      });
      
      subscriptionPayments.push(payment);
      
      if (subscriptionPayments.length <= 10) { // Log first 10 subscription payments
        console.log(`  💳 Created subscription payment: $${subscription.amount} - ${paymentStatus}`);
      }
    }
  }
  
  console.log(`✅ Created ${subscriptionPayments.length} subscription payments`);
  return subscriptionPayments;
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
    console.log(`  • ${SYSTEM_CONFIG.BILLING_CYCLES} billing cycles`);
    console.log(`  • ${SYSTEM_CONFIG.PLANS} subscription plans`);
    console.log(`  • ${SYSTEM_CONFIG.SUBSCRIPTIONS} merchant subscriptions`);
    console.log('');
    
    // Step 1: Reset database
    await resetDatabase();
    
    // Step 2: Create merchants
    const merchants = await createMerchants();
    
    // Step 3: Create merchant accounts
    const merchantUsers = await createMerchantAccounts(merchants);
    
    // Step 3.5: Create super admin user
    const superAdmin = await createSuperAdmin();
    
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
    
    // Step 10: Create billing cycles
    const billingCycles = await createBillingCycles();
    
    // Step 11: Create subscription plans
    const plans = await createPlans(billingCycles);
    
    // Step 12: Create merchant subscriptions
    const subscriptions = await createSubscriptions(merchants, plans);
    
    // Step 13: Create additional payments for orders
    const additionalPayments = await createAdditionalPayments(orders);
    
    // Step 14: Create subscription payments
    const subscriptionPayments = await createSubscriptionPayments(subscriptions);
    
    console.log('\n🎉 Complete system regeneration completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`  ✅ ${merchants.length} merchants created`);
    console.log(`  ✅ ${merchantUsers.length} merchant accounts created`);
    console.log(`  ✅ 1 super admin created`);
    console.log(`  ✅ ${outlets.length} outlets created`);
    console.log(`  ✅ ${outletUsers.length} outlet users created`);
    console.log(`  ✅ ${categories.length} categories created`);
    console.log(`  ✅ ${products.length} products created`);
    console.log(`  ✅ ${customers.length} customers created`);
    console.log(`  ✅ ${orders.length} orders created`);
    console.log(`  ✅ ${billingCycles.length} billing cycles created`);
    console.log(`  ✅ ${plans.length} subscription plans created`);
    console.log(`  ✅ ${subscriptions.length} merchant subscriptions created`);
    console.log(`  ✅ ${additionalPayments.length} additional payments created`);
    console.log(`  ✅ ${subscriptionPayments.length} subscription payments created`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('\n=== SUPER ADMIN (System-wide Access) ===');
    console.log(`  Super Admin: ${superAdmin.email} / admin123`);
    
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
    
    console.log('\n💳 Payment Summary:');
    const paymentSummary = {};
    additionalPayments.forEach(payment => {
      if (!paymentSummary[payment.type]) {
        paymentSummary[payment.type] = 0;
      }
      paymentSummary[payment.type]++;
    });
    
    Object.entries(paymentSummary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🔄 Subscription Summary:');
    const subscriptionSummary = {};
    subscriptions.forEach(subscription => {
      if (!subscriptionSummary[subscription.status]) {
        subscriptionSummary[subscription.status] = 0;
      }
      subscriptionSummary[subscription.status]++;
    });
    
    Object.entries(subscriptionSummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n📋 Plan Summary:');
    plans.forEach(plan => {
      const planSubscriptions = subscriptions.filter(s => s.planId === plan.id);
      console.log(`  ${plan.name}: ${planSubscriptions.length} subscriptions - $${plan.price}/${plan.billingCycle?.value || 'monthly'}`);
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
  createSuperAdmin, 
  createOutlets, 
  createOutletUsers, 
  createCategories, 
  createProducts, 
  createCustomers, 
  createOrders 
};
