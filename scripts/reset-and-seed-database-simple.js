/**
 * Database Reset and Seeding Script (Simple Version)
 * 
 * This script will:
 * 1. Reset the database (clear all data)
 * 2. Create 2 merchants
 * 3. Create 2 outlets for each merchant
 * 4. Create 1 outlet admin and 1 outlet staff for each outlet
 * 5. Create 30 customers for each merchant
 * 6. Create 25 orders for each outlet (20 RENT + 5 SALE)
 *    - RENT orders: 5 RESERVED, 5 PICKUPED, 5 RETURNED, 5 CANCELLED
 *    - SALE orders: 3 COMPLETED, 2 CANCELLED
 * 
 * Run with: node scripts/reset-and-seed-database-simple.js
 * 
 * Note: This version uses simple password hashing without external dependencies
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Proper password hashing function using bcrypt
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Sample data for seeding
const MERCHANT_DATA = [
  {
    name: 'TechRent Pro',
    description: 'Professional technology equipment rental services'
  },
  {
    name: 'EventGear Solutions',
    description: 'Event and party equipment rental company'
  }
];

const OUTLET_DATA = [
  {
    name: 'Downtown Branch',
    address: '123 Main Street, Downtown, City Center',
    phone: '+1-555-0101',
    description: 'Main downtown location with full inventory'
  },
  {
    name: 'Westside Branch',
    address: '456 West Avenue, Westside District',
    phone: '+1-555-0102',
    description: 'Westside location serving suburban areas'
  }
];

const CUSTOMER_NAMES = [
  'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson',
  'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Amanda Rodriguez',
  'William Lee', 'Jessica White', 'Christopher Clark', 'Ashley Lewis', 'Daniel Hall',
  'Megan Young', 'Matthew Allen', 'Stephanie King', 'Joshua Wright', 'Nicole Scott',
  'Andrew Green', 'Rebecca Baker', 'Kevin Adams', 'Laura Nelson', 'Steven Carter',
  'Rachel Mitchell', 'Brian Roberts', 'Amber Turner', 'Jason Phillips', 'Heather Campbell'
];

const PRODUCT_CATEGORIES = [
  'Electronics', 'Audio Equipment', 'Lighting', 'Furniture', 'Tools',
  'Party Supplies', 'Sports Equipment', 'Camping Gear', 'Office Equipment', 'Medical Devices'
];

const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];
const ORDER_TYPES = ['RENT', 'SALE'];

async function resetDatabase() {
  console.log('🗑️  Resetting database...');
  
  // Delete all data in reverse dependency order
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.outletStock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.merchant.deleteMany();
  
  console.log('✅ Database reset completed');
}

async function createMerchants() {
  console.log('🏢 Creating merchants...');
  
  const merchants = [];
  for (let i = 0; i < MERCHANT_DATA.length; i++) {
    const merchant = await prisma.merchant.create({
      data: {
        publicId: i + 1,
        name: MERCHANT_DATA[i].name,
        description: MERCHANT_DATA[i].description,
        isActive: true
      }
    });
    merchants.push(merchant);
    console.log(`✅ Created merchant: ${merchant.name} (ID: ${merchant.publicId})`);
  }
  
  return merchants;
}

async function createMerchantUsers(merchants) {
  console.log('👑 Creating merchant accounts...');
  
  const merchantUsers = [];
  let userId = 1;
  
  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const merchantNumber = i + 1;
    
    // Create merchant account
    const merchantPassword = await hashPassword('merchant123');
    const merchantUser = await prisma.user.create({
      data: {
        publicId: userId++,
        firstName: 'Merchant',
        lastName: `Merchant ${merchantNumber}`,
        email: `merchant${merchantNumber}@example.com`,
        password: merchantPassword,
        phone: `+1-555-${(merchantNumber + 9000).toString().padStart(4, '0')}`, // Use 9000+ range for merchants
        role: 'MERCHANT',
        merchantId: merchant.id,
        isActive: true
      }
    });
    merchantUsers.push(merchantUser);
    console.log(`✅ Created merchant account: ${merchantUser.firstName} ${merchantUser.lastName} for ${merchant.name}`);
  }
  
  return merchantUsers;
}

async function createOutlets(merchants) {
  console.log('🏪 Creating outlets...');
  
  const outlets = [];
  for (const merchant of merchants) {
    for (let i = 0; i < OUTLET_DATA.length; i++) {
      const outlet = await prisma.outlet.create({
        data: {
          publicId: outlets.length + 1,
          name: `${merchant.name} - ${OUTLET_DATA[i].name}`,
          address: OUTLET_DATA[i].address,
          phone: OUTLET_DATA[i].phone,
          description: OUTLET_DATA[i].description,
          merchantId: merchant.id,
          isActive: true
        }
      });
      outlets.push(outlet);
      console.log(`✅ Created outlet: ${outlet.name} (ID: ${outlet.publicId})`);
    }
  }
  
  return outlets;
}

async function createUsers(outlets, merchantUsers) {
  console.log('👥 Creating users...');
  
  const users = [];
  let userId = merchantUsers.length + 1; // Start after merchant users
  
  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const outletNumber = i + 1;
    
    // Create outlet admin
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        publicId: userId++,
        firstName: 'Admin',
        lastName: `Outlet ${outletNumber}`,
        email: `admin.outlet${outletNumber}@example.com`,
        password: adminPassword,
        phone: `+1-555-${outletNumber.toString().padStart(4, '0')}`,
        role: 'OUTLET_ADMIN',
        merchantId: outlet.merchantId,
        outletId: outlet.id,
        isActive: true
      }
    });
    users.push(admin);
    console.log(`✅ Created outlet admin: ${admin.firstName} ${admin.lastName}`);
    
    // Create outlet staff
    const staffPassword = await hashPassword('staff123');
    const staff = await prisma.user.create({
      data: {
        publicId: userId++,
        firstName: 'Staff',
        lastName: `Outlet ${outletNumber}`,
        email: `staff.outlet${outletNumber}@example.com`,
        password: staffPassword,
        phone: `+1-555-${(outletNumber + 1000).toString().padStart(4, '0')}`,
        role: 'OUTLET_STAFF',
        merchantId: outlet.merchantId,
        outletId: outlet.id,
        isActive: true
      }
    });
    users.push(staff);
    console.log(`✅ Created outlet staff: ${staff.firstName} ${staff.lastName}`);
  }
  
  return users;
}

async function createCategories(merchants) {
  console.log('🏷️  Creating product categories...');
  
  const categories = [];
  for (const merchant of merchants) {
    for (let i = 0; i < PRODUCT_CATEGORIES.length; i++) {
      const category = await prisma.category.create({
        data: {
          publicId: categories.length + 1,
          name: PRODUCT_CATEGORIES[i],
          description: `${PRODUCT_CATEGORIES[i]} category for ${merchant.name}`,
          merchantId: merchant.id,
          isActive: true
        }
      });
      categories.push(category);
    }
  }
  
  console.log(`✅ Created ${categories.length} categories`);
  return categories;
}

async function createProducts(categories, outlets) {
  console.log('📦 Creating products...');
  
  const products = [];
  let productId = 1;
  
  for (const category of categories) {
    // Create 3 products per category
    for (let i = 1; i <= 3; i++) {
      const product = await prisma.product.create({
        data: {
          publicId: productId++,
          name: `${category.name} Item ${i}`,
          description: `High-quality ${category.name.toLowerCase()} item ${i}`,
          barcode: `BAR${productId.toString().padStart(6, '0')}`,
          totalStock: Math.floor(Math.random() * 50) + 10,
          rentPrice: Math.floor(Math.random() * 100) + 20,
          salePrice: Math.floor(Math.random() * 200) + 50,
          deposit: Math.floor(Math.random() * 50) + 10,
          merchantId: category.merchantId,
          categoryId: category.id,
          isActive: true
        }
      });
      products.push(product);
      
      // Create outlet stock for each product
      for (const outlet of outlets) {
        if (outlet.merchantId === category.merchantId) {
          const stock = Math.floor(Math.random() * 20) + 5;
          await prisma.outletStock.create({
            data: {
              stock: stock,
              available: stock,
              renting: 0,
              productId: product.id,
              outletId: outlet.id
            }
          });
        }
      }
    }
  }
  
  console.log(`✅ Created ${products.length} products with outlet stock`);
  return products;
}

async function createCustomers(merchants) {
  console.log('👤 Creating customers...');
  
  const customers = [];
  let customerId = 1;
  
  for (const merchant of merchants) {
    for (let i = 0; i < 30; i++) {
      const firstName = CUSTOMER_NAMES[i].split(' ')[0];
      const lastName = CUSTOMER_NAMES[i].split(' ')[1];
      
      const customer = await prisma.customer.create({
        data: {
          publicId: customerId++,
          firstName: firstName,
          lastName: lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`,
          phone: `+1-555-${(1000 + i).toString().padStart(4, '0')}`,
          address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Elm', 'Cedar'][Math.floor(Math.random() * 5)]} Street`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][Math.floor(Math.random() * 5)],
          zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
          country: 'USA',
          merchantId: merchant.id,
          isActive: true
        }
      });
      customers.push(customer);
    }
    console.log(`✅ Created 30 customers for ${merchant.name}`);
  }
  
  return customers;
}

async function createOrders(outlets, customers, products, users) {
  console.log('📋 Creating orders...');
  
  const orders = [];
  let orderId = 1;
  
  for (const outlet of outlets) {
    // Get customers for this merchant
    const outletCustomers = customers.filter(c => c.merchantId === outlet.merchantId);
    // Get products for this merchant
    const outletProducts = products.filter(p => p.merchantId === outlet.merchantId);
    
    // Create 20 RENT orders with appropriate statuses
    const rentStatuses = ['RESERVED', 'PICKUPED', 'RETURNED', 'CANCELLED'];
    const rentStatusCounts = { RESERVED: 5, PICKUPED: 5, RETURNED: 5, CANCELLED: 5 }; // 5 of each status
    
    for (const [status, count] of Object.entries(rentStatusCounts)) {
      for (let i = 0; i < count; i++) {
        const customer = outletCustomers[Math.floor(Math.random() * outletCustomers.length)];
        
        // Find a user for this outlet
        const outletUser = users.find(user => user.outletId === outlet.id);
        if (!outletUser) {
          throw new Error(`No user found for outlet ${outlet.name}`);
        }

        // Create RENT order
        const order = await prisma.order.create({
          data: {
            publicId: orderId++,
            orderNumber: `ORD-${outlet.publicId.toString().padStart(3, '0')}-${(orders.length + 1).toString().padStart(4, '0')}`,
            orderType: 'RENT',
            status: status,
            outletId: outlet.id,
            customerId: customer.id,
            createdById: outletUser.id,
            pickupPlanAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within 7 days
            returnPlanAt: new Date(Date.now() + (7 + Math.random() * 14) * 24 * 60 * 60 * 1000), // Random date 7-21 days from now
            totalAmount: 0,
            depositAmount: 0,
            securityDeposit: 0,
            damageFee: 0,
            lateFee: 0,
            notes: `RENT Order ${i + 1} (${status}) for ${outlet.name}`
          }
        });
        
        // Create order items (1-3 items per order)
        const numItems = Math.floor(Math.random() * 3) + 1;
        let orderTotal = 0;
        
        for (let j = 0; j < numItems; j++) {
          const product = outletProducts[Math.floor(Math.random() * outletProducts.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const unitPrice = product.rentPrice;
          const totalPrice = unitPrice * quantity;
          
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity: quantity,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
              notes: `Item ${j + 1} for RENT order ${order.orderNumber}`
            }
          });
          
          orderTotal += totalPrice;
        }
        
        // Update order totals for RENT orders
        await prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: orderTotal,
            depositAmount: Math.floor(orderTotal * 0.2), // 20% deposit for rentals
            securityDeposit: Math.floor(orderTotal * 0.1) // 10% security deposit
          }
        });
        
        orders.push(order);
      }
    }
    
    // Create 5 SALE orders with appropriate statuses
    const saleStatuses = ['COMPLETED', 'CANCELLED'];
    const saleStatusCounts = { COMPLETED: 3, CANCELLED: 2 }; // 3 completed, 2 cancelled
    
    for (const [status, count] of Object.entries(saleStatusCounts)) {
      for (let i = 0; i < count; i++) {
        const customer = outletCustomers[Math.floor(Math.random() * outletCustomers.length)];
        
        // Find a user for this outlet
        const outletUser = users.find(user => user.outletId === outlet.id);
        if (!outletUser) {
          throw new Error(`No user found for outlet ${outlet.name}`);
        }

        // Create SALE order
        const order = await prisma.order.create({
          data: {
            publicId: orderId++,
            orderNumber: `ORD-${outlet.publicId.toString().padStart(3, '0')}-${(orders.length + 1).toString().padStart(4, '0')}`,
            orderType: 'SALE',
            status: status,
            outletId: outlet.id,
            customerId: customer.id,
            createdById: outletUser.id,
            totalAmount: 0,
            depositAmount: 0,
            securityDeposit: 0,
            damageFee: 0,
            lateFee: 0,
            notes: `SALE Order ${i + 1} (${status}) for ${outlet.name}`
          }
        });
        
        // Create order items (1-3 items per order)
        const numItems = Math.floor(Math.random() * 3) + 1;
        let orderTotal = 0;
        
        for (let j = 0; j < numItems; j++) {
          const product = outletProducts[Math.floor(Math.random() * outletProducts.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const unitPrice = product.salePrice || product.rentPrice; // Use sale price if available, fallback to rent price
          const totalPrice = unitPrice * quantity;
          
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity: quantity,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
              notes: `Item ${j + 1} for SALE order ${order.orderNumber}`
            }
          });
          
          orderTotal += totalPrice;
        }
        
        // Update order totals for SALE orders
        await prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: orderTotal,
            depositAmount: 0, // No deposit for sales
            securityDeposit: 0 // No security deposit for sales
          }
        });
        
        orders.push(order);
      }
    }
    
    console.log(`✅ Created 25 orders for ${outlet.name} (20 RENT + 5 SALE)`);
  }
  
  return orders;
}

async function main() {
  try {
    console.log('🚀 Starting database reset and seeding...\n');
    
    // Step 1: Reset database
    await resetDatabase();
    
    // Step 2: Create merchants
    const merchants = await createMerchants();
    
    // Step 3: Create merchant accounts
    const merchantUsers = await createMerchantUsers(merchants);
    
    // Step 4: Create outlets
    const outlets = await createOutlets(merchants);
    
    // Step 5: Create users (outlet admins and staff)
    const users = await createUsers(outlets, merchantUsers);
    
    // Step 6: Create product categories
    const categories = await createCategories(merchants);
    
    // Step 7: Create products with outlet stock
    const products = await createProducts(categories, outlets);
    
    // Step 8: Create customers
    const customers = await createCustomers(merchants);
    
    // Step 9: Create orders
    const orders = await createOrders(outlets, customers, products, users);
    
    console.log('\n🎉 Database seeding completed successfully!');
    
    console.log('\n📊 Summary:');
    console.log(`   • ${merchants.length} merchants created`);
    console.log(`   • ${outlets.length} outlets created`);
    console.log(`   • ${merchantUsers.length} merchant accounts created`);
    console.log(`   • ${users.length} outlet users created`);
    console.log(`   • ${categories.length} product categories created`);
    console.log(`   • ${products.length} products created`);
    console.log(`   • ${customers.length} customers created`);
    console.log(`   • ${orders.length} orders created`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Merchant Accounts: merchant123');
    console.log('   Outlet Admins: admin123');
    console.log('   Outlet Staff: staff123');
    console.log('   Email format: merchant@merchantname.com');
    console.log('   Email format: admin.outletId@merchantname-outletname.com');
    console.log('   Email format: staff.outletId@merchantname-outletname.com');
    
    console.log('\n⚠️  Note: This is a development setup with proper bcrypt password hashing.');
    console.log('   For production, ensure secure password policies and regular security updates.');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding script
if (require.main === module) {
  main();
}

module.exports = { main };
