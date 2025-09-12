#!/usr/bin/env node

/**
 * Script to create sample orders for today's analytics testing
 * This will help test the today-metrics and enhanced-dashboard endpoints
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTodayOrders() {
  try {
    console.log('🚀 Creating today orders for analytics testing...');

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    console.log('📅 Today:', today.toISOString());
    console.log('📅 Start of day:', startOfDay.toISOString());
    console.log('📅 End of day:', endOfDay.toISOString());

    // Get existing merchants and outlets
    const merchants = await prisma.merchant.findMany({
      include: {
        outlets: true
      }
    });

    if (merchants.length === 0) {
      console.log('❌ No merchants found. Please run the seed script first.');
      return;
    }

    console.log(`📊 Found ${merchants.length} merchants`);

    // Get customers
    const customers = await prisma.customer.findMany({
      take: 10
    });

    if (customers.length === 0) {
      console.log('❌ No customers found. Please run the seed script first.');
      return;
    }

    // Get a user to use as creator
    const creator = await prisma.user.findFirst({
      where: {
        role: { in: ['MERCHANT', 'OUTLET_ADMIN'] }
      }
    });

    if (!creator) {
      console.log('❌ No users found. Please run the seed script first.');
      return;
    }

    console.log(`👥 Found ${customers.length} customers`);
    console.log(`👤 Using creator: ${creator.email} (${creator.role})`);

    const ordersCreated = [];

    // Create orders for each merchant
    for (const merchant of merchants) {
      console.log(`\n🏢 Processing merchant: ${merchant.name} (ID: ${merchant.publicId})`);
      
      for (const outlet of merchant.outlets) {
        console.log(`  🏪 Processing outlet: ${outlet.name} (ID: ${outlet.publicId})`);
        
        // Get products for this merchant with available stock in this outlet
        const products = await prisma.product.findMany({
          where: {
            merchantId: merchant.id,
            isActive: true
          },
          include: {
            outletStock: {
              where: {
                outletId: outlet.id
              }
            }
          }
        });

        const availableProducts = products.filter(product => 
          product.outletStock.some(stock => stock.available > 0)
        );

        if (availableProducts.length === 0) {
          console.log(`    ⚠️  No available products in outlet ${outlet.name}`);
          continue;
        }

        // Create 3-5 orders for this outlet
        const numOrders = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < numOrders; i++) {
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
          const outletStock = product.outletStock.find(stock => stock.outletId === outlet.id);
          
          if (!outletStock || outletStock.available <= 0) {
            continue;
          }

          // Create order with today's dates
          const orderType = Math.random() > 0.5 ? 'RENT' : 'SALE';
          const quantity = Math.floor(Math.random() * 3) + 1;
          const unitPrice = product.rentPrice;
          const totalAmount = unitPrice * quantity;
          
          // Random time today for pickup/return
          const pickupTime = new Date(startOfDay.getTime() + Math.random() * (endOfDay.getTime() - startOfDay.getTime()));
          const returnTime = orderType === 'RENT' ? 
            new Date(pickupTime.getTime() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000) : // 1-7 days later
            null;

          // Generate a unique publicId for the order
          const maxOrder = await prisma.order.findFirst({
            orderBy: { publicId: 'desc' },
            select: { publicId: true }
          });
          const nextPublicId = (maxOrder?.publicId || 0) + 1;

          const order = await prisma.order.create({
            data: {
              publicId: nextPublicId,
              orderNumber: `ORD-${outlet.publicId.toString().padStart(3, '0')}-${(Date.now() + i).toString().slice(-4)}`,
              orderType,
              status: Math.random() > 0.3 ? 'ACTIVE' : 'RESERVED', // 70% active, 30% reserved
              outletId: outlet.id,
              customerId: customer.id,
              createdById: creator.id,
              totalAmount,
              depositAmount: orderType === 'RENT' ? totalAmount * 0.2 : 0,
              pickupPlanAt: pickupTime,
              returnPlanAt: returnTime,
              pickedUpAt: Math.random() > 0.5 ? pickupTime : null,
              returnedAt: orderType === 'RENT' && Math.random() > 0.7 ? returnTime : null,
              orderItems: {
                create: {
                  productId: product.id,
                  quantity,
                  unitPrice,
                  totalPrice: totalAmount
                }
              }
            }
          });

          // Update outlet stock
          await prisma.outletStock.update({
            where: {
              productId_outletId: {
                productId: product.id,
                outletId: outlet.id
              }
            },
            data: {
              available: Math.max(0, outletStock.available - quantity),
              renting: outletStock.renting + (orderType === 'RENT' ? quantity : 0)
            }
          });

          // Create payment for completed orders
          if (order.status === 'ACTIVE' || order.status === 'COMPLETED') {
            // Generate a unique publicId for the payment
            const maxPayment = await prisma.payment.findFirst({
              orderBy: { publicId: 'desc' },
              select: { publicId: true }
            });
            const nextPaymentPublicId = (maxPayment?.publicId || 0) + 1;

            await prisma.payment.create({
              data: {
                publicId: nextPaymentPublicId,
                orderId: order.id,
                amount: totalAmount,
                method: ['CASH', 'CARD', 'BANK_TRANSFER'][Math.floor(Math.random() * 3)],
                type: orderType === 'RENT' ? 'RENTAL' : 'PURCHASE',
                status: 'COMPLETED',
                merchantId: merchant.id
              }
            });
          }

          ordersCreated.push({
            orderNumber: order.orderNumber,
            outlet: outlet.name,
            customer: `${customer.firstName} ${customer.lastName}`,
            product: product.name,
            type: orderType,
            status: order.status,
            amount: totalAmount,
            pickupTime: pickupTime.toISOString()
          });

          console.log(`    ✅ Created order: ${order.orderNumber} (${orderType}) - ${product.name} x${quantity}`);
        }
      }
    }

    console.log(`\n🎉 Successfully created ${ordersCreated.length} orders for today!`);
    console.log('\n📋 Order Summary:');
    ordersCreated.forEach(order => {
      console.log(`  • ${order.orderNumber} | ${order.outlet} | ${order.customer} | ${order.product} | ${order.type} | ${order.status} | $${order.amount}`);
    });

    // Show analytics summary
    const activeOrders = ordersCreated.filter(o => o.status === 'ACTIVE').length;
    const reservedOrders = ordersCreated.filter(o => o.status === 'RESERVED').length;
    const rentOrders = ordersCreated.filter(o => o.type === 'RENT').length;
    const saleOrders = ordersCreated.filter(o => o.type === 'SALE').length;

    console.log('\n📊 Analytics Summary:');
    console.log(`  • Total Orders: ${ordersCreated.length}`);
    console.log(`  • Active Orders: ${activeOrders}`);
    console.log(`  • Reserved Orders: ${reservedOrders}`);
    console.log(`  • Rent Orders: ${rentOrders}`);
    console.log(`  • Sale Orders: ${saleOrders}`);

    console.log('\n🧪 Test the analytics endpoints:');
    console.log('  • Enhanced Dashboard: GET /api/analytics/enhanced-dashboard');
    console.log('  • Today Metrics: GET /api/analytics/today-metrics');
    console.log('  • Growth Metrics: GET /api/analytics/growth-metrics');

  } catch (error) {
    console.error('❌ Error creating today orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTodayOrders();
