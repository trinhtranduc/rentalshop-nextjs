#!/usr/bin/env node

/**
 * Seed 50 Orders for 2025
 * Creates 50 realistic rental orders across multiple months of 2025
 * Uses existing categories, products, and customers to avoid conflicts
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Order statuses and types
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const ORDER_TYPES = ['RENT', 'SALE', 'RENT_TO_OWN'];

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random number between min and max
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random date within a month
function getRandomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = getRandomNumber(1, daysInMonth);
  const hour = getRandomNumber(8, 18); // Business hours
  const minute = getRandomNumber(0, 59);
  return new Date(year, month, day, hour, minute);
}

// Helper function to calculate rental duration and return date
function calculateRentalDates(pickupDate, rentalDays) {
  const returnDate = new Date(pickupDate);
  returnDate.setDate(returnDate.getDate() + rentalDays);
  return returnDate;
}

async function seedOrders2025() {
  try {
    console.log('🌱 Starting to seed 50 orders for 2025...\n');

    // Get existing merchant and outlet
    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      throw new Error('No merchant found. Please create a merchant first.');
    }
    console.log('✅ Using existing merchant:', merchant.name);

    const outlet = await prisma.outlet.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!outlet) {
      throw new Error('No outlet found. Please create an outlet first.');
    }
    console.log('✅ Using existing outlet:', outlet.name);

    // Get existing categories
    const categories = await prisma.category.findMany({
      where: { merchantId: merchant.id }
    });
    console.log(`✅ Found ${categories.length} existing categories`);

    // Get existing products
    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      include: { category: true }
    });
    console.log(`✅ Found ${products.length} existing products`);

    // Get existing customers
    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id }
    });
    console.log(`✅ Found ${customers.length} existing customers`);

    if (products.length === 0) {
      throw new Error('No products found. Please create products first.');
    }

    if (customers.length === 0) {
      throw new Error('No customers found. Please create customers first.');
    }

    // Ensure outlet stock exists for all products
    console.log('\n📦 Checking outlet stock...');
    for (const product of products) {
      let outletStock = await prisma.outletStock.findFirst({
        where: { 
          productId: product.id,
          outletId: outlet.id
        }
      });
      
      if (!outletStock) {
        outletStock = await prisma.outletStock.create({
          data: {
            productId: product.id,
            outletId: outlet.id,
            stock: product.totalStock || 5,
            available: product.totalStock || 5,
            renting: 0
          }
        });
        console.log(`✅ Created outlet stock for ${product.name}`);
      }
    }

    console.log('\n📅 Creating 50 orders across multiple months of 2025...\n');

    // Create 50 orders across multiple months
    const orders = [];
    let orderNumber = 2001; // Start with order number 2001 to avoid conflicts
    
    // Check existing order numbers to avoid conflicts
    const existingOrders = await prisma.order.findMany({
      select: { orderNumber: true }
    });
    const existingOrderNumbers = new Set(existingOrders.map(o => o.orderNumber));
    
    // Find the next available order number
    while (existingOrderNumbers.has(`ORD-${orderNumber}`)) {
      orderNumber++;
    }
    
    console.log(`Starting with order number: ORD-${orderNumber}`);
    
    // Distribute orders across months (more orders in summer months)
    const monthlyDistribution = {
      0: 8,   // January
      1: 6,   // February
      2: 7,   // March
      3: 8,   // April
      4: 10,  // May
      5: 12,  // June
      6: 15,  // July
      7: 14,  // August
      8: 10,  // September
      9: 8,   // October
      10: 6,  // November
      11: 6   // December
    };

    for (let month = 0; month < 12; month++) {
      const ordersThisMonth = monthlyDistribution[month];
      const monthName = new Date(2025, month).toLocaleString('default', { month: 'long' });
      
      console.log(`📅 Creating ${ordersThisMonth} orders for ${monthName} 2025...`);
      
      for (let i = 0; i < ordersThisMonth; i++) {
        const customer = getRandomItem(customers);
        const product = getRandomItem(products);
        const orderType = getRandomItem(ORDER_TYPES);
        const status = getRandomItem(ORDER_STATUSES);
        
        // Generate realistic dates
        const pickupDate = getRandomDateInMonth(2025, month);
        const rentalDays = getRandomNumber(1, 14); // 1-14 days rental
        const returnDate = calculateRentalDates(pickupDate, rentalDays);
        
        // Calculate realistic amounts based on product
        const unitPrice = product.rentPrice || 50.00; // Default if no rent price
        const totalAmount = unitPrice * rentalDays;
        const depositAmount = product.deposit || 200.00; // Default if no deposit
        
        // Generate order number
        const currentOrderNumber = `ORD-${orderNumber}`;
        orderNumber++;
        
        // Create order data
        const orderData = {
          publicId: 111 + orders.length, // Start with 111 to avoid conflicts
          orderNumber: currentOrderNumber,
          orderType: orderType,
          status: status,
          totalAmount: totalAmount,
          depositAmount: depositAmount,
          securityDeposit: depositAmount * 0.5,
          damageFee: 0,
          lateFee: 0,
          pickupPlanAt: pickupDate,
          returnPlanAt: returnDate,
          rentalDuration: rentalDays,
          isReadyToDeliver: Math.random() > 0.3, // 70% ready to deliver
          collateralType: Math.random() > 0.5 ? 'CASH' : 'DOCUMENT',
          collateralDetails: Math.random() > 0.5 ? 'ID Card' : 'Passport',
          notes: `Order for ${customer.firstName} ${customer.lastName} - ${product.name}`,
          outletId: outlet.id,
          customerId: customer.id
        };
        
        // Ensure return date doesn't extend too far beyond 2025
        if (returnDate.getFullYear() > 2026 || (returnDate.getFullYear() === 2026 && returnDate.getMonth() > 2)) {
          // Adjust rental duration to keep return within reasonable bounds
          const maxReturnDate = new Date(2026, 2, 31); // March 31, 2026
          const maxRentalDays = Math.floor((maxReturnDate.getTime() - pickupDate.getTime()) / (24 * 60 * 60 * 1000));
          const adjustedRentalDays = Math.min(rentalDays, maxRentalDays);
          const adjustedReturnDate = calculateRentalDates(pickupDate, adjustedRentalDays);
          
          // Update the dates
          orderData.rentalDuration = adjustedRentalDays;
          orderData.returnPlanAt = adjustedReturnDate;
          orderData.totalAmount = unitPrice * adjustedRentalDays; // Recalculate total amount
        }
        
        // Add actual pickup/return dates for completed orders
        if (status === 'COMPLETED') {
          // Ensure pickup is within 2025 and return is within 2025 or early 2026
          const actualPickupDate = new Date(pickupDate.getTime() + getRandomNumber(0, 2) * 24 * 60 * 60 * 1000);
          const actualReturnDate = new Date(returnDate.getTime() + getRandomNumber(-1, 2) * 24 * 60 * 60 * 1000);
          
          // Ensure pickup is within 2025
          if (actualPickupDate.getFullYear() === 2025) {
            orderData.pickedUpAt = actualPickupDate;
          }
          
          // Ensure return is within 2025 or early 2026 (within reasonable bounds)
          if (actualReturnDate.getFullYear() <= 2026 && actualReturnDate.getTime() <= new Date(2026, 2, 31).getTime()) {
            orderData.returnedAt = actualReturnDate;
          }
        } else if (status === 'ACTIVE') {
          // Ensure pickup is within 2025
          const actualPickupDate = new Date(pickupDate.getTime() + getRandomNumber(0, 1) * 24 * 60 * 60 * 1000);
          if (actualPickupDate.getFullYear() === 2025) {
            orderData.pickedUpAt = actualPickupDate;
          }
        }
        
        orders.push(orderData);
      }
    }

    // Create orders in database
    console.log('\n💾 Saving orders to database...\n');
    
    for (const orderData of orders) {
      try {
        // Create the order
        const order = await prisma.order.create({
          data: orderData
        });
        
        // Get a random product for this order
        const product = getRandomItem(products);
        
        // Create order items
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: 1,
            unitPrice: product.rentPrice || 50.00,
            totalPrice: orderData.totalAmount,
            rentalDays: orderData.rentalDuration,
            notes: `Rental for ${orderData.rentalDuration} days`
          }
        });
        
        // Create payment record
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: orderData.depositAmount,
            method: getRandomItem(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD']),
            type: 'DEPOSIT',
            status: orderData.status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED',
            reference: `PAY-${order.orderNumber}`,
            notes: 'Deposit payment'
          }
        });
        
        // Update outlet stock if order is active or completed
        if (['ACTIVE', 'COMPLETED'].includes(orderData.status)) {
          const outletStock = await prisma.outletStock.findFirst({
            where: { 
              productId: product.id,
              outletId: outlet.id
            }
          });
          
          if (outletStock) {
            await prisma.outletStock.update({
              where: { id: outletStock.id },
              data: {
                renting: outletStock.renting + 1,
                available: Math.max(0, outletStock.available - 1)
              }
            });
          }
        }
        
        // Get customer info for logging
        const customer = customers.find(c => c.id === orderData.customerId);
        const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
        
        console.log(`✅ Created order: ${order.orderNumber} - ${orderData.status} - ${customerName}`);
        
      } catch (error) {
        console.error(`❌ Failed to create order ${orderData.orderNumber}:`, error.message);
      }
    }

    console.log('\n🎉 Successfully seeded 50 orders for 2025!');
    console.log('📊 Order distribution:');
    
    // Show monthly distribution
    for (let month = 0; month < 12; month++) {
      const monthName = new Date(2025, month).toLocaleString('default', { month: 'short' });
      const count = monthlyDistribution[month];
      console.log(`   ${monthName}: ${count} orders`);
    }
    
    console.log('\n💡 You can now test the dashboard and calendar functionality with realistic 2025 data!');

  } catch (error) {
    console.error('❌ Error seeding orders:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedOrders2025();
