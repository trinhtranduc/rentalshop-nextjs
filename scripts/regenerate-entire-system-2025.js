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
const { SUBSCRIPTION_PLANS } = require('../packages/constants/src/subscription.ts');

const prisma = new PrismaClient();

// Helper function to mask sensitive information in DATABASE_URL
function maskDatabaseUrl(url) {
  if (!url) return 'Not set';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch (e) {
    return url.substring(0, 20) + '...';
  }
}

// Check if database schema exists
async function checkDatabaseSchema() {
  try {
    // Check if User table exists (one of the main tables)
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `;
    
    const tableExists = result[0]?.exists;
    
    if (!tableExists) {
      console.warn('\n⚠️  Database schema does not exist!');
      console.warn('   Tables not found in the database.\n');
      console.warn('💡 Script will skip reset operations and only create new data.\n');
      console.warn('   To push schema first, run:\n');
      console.warn('   Option 1: Using Prisma CLI');
      console.warn('     npx prisma db push --accept-data-loss\n');
      console.warn('   Option 2: On Railway');
      console.warn('     railway run --service apis npx prisma db push --accept-data-loss\n');
      console.warn('   Option 3: Using migrations');
      console.warn('     npx prisma migrate deploy\n');
      return false; // Return false instead of throwing - script can continue
    }
    
    return true;
  } catch (error) {
    // If query fails for other reasons, schema might not exist
    console.warn('\n⚠️  Could not verify database schema. Script will continue with graceful handling...\n');
    return false;
  }
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n🔍 Checking database connection...');
  
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = maskDatabaseUrl(dbUrl);
  console.log(`📊 DATABASE_URL: ${maskedUrl}`);
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set!\n' +
      'Please ensure DATABASE_URL is configured:\n' +
      '  - On Railway: railway variables --service apis\n' +
      '  - Locally: Set DATABASE_URL in .env file');
  }
  
  try {
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check if schema exists
    const schemaExists = await checkDatabaseSchema();
    
    if (schemaExists) {
      console.log('✅ Database schema exists\n');
    } else {
      console.log('⚠️  Database schema not found - script will handle gracefully\n');
    }
    
    return schemaExists;
  } catch (error) {
    console.error('\n❌ Database connection or schema check failed!');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.error('💡 Possible solutions:');
      console.error('  1. Ensure PostgreSQL service is running on Railway');
      console.error('  2. Check if DATABASE_URL is correct');
      console.error('  3. Verify network connectivity to database');
      console.error('  4. If running locally, ensure DATABASE_URL uses public URL, not internal Railway URL');
      console.error('');
      console.error('   For Railway, ensure you use:');
      console.error('   railway run --service apis yarn db:regenerate-system');
    } else if (error.message.includes('schema does not exist')) {
      // Error message already shown by checkDatabaseSchema
      throw error;
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Authentication failed - check database credentials in DATABASE_URL');
    } else if (error.message.includes('database')) {
      console.error('💡 Database may not exist - run: npx prisma db push');
    }
    
    throw error;
  }
}

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
  BILLING_PERIODS: 3, // Monthly, Quarterly, Yearly
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
let idCounter = 1000; // Start from 1000 to avoid conflicts

// Helper function to get next public ID
function getNextPublicId() {
  return ++idCounter;
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
    // Note: subscriptionPayment model was removed, using unified Payment model
    
    // Check if Payment table exists before trying to delete
    const paymentTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Payment'
      );
    `;
    
    if (paymentTableExists[0]?.exists) {
      await prisma.payment.deleteMany({});
      console.log('✅ Deleted all payments');
    } else {
      console.log('⚠️  Payment table does not exist, skipping');
    }
    
    // Helper function to safely delete from table
    async function safeDeleteTable(tableName, deleteFunction, logMessage) {
      try {
        // Try to delete - if table doesn't exist, it will throw an error
        await deleteFunction();
        console.log(logMessage);
      } catch (error) {
        // Check if error is because table doesn't exist
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          console.log(`⚠️  ${tableName} table does not exist, skipping`);
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
    
    await safeDeleteTable('Subscription', 
      () => prisma.subscription.deleteMany({}),
      '✅ Deleted all subscriptions'
    );
    
    await safeDeleteTable('Plan',
      () => prisma.plan.deleteMany({}),
      '✅ Deleted all plans'
    );
    
    // Reset merchant plans and subscription status (only if Merchant table exists)
    const merchantTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Merchant'
      );
    `;
    
    if (merchantTableExists[0]?.exists) {
      try {
        await prisma.merchant.updateMany({
          data: {
            planId: null,
            subscriptionStatus: 'trial'
          }
        });
        console.log('✅ Reset merchant plans and subscription status');
      } catch (error) {
        // Ignore if columns don't exist yet
        console.log('⚠️  Could not reset merchant plans (columns may not exist)');
      }
    }
    
    await safeDeleteTable('OrderItem',
      () => prisma.orderItem.deleteMany({}),
      '✅ Deleted all order items'
    );
    
    await safeDeleteTable('Order',
      () => prisma.order.deleteMany({}),
      '✅ Deleted all orders'
    );
    
    await safeDeleteTable('OutletStock',
      () => prisma.outletStock.deleteMany({}),
      '✅ Deleted all outlet stock'
    );
    
    await safeDeleteTable('Product',
      () => prisma.product.deleteMany({}),
      '✅ Deleted all products'
    );
    
    await safeDeleteTable('Category',
      () => prisma.category.deleteMany({}),
      '✅ Deleted all categories'
    );
    
    await safeDeleteTable('Customer',
      () => prisma.customer.deleteMany({}),
      '✅ Deleted all customers'
    );
    
    await safeDeleteTable('User',
      () => prisma.user.deleteMany({}),
      '✅ Deleted all users'
    );
    
    await safeDeleteTable('Outlet',
      () => prisma.outlet.deleteMany({}),
      '✅ Deleted all outlets'
    );
    
    await safeDeleteTable('Merchant',
      () => prisma.merchant.deleteMany({}),
      '✅ Deleted all merchants'
    );
    
    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Step 2: Create merchants
async function createMerchants() {
  console.log('\n🏢 Creating merchants with default outlets...');
  
  const merchants = [];
  let outletId = 1;
  
  // Sample business data for realistic merchant information
  const businessData = [
    {
      name: 'Rental Shop Demo',
      businessType: 'EQUIPMENT',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      phone: '+1-555-0100',
      website: 'https://rentalshop-demo.com',
      taxId: '12-3456789',
      description: 'Professional equipment rental services for construction and events'
    },
    {
      name: 'Outdoor Equipment Co.',
      businessType: 'EQUIPMENT',
      address: '456 Mountain View Drive',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      country: 'United States',
      phone: '+1-555-0200',
      website: 'https://outdoor-equipment-co.com',
      taxId: '98-7654321',
      description: 'Premium outdoor gear and adventure equipment rentals'
    }
  ];
  
  for (let i = 1; i <= SYSTEM_CONFIG.MERCHANTS; i++) {
    const business = businessData[i - 1] || {
      name: `Merchant ${i}`,
      businessType: 'GENERAL',
      address: `${i * 100} Business Ave`,
      city: 'City',
      state: 'ST',
      zipCode: `${10000 + i}`,
      country: 'United States',
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      website: `https://merchant${i}.com`,
      taxId: `${i}-${String(Math.random() * 1000000).padStart(7, '0')}`,
      description: `Description for Merchant ${i}`
    };
    
    const merchant = await prisma.merchant.create({
      data: {
        name: business.name,
        email: `merchant${i}@example.com`,
        phone: business.phone,
        address: business.address,
        city: business.city,
        state: business.state,
        zipCode: business.zipCode,
        country: business.country,
        businessType: business.businessType, // enum: GENERAL | VEHICLE | CLOTHING | EQUIPMENT
        pricingType: business.businessType === 'EQUIPMENT' ? 'DAILY' : 'FIXED',
        taxId: business.taxId,
        website: business.website,
        description: business.description,
        pricingConfig: JSON.stringify({
          businessType: business.businessType,
          defaultPricingType: business.businessType === 'EQUIPMENT' ? 'DAILY' : 'FIXED',
          businessRules: {
            requireRentalDates: business.businessType === 'EQUIPMENT',
            showPricingOptions: business.businessType === 'EQUIPMENT'
          },
          durationLimits: {
            minDuration: business.businessType === 'EQUIPMENT' ? 1 : 1,
            maxDuration: business.businessType === 'EQUIPMENT' ? 30 : 1,
            defaultDuration: business.businessType === 'EQUIPMENT' ? 3 : 1
          }
        }),
        isActive: true,
        subscriptionStatus: 'trial' // Ensure all merchants start with trial status
      }
    });
    
    console.log(`✅ Created merchant: ${merchant.name} (ID: ${merchant.id})`);
    
    // Create default outlet for this merchant immediately with all merchant info
    const defaultOutlet = await prisma.outlet.create({
      data: {
        name: `${business.name} - Main Branch`,
        address: business.address,
        phone: business.phone,
        city: business.city,
        state: business.state,
        zipCode: business.zipCode,
        country: business.country,
        description: `Main branch of ${business.name}`,
        isActive: true,
        isDefault: true, // Mark as default outlet
        merchantId: merchant.id
      }
    });
    
    console.log(`✅ Created default outlet: ${defaultOutlet.name} for ${merchant.name}`);
    
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
        id: getNextPublicId(),
        email: `merchant${merchant.id}@example.com`,
        password: merchantPassword,
        firstName: `Merchant`,
        lastName: `${merchant.id}`,
        phone: `+1-555-${String(merchant.id).padStart(4, '0')}`,
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
      id: getNextPublicId(),
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

// Step 4: Create additional outlets (non-default)
async function createAdditionalOutlets(merchants) {
  console.log('\n🏪 Creating additional outlets...');
  
  const outlets = [];
  let outletId = merchants.length + 1; // Start after default outlets
  
  for (const merchant of merchants) {
    // Create additional outlets (excluding the default one already created)
    for (let i = 2; i <= SYSTEM_CONFIG.OUTLETS_PER_MERCHANT; i++) {
      const outlet = await prisma.outlet.create({
        data: {
          name: `Outlet ${i} - ${merchant.name}`,
          address: `Address for Outlet ${i} of ${merchant.name}`,
          phone: `+1-555-${String(outletId).padStart(4, '0')}`,
          city: merchant.city,
          state: merchant.state,
          zipCode: merchant.zipCode,
          country: merchant.country,
          description: `Description for Outlet ${i} of ${merchant.name}`,
          isActive: true,
          isDefault: false, // Not default outlet
          merchantId: merchant.id
        }
      });
      
      console.log(`✅ Created additional outlet: ${outlet.name} for ${merchant.name}`);
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
        id: getNextPublicId(),
        email: `admin.outlet${outlet.id}@example.com`,
        password: adminPassword,
        firstName: `Admin`,
        lastName: `Outlet ${outlet.id}`,
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
        id: getNextPublicId(),
        email: `staff.outlet${outlet.id}@example.com`,
        password: staffPassword,
        firstName: `Staff`,
        lastName: `Outlet ${outlet.id}`,
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
          id: categoryId++,
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
        id: productId++,
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
          id: customerId++,
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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      // Create some orders with today's date (first 5 orders per outlet)
      const isTodayOrder = i < 5;
      const orderCreatedAt = isTodayOrder ? 
        new Date(today.getTime() + Math.random() * 24 * 60 * 60 * 1000) : // Random time today
        randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now); // Random date in last 30 days
      
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
      const orderNumber = `ORD-${outlet.id.toString().padStart(3, '0')}-${(i + 1).toString().padStart(4, '0')}`;
      
      try {
        // Create the order
        const order = await prisma.order.create({
          data: {
            id: orderPublicId++,
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
            createdById: outletUsers.find(u => u.outletId === outlet.id)?.id || outletUsers[0]?.id, // Use outlet user as creator
            createdAt: orderCreatedAt // Set custom creation date
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
        
        // Payment creation skipped (using unified Payment model)
        
        orders.push(order);
        
        if (i < 5) { // Log first 5 orders for each outlet
          const dateInfo = isTodayOrder ? ' (TODAY)' : '';
          console.log(`  ✅ Created ${orderType} order: ${orderNumber} - ${status} - $${totalAmount.toFixed(2)}${dateInfo}`);
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
        id: cycleId++,
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

// Step 11: Create modern subscription plans
async function createPlans() {
  console.log('\n📋 Creating modern subscription plans...');
  
  const plans = [];
  let planId = 1;
  
  // Convert SUBSCRIPTION_PLANS to database format
  const planData = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    trialDays: 14,
    maxOutlets: plan.limits.outlets,
    maxUsers: plan.limits.users,
    maxProducts: plan.limits.products,
    maxCustomers: plan.limits.customers,
    features: JSON.stringify(plan.features.map(f => f.name)),
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder
  }));
  
  for (const plan of planData) {
    const subscriptionPlan = await prisma.plan.create({
      data: {
        name: plan.name,
        description: plan.description,
        basePrice: plan.basePrice,
        currency: 'USD',
        trialDays: plan.trialDays,
        limits: JSON.stringify({
          outlets: plan.maxOutlets,
          users: plan.maxUsers,
          products: plan.maxProducts,
          customers: plan.maxCustomers
        }),
        features: plan.features,
        isActive: true,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder
      }
    });
    
    console.log(`✅ Created plan: ${subscriptionPlan.name} - Base: $${subscriptionPlan.basePrice}/month`);
    plans.push(subscriptionPlan);
  }
  
  // Display pricing structure
  console.log('\n💰 Modern Pricing Structure:');
  for (const plan of plans) {
    console.log(`\n📦 ${plan.name} ($${plan.basePrice}/month base):`);
    console.log(`  Monthly:    $${plan.basePrice.toFixed(2)}/month     (0% off)`);
    console.log(`  Quarterly:  $${(plan.basePrice * 3 * 0.9).toFixed(2)}/quarter   (10% off, Save $${(plan.basePrice * 3 * 0.1).toFixed(2)})`);
    console.log(`  Yearly:     $${(plan.basePrice * 12 * 0.8).toFixed(2)}/year      (20% off, Save $${(plan.basePrice * 12 * 0.2).toFixed(2)})`);
  }
  
  return plans;
}

// Step 11.5: Modern pricing system (no plan variants needed)
async function createPlanVariants(plans) {
  console.log('\n📋 Modern pricing system - no plan variants needed');
  console.log('✅ Pricing calculated dynamically: Monthly (0%), Quarterly (10%), Yearly (20%)');
  return []; // No plan variants in modern system
}

// Step 12: Create modern subscriptions for merchants
async function createSubscriptions(merchants, plans, planVariants) {
  console.log('\n🔄 Creating modern merchant subscriptions...');
  
  const subscriptions = [];
  let subscriptionId = 1;
  
  // Modern pricing configuration
  const PRICING_CONFIG = {
    DISCOUNTS: {
      monthly: 0,      // 0% discount
      quarterly: 10,   // 10% discount
      yearly: 20,      // 20% discount
    }
  };
  
  // Calculate pricing for a given base price and period
  function calculatePricing(basePrice, period) {
    const totalMonths = period;
    const totalBasePrice = basePrice * totalMonths;
    const discount = PRICING_CONFIG.DISCOUNTS[period === 1 ? 'monthly' : period === 3 ? 'quarterly' : 'yearly'];
    const discountAmount = (totalBasePrice * discount) / 100;
    const finalPrice = totalBasePrice - discountAmount;
    
    return {
      basePrice: totalBasePrice,
      discount,
      finalPrice,
      savings: discountAmount,
      interval: period === 1 ? 'month' : period === 3 ? 'month' : 'year',
      intervalCount: period === 1 ? 1 : period === 3 ? 3 : 1
    };
  }
  
  const billingPeriods = [1, 3, 12]; // Monthly, Quarterly, Yearly
  const statuses = ['trial', 'active', 'past_due', 'cancelled', 'paused'];
  
  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const plan = plans[i % plans.length]; // Rotate through plans
    const period = billingPeriods[i % billingPeriods.length];
    const status = statuses[i % statuses.length];
    
    const pricing = calculatePricing(plan.basePrice, period);
    
    // Calculate dates
    const now = new Date();
    const trialStart = plan.trialDays > 0 ? now : undefined;
    const trialEnd = plan.trialDays > 0 ? new Date(now.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000)) : undefined;
    
    const currentPeriodStart = trialEnd || now;
    const currentPeriodEnd = new Date(currentPeriodStart.getTime() + (period * 30 * 24 * 60 * 60 * 1000));
    
    const subscription = await prisma.subscription.create({
      data: {
        id: subscriptionId++,
        merchantId: merchant.id,
        planId: plan.id,
        status: status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        amount: pricing.finalPrice,
        currency: 'USD',
        interval: pricing.interval,
        intervalCount: pricing.intervalCount,
        period: period,
        discount: pricing.discount,
        savings: pricing.savings,
        cancelAtPeriodEnd: status === 'cancelled',
        canceledAt: status === 'cancelled' ? now : null,
        cancelReason: status === 'cancelled' ? 'Sample cancellation' : null
      }
    });
    
    // Update merchant with plan reference
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        planId: plan.id,
        subscriptionStatus: status
      }
    });
    
    const periodName = period === 1 ? 'Monthly' : period === 3 ? 'Quarterly' : 'Yearly';
    console.log(`✅ Created ${status} subscription for ${merchant.name} - ${plan.name} (${periodName}, $${pricing.finalPrice.toFixed(2)}, ${pricing.discount}% off)`);
    subscriptions.push(subscription);
  }
  
  return subscriptions;
}

// Step 13: Create additional payments for orders (removed - using unified Payment model)

// Step 14: Create subscription payments (removed - using unified Payment model)

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
    console.log(`  • ${SYSTEM_CONFIG.PLANS} modern subscription plans`);
    console.log(`  • ${SYSTEM_CONFIG.BILLING_PERIODS} billing periods (Monthly, Quarterly, Yearly)`);
    console.log(`  • ${SYSTEM_CONFIG.SUBSCRIPTIONS} merchant subscriptions`);
    console.log('');
    
    if (process.env.MAIN_DATABASE_URL) {
      console.log('🏢 MAIN_DATABASE_URL detected – remember to run `yarn db:seed-main` after this script to register the tenant with the central registry.\n');
    } else {
      console.log('⚠️ MAIN_DATABASE_URL is not set. Multi-tenant registry seeding will be skipped. Set MAIN_DATABASE_URL and run `yarn db:seed-main` to register this tenant.\n');
    }
    
    // Step 0: Test database connection
    const schemaExists = await testDatabaseConnection();
    
    // Step 1: Reset database (only if schema exists)
    if (schemaExists) {
      await resetDatabase();
    } else {
      console.log('\n⚠️  Skipping database reset - schema does not exist');
      console.log('   Will proceed to create new data only\n');
      console.log('💡 To push schema first, run: npx prisma db push --accept-data-loss\n');
    }
    
    // Step 2: Create subscription plans FIRST
    console.log('📋 Creating subscription plans...');
    const plans = await createPlans();
    
    // Step 3: Create plan variants
    console.log('📋 Creating plan variants...');
    const planVariants = await createPlanVariants(plans);
    
    // Step 4: Create super admin user
    console.log('📋 Creating super admin...');
    const superAdmin = await createSuperAdmin();
    
    // Step 5: Create merchants
    console.log('📋 Creating merchants...');
    const merchants = await createMerchants();
    
    // Step 6: Create merchant accounts
    console.log('📋 Creating merchant accounts...');
    const merchantUsers = await createMerchantAccounts(merchants);
    
    // Step 7: Create additional outlets
    console.log('📋 Creating additional outlets...');
    const additionalOutlets = await createAdditionalOutlets(merchants);
    
    // Get all outlets (default + additional)
    const allOutlets = await prisma.outlet.findMany({
      orderBy: { id: 'asc' }
    });
    console.log(`📊 Total outlets created: ${allOutlets.length} (${merchants.length} default + ${additionalOutlets.length} additional)`);
    
    // Step 8: Create outlet users
    console.log('📋 Creating outlet users...');
    const outletUsers = await createOutletUsers(allOutlets);
    
    // Step 9: Create categories
    console.log('📋 Creating categories...');
    const categories = await createCategories(merchants);
    
    // Step 10: Create products
    console.log('📋 Creating products...');
    const products = await createProducts(categories, allOutlets);
    
    // Step 11: Create customers
    console.log('📋 Creating customers...');
    const customers = await createCustomers(merchants);
    
    // Step 12: Create orders
    console.log('📋 Creating orders...');
    const orders = await createOrders(allOutlets, customers, products, outletUsers);
    
    // Step 13: Create merchant subscriptions (with proper plan assignment)
    console.log('📋 Creating merchant subscriptions...');
    const subscriptions = await createSubscriptions(merchants, plans, planVariants);
    
    // Step 14: Create subscription payments
    console.log('📋 Creating subscription payments...');
    const subscriptionPayments = await createSubscriptionPayments(subscriptions);
    
    // Step 13: Skip payment creation (using unified Payment model)
    // const additionalPayments = await createAdditionalPayments(orders);
    
    // Step 14: Skip subscription payments (using unified Payment model)
    // const subscriptionPayments = await createSubscriptionPayments(subscriptions);
    
    console.log('\n🎉 Complete system regeneration completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`  ✅ ${plans.length} modern subscription plans created`);
    console.log(`  ✅ Modern pricing system (Monthly, Quarterly, Yearly)`);
    console.log(`  ✅ 1 super admin created`);
    console.log(`  ✅ ${merchants.length} merchants created`);
    console.log(`  ✅ ${merchantUsers.length} merchant accounts created`);
    console.log(`  ✅ ${allOutlets.length} outlets created (${merchants.length} default + ${additionalOutlets.length} additional)`);
    console.log(`  ✅ ${outletUsers.length} outlet users created`);
    console.log(`  ✅ ${categories.length} categories created`);
    console.log(`  ✅ ${products.length} products created`);
    console.log(`  ✅ ${customers.length} customers created`);
    console.log(`  ✅ ${orders.length} orders created (${SYSTEM_CONFIG.TOTAL_OUTLETS * 5} with today's date)`);
    console.log(`  ✅ ${subscriptions.length} merchant subscriptions created`);
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

    console.log('  ⏭️  Payments skipped (using unified Payment model)');
    
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
      const planVariantsForPlan = planVariants.filter(v => v.planId === plan.id);
      console.log(`  ${plan.name}: ${planSubscriptions.length} subscriptions - Base: $${plan.basePrice}/month`);
      console.log(`    Variants: ${planVariantsForPlan.length} options (${planVariantsForPlan.map(v => `${v.name}: $${v.price}`).join(', ')})`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during system regeneration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create subscription payments for all subscriptions
 */
async function createSubscriptionPayments(subscriptions) {
  console.log('  💳 Creating subscription payments...');
  const payments = [];
  
  for (const subscription of subscriptions) {
    try {
      // Get next payment public ID
      const lastPayment = await prisma.payment.findFirst({
        orderBy: { id: 'desc' }
      });
      const paymentPublicId = (lastPayment?.id || 0) + 1;
      
      // Create payment record for subscription
      const payment = await prisma.payment.create({
        data: {
          id: paymentPublicId,
          subscriptionId: subscription.id,
          merchantId: subscription.merchantId,
          amount: subscription.amount,
          currency: subscription.currency,
          method: 'STRIPE', // Default to Stripe for demo
          type: 'SUBSCRIPTION_PAYMENT',
          status: 'COMPLETED',
          reference: `sub_${subscription.id}_${Date.now()}`,
          description: `Payment for ${subscription.plan?.name} subscription`,
          processedAt: new Date()
        }
      });
      
      payments.push(payment);
      console.log(`    ✅ Created payment for subscription ${subscription.id}`);
      
    } catch (error) {
      console.error(`    ❌ Error creating payment for subscription ${subscription.id}:`, error.message);
    }
  }
  
  console.log(`  ✅ Created ${payments.length} subscription payments`);
  return payments;
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
  createAdditionalOutlets, 
  createOutletUsers, 
  createCategories, 
  createProducts, 
  createCustomers, 
  createOrders,
  createPlans,
  createPlanVariants,
  createSubscriptions,
  createSubscriptionPayments
};
