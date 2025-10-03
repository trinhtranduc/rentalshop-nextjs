#!/usr/bin/env node

/**
 * 🎯 Calendar Orders Seeder
 * 
 * Creates diverse orders for calendar display testing
 * - Different order types (RENT, SALE)
 * - Various statuses (RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED)
 * - Spread across current month and next month
 * - Different pickup/return dates for realistic calendar view
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get next ID
async function getNextId() {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: 'desc' }
  });
  return (lastOrder?.id || 0) + 1;
}

// Helper function to get random date in range
function getRandomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

// Helper function to add days to date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Generate order number
function generateOrderNumber(outletId, sequence) {
  return `CAL-${String(outletId).padStart(3, '0')}-${String(sequence).padStart(4, '0')}`;
}

async function seedCalendarOrders() {
  console.log('🎯 Starting Calendar Orders Seeding...\n');

  try {
    // Get existing data
    const outlets = await prisma.outlet.findMany({
      include: { merchant: true }
    });

    const customers = await prisma.customer.findMany();
    const products = await prisma.product.findMany();

    if (outlets.length === 0 || customers.length === 0 || products.length === 0) {
      console.log('❌ Missing required data. Please run the main seed script first.');
      return;
    }

    console.log(`📊 Found: ${outlets.length} outlets, ${customers.length} customers, ${products.length} products`);

    // Get current date and create date ranges
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Create date ranges for different scenarios
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthEnd = new Date(currentYear, currentMonth + 2, 0);

    console.log(`📅 Date ranges:`);
    console.log(`   Current month: ${currentMonthStart.toDateString()} - ${currentMonthEnd.toDateString()}`);
    console.log(`   Next month: ${nextMonthStart.toDateString()} - ${nextMonthEnd.toDateString()}`);

    const ordersToCreate = [];
    let nextId = await getNextId();

    // 🎯 Create diverse orders for calendar display
    const orderScenarios = [
      // Current month - RESERVED orders (upcoming pickups)
      {
        count: 8,
        orderType: 'RENT',
        status: 'RESERVED',
        dateRange: { start: currentMonthStart, end: currentMonthEnd },
        pickupOffset: 0, // Pickup today or in future
        returnOffset: 7, // Return in 7 days
        description: 'RESERVED orders for current month'
      },
      
      // Current month - PICKUPED orders (currently rented)
      {
        count: 6,
        orderType: 'RENT',
        status: 'PICKUPED',
        dateRange: { start: new Date(currentYear, currentMonth, 1), end: new Date() },
        pickupOffset: -5, // Picked up 5 days ago
        returnOffset: 7, // Return in 7 days
        description: 'PICKUPED orders (currently rented)'
      },
      
      // Current month - RETURNED orders (completed rentals)
      {
        count: 4,
        orderType: 'RENT',
        status: 'RETURNED',
        dateRange: { start: new Date(currentYear, currentMonth, 1), end: new Date() },
        pickupOffset: -10, // Picked up 10 days ago
        returnOffset: -3, // Returned 3 days ago
        description: 'RETURNED orders (completed)'
      },
      
      // Next month - RESERVED orders (future pickups)
      {
        count: 5,
        orderType: 'RENT',
        status: 'RESERVED',
        dateRange: { start: nextMonthStart, end: nextMonthEnd },
        pickupOffset: 30, // Pickup in next month
        returnOffset: 37, // Return 7 days later
        description: 'RESERVED orders for next month'
      },
      
      // SALE orders (completed sales)
      {
        count: 3,
        orderType: 'SALE',
        status: 'COMPLETED',
        dateRange: { start: currentMonthStart, end: currentMonthEnd },
        pickupOffset: -2, // Sold 2 days ago
        returnOffset: null, // No return for sales
        description: 'SALE orders (completed)'
      }
    ];

    console.log('\n🎯 Creating orders for different scenarios:');

    for (const scenario of orderScenarios) {
      console.log(`\n📦 ${scenario.description} (${scenario.count} orders)`);
      
      for (let i = 0; i < scenario.count; i++) {
        // Select random data
        const outlet = outlets[Math.floor(Math.random() * outlets.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        
        // Generate dates
        const baseDate = getRandomDate(scenario.dateRange.start, scenario.dateRange.end);
        const pickupDate = scenario.pickupOffset !== null ? 
          addDays(baseDate, scenario.pickupOffset) : null;
        const returnDate = scenario.returnOffset !== null ? 
          addDays(baseDate, scenario.returnOffset) : null;

        // Create order data
        const orderData = {
          orderNumber: generateOrderNumber(outlet.id, nextId),
          orderType: scenario.orderType,
          status: scenario.status,
          outletId: outlet.id,
          customerId: customer.id,
          pickupPlanAt: pickupDate,
          returnPlanAt: returnDate,
          pickedUpAt: scenario.status === 'PICKUPED' ? pickupDate : null,
          returnedAt: scenario.status === 'RETURNED' ? returnDate : null,
          totalAmount: Math.floor(Math.random() * 500) + 50, // $50-$550
          depositAmount: Math.floor(Math.random() * 100) + 10, // $10-$110
          notes: `Calendar test order - ${scenario.description}`,
          createdById: 1001 // Admin user ID
        };

        ordersToCreate.push(orderData);
        nextId++;
        
        console.log(`   ✅ ${orderData.orderNumber} | ${scenario.status} | Pickup: ${pickupDate?.toLocaleDateString() || 'N/A'} | Return: ${returnDate?.toLocaleDateString() || 'N/A'}`);
      }
    }

    // 🎯 Create the orders in database
    console.log('\n💾 Creating orders in database...');
    
    const createdOrders = await prisma.order.createMany({
      data: ordersToCreate
    });

    console.log(`✅ Created ${createdOrders.count} orders successfully!`);

    // 🎯 Create order items for each order
    console.log('\n📦 Creating order items...');
    
    let orderItemsCreated = 0;
    for (const orderData of ordersToCreate) {
      const order = await prisma.order.findFirst({
        where: { orderNumber: orderData.orderNumber }
      });

      if (order) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
        const unitPrice = Math.floor(Math.random() * 100) + 20; // $20-$120

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: unitPrice * quantity
          }
        });

        orderItemsCreated++;
      }
    }

    console.log(`✅ Created ${orderItemsCreated} order items successfully!`);

    // 🎯 Summary
    console.log('\n🎉 Calendar Orders Seeding Complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Total orders created: ${createdOrders.count}`);
    console.log(`   • Order items created: ${orderItemsCreated}`);
    console.log(`   • Date range: ${currentMonthStart.toLocaleDateString()} - ${nextMonthEnd.toLocaleDateString()}`);
    console.log(`   • Order types: RENT (most), SALE (few)`);
    console.log(`   • Statuses: RESERVED, PICKUPED, RETURNED, COMPLETED`);
    
    console.log('\n🎯 Calendar should now show:');
    console.log('   • Order counts per day');
    console.log('   • Different pickup/return dates');
    console.log('   • Various order statuses');
    console.log('   • Rich data for testing modal');

  } catch (error) {
    console.error('❌ Error seeding calendar orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedCalendarOrders()
    .then(() => {
      console.log('\n✅ Calendar orders seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Calendar orders seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCalendarOrders };
