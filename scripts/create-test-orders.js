// Simple script to create test orders with new BOOKED status

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestOrders() {
  try {
    console.log('🚀 Creating test orders with new BOOKED status...');

    // Get first merchant and outlet
    const merchant = await prisma.merchant.findFirst();
    const outlet = await prisma.outlet.findFirst();
    const customer = await prisma.customer.findFirst();
    const product = await prisma.product.findFirst();

    if (!merchant || !outlet || !customer || !product) {
      console.log('❌ Missing required data. Please run the main seed script first.');
      return;
    }

    console.log('📊 Found data:', {
      merchant: merchant.name,
      outlet: outlet.name,
      customer: `${customer.firstName} ${customer.lastName}`,
      product: product.name
    });

    // Create a RENT order with BOOKED status
    const rentOrder = await prisma.order.create({
      data: {
        publicId: 1,
        orderNumber: 'RENT-2025-001',
        orderType: 'RENT',
        status: 'BOOKED', // New status!
        totalAmount: 50.00,
        depositAmount: 25.00,
        pickupPlanAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        returnPlanAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        outletId: outlet.id,
        customerId: customer.id,
        orderItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 50.00,
            totalPrice: 50.00,
            rentalDays: 3
          }
        }
      }
    });

    console.log('✅ RENT order created with BOOKED status:', rentOrder.orderNumber);

    // Create a SALE order with COMPLETED status
    const saleOrder = await prisma.order.create({
      data: {
        publicId: 2,
        orderNumber: 'SALE-2025-001',
        orderType: 'SALE',
        status: 'COMPLETED',
        totalAmount: 100.00,
        depositAmount: 0,
        outletId: outlet.id,
        customerId: customer.id,
        orderItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 100.00,
            totalPrice: 100.00
          }
        }
      }
    });

    console.log('✅ SALE order created with COMPLETED status:', saleOrder.orderNumber);

    // Create another RENT order with ACTIVE status
    const activeOrder = await prisma.order.create({
      data: {
        publicId: 3,
        orderNumber: 'RENT-2025-002',
        orderType: 'RENT',
        status: 'ACTIVE',
        totalAmount: 75.00,
        depositAmount: 30.00,
        pickupPlanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        returnPlanAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        pickedUpAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Picked up 1 day ago
        outletId: outlet.id,
        customerId: customer.id,
        orderItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 75.00,
            totalPrice: 75.00,
            rentalDays: 3
          }
        }
      }
    });

    console.log('✅ RENT order created with ACTIVE status:', activeOrder.orderNumber);

    console.log('\n🎉 Test orders created successfully!');
    console.log('📋 Order Summary:');
    console.log(`- RENT-2025-001: ${rentOrder.status} (mới cục)`);
    console.log(`- SALE-2025-001: ${saleOrder.status} (hoàn thành)`);
    console.log(`- RENT-2025-002: ${activeOrder.status} (đang thuê)`);

  } catch (error) {
    console.error('❌ Error creating test orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrders();
