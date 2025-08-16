#!/usr/bin/env node

/**
 * Create Test Orders Script
 * Creates sample rental orders for testing the calendar functionality
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestOrders() {
  try {
    console.log('🔧 Creating test orders for calendar testing...\n');

    // Get or create a merchant
    let merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      console.log('No merchant found. Creating a test merchant...');
      merchant = await prisma.merchant.create({
        data: {
          companyName: 'Test Rental Shop',
          businessLicense: 'TEST123',
          address: '123 Test Street',
          description: 'Test merchant for development',
          isVerified: true,
          isActive: true,
          userId: 'test-user-id'
        }
      });
      console.log('Created merchant:', merchant.id);
    }

    // Get or create an outlet
    let outlet = await prisma.outlet.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!outlet) {
      console.log('No outlet found. Creating a test outlet...');
      outlet = await prisma.outlet.create({
        data: {
          name: 'Main Store',
          address: '123 Main Street',
          phone: '555-0123',
          merchantId: merchant.id,
          isActive: true
        }
      });
      console.log('Created outlet:', outlet.id);
    }

    // Get or create a customer
    let customer = await prisma.customer.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!customer) {
      console.log('No customer found. Creating a test customer...');
      customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0101',
          address: '456 Customer Ave',
          city: 'Test City',
          state: 'TS',
          country: 'USA',
          merchantId: merchant.id,
          isActive: true
        }
      });
      console.log('Created customer:', customer.id);
    }

    // Get or create a product
    let product = await prisma.product.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!product) {
      console.log('No product found. Creating a test product...');
      product = await prisma.product.create({
        data: {
          name: 'Test Gaming Laptop',
          description: 'High-performance gaming laptop for testing',
          barcode: 'TEST-LAPTOP-001',
          totalStock: 5,
          rentPrice: 50.00,
          deposit: 200.00,
          merchantId: merchant.id,
          categoryId: 'test-category-id', // We'll need to create a category first
          isActive: true
        }
      });
      console.log('Created product:', product.id);
    }

    // Get or create a category
    let category = await prisma.category.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!category) {
      console.log('No category found. Creating a test category...');
      category = await prisma.category.create({
        data: {
          name: 'Electronics',
          description: 'Electronic devices and gadgets',
          merchantId: merchant.id
        }
      });
      console.log('Created category:', category.id);
    }

    // If we created a product without a category, update it
    if (product && !product.categoryId) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { categoryId: category.id }
      });
      console.log('Updated product with category:', category.id);
    }

    // Create outlet stock for the product
    let outletStock = await prisma.outletStock.findFirst({
      where: { 
        productId: product.id,
        outletId: outlet.id
      }
    });
    if (!outletStock) {
      console.log('Creating outlet stock for product...');
      outletStock = await prisma.outletStock.create({
        data: {
          productId: product.id,
          outletId: outlet.id,
          stock: 5,
          available: 5,
          renting: 0
        }
      });
      console.log('Created outlet stock:', outletStock.id);
    }

    // Create test orders for the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const testOrders = [
      {
        orderNumber: `${Date.now()}-001`,
        orderType: 'RENT',
        status: 'CONFIRMED',
        pickupPlanAt: new Date(currentYear, currentMonth, 5, 10, 0), // 5th of current month
        returnPlanAt: new Date(currentYear, currentMonth, 12, 18, 0), // 12th of current month
        totalAmount: 150.00,
        depositAmount: 200.00,
        outletId: outlet.id,
        customerId: customer.id
      },
      {
        orderNumber: `${Date.now()}-002`,
        orderType: 'RENT',
        status: 'ACTIVE',
        pickupPlanAt: new Date(currentYear, currentMonth, 8, 14, 0), // 8th of current month
        returnPlanAt: new Date(currentYear, currentMonth, 15, 18, 0), // 15th of current month
        totalAmount: 200.00,
        depositAmount: 250.00,
        outletId: outlet.id,
        customerId: customer.id
      },
      {
        orderNumber: `${Date.now()}-003`,
        orderType: 'RENT',
        status: 'CONFIRMED',
        pickupPlanAt: new Date(currentYear, currentMonth, 12, 9, 0), // 12th of current month
        returnPlanAt: new Date(currentYear, currentMonth, 19, 18, 0), // 19th of current month
        totalAmount: 175.00,
        depositAmount: 225.00,
        outletId: outlet.id,
        customerId: customer.id
      },
      {
        orderNumber: `${Date.now()}-004`,
        orderType: 'RENT',
        status: 'CONFIRMED',
        pickupPlanAt: new Date(currentYear, currentMonth, 15, 11, 0), // 15th of current month
        returnPlanAt: new Date(currentYear, currentMonth, 22, 18, 0), // 22nd of current month
        totalAmount: 125.00,
        depositAmount: 175.00,
        outletId: outlet.id,
        customerId: customer.id
      },
      {
        orderNumber: `${Date.now()}-005`,
        orderType: 'RENT',
        status: 'ACTIVE',
        pickupPlanAt: new Date(currentYear, currentMonth, 20, 13, 0), // 20th of current month
        returnPlanAt: new Date(currentYear, currentMonth, 27, 18, 0), // 27th of current month
        totalAmount: 225.00,
        depositAmount: 275.00,
        outletId: outlet.id,
        customerId: customer.id
      }
    ];

    console.log('Creating test orders...');
    
    for (const orderData of testOrders) {
      try {
        // Create the order
        const order = await prisma.order.create({
          data: orderData
        });
        console.log(`✅ Created order: ${order.orderNumber} for ${order.pickupPlanAt.toDateString()}`);

        // Create order items
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: 1,
            unitPrice: order.totalAmount,
            totalPrice: order.totalAmount
          }
        });
        console.log(`   - Added order item for product: ${product.name}`);

      } catch (error) {
        console.error(`❌ Failed to create order ${orderData.orderNumber}:`, error.message);
      }
    }

    console.log('\n🎉 Test orders created successfully!');
    console.log(`📅 Orders created for ${monthNames[currentMonth]} ${currentYear}`);
    console.log('💡 You can now test the calendar functionality');

  } catch (error) {
    console.error('❌ Error creating test orders:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Month names for display
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

createTestOrders();
