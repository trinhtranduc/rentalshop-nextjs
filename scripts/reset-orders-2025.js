/**
 * Reset and Regenerate Orders Script - 2025 Update
 * 
 * This script will:
 * 1. Delete all existing orders, order items, and payments
 * 2. Regenerate orders with the new order types (RENT, SALE) and statuses
 * 3. Create realistic order data with proper relationships
 * 4. Use the updated schema structure
 * 
 * Run with: node scripts/reset-orders-2025.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Updated order types and statuses based on your new schema
const ORDER_TYPES = ['RENT', 'SALE'];
const ORDER_STATUSES = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];

// Order status flow based on order type
const ORDER_STATUS_FLOW = {
  RENT: ['RESERVED', 'PICKUPED', 'RETURNED', 'CANCELLED'],
  SALE: ['RESERVED', 'COMPLETED', 'CANCELLED']
};

// Helper function to get next public ID
async function getNextPublicId(tableName) {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(publicId), 0) + 1 as nextId 
    FROM ${tableName}
  `;
  return result[0].nextId;
}

// Helper function to generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to pick random item from array
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate realistic order data
function generateOrderData(index, customer, products, outlet) {
  const orderType = pickRandom(ORDER_TYPES);
  const availableStatuses = ORDER_STATUS_FLOW[orderType];
  const status = pickRandom(availableStatuses);
  
  // Generate 1-3 random products for this order
  const numItems = Math.floor(Math.random() * 3) + 1;
  const selectedProducts = [];
  for (let i = 0; i < numItems; i++) {
    const product = pickRandom(products);
    if (!selectedProducts.find(p => p.id === product.id)) {
      selectedProducts.push(product);
    }
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
      // Future pickup date
      pickupPlanAt = randomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      returnPlanAt = new Date(pickupPlanAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000);
      rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
    } else if (status === 'PICKUPED') {
      // Past pickup, future return
      pickupPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
      returnPlanAt = randomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      pickedUpAt = pickupPlanAt;
      rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
    } else if (status === 'RETURNED') {
      // Past pickup and return
      pickupPlanAt = randomDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      returnPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
      pickedUpAt = pickupPlanAt;
      returnedAt = returnPlanAt;
      rentalDuration = Math.ceil((returnPlanAt - pickupPlanAt) / (1000 * 60 * 60 * 24));
    }
  } else if (orderType === 'SALE') {
    if (status === 'RESERVED') {
      // Future pickup date
      pickupPlanAt = randomDate(now, new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
    } else if (status === 'COMPLETED') {
      // Past pickup
      pickupPlanAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
      pickedUpAt = pickupPlanAt;
    }
  }
  
  // Generate order number (without prefix)
  const orderNumber = `ORD-${outlet.publicId.toString().padStart(3, '0')}-${(index + 1).toString().padStart(4, '0')}`;
  
  return {
    orderNumber,
    orderType,
    status,
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
    depositAmount: Math.round(depositAmount * 100) / 100,
    securityDeposit: Math.round(securityDeposit * 100) / 100,
    damageFee: 0,
    lateFee: 0,
    pickupPlanAt,
    returnPlanAt,
    pickedUpAt,
    returnedAt,
    rentalDuration,
    isReadyToDeliver: status === 'BOOKED' && Math.random() > 0.3, // 70% ready when booked
    collateralType: orderType === 'RENT' ? pickRandom(['CASH', 'DOCUMENT', 'ID_CARD', 'CREDIT_CARD']) : null,
    collateralDetails: orderType === 'RENT' ? pickRandom(['ID Card', 'Passport', 'Driver License', 'Credit Card', 'Cash Deposit']) : null,
    notes: `${orderType} order for ${customer.firstName} ${customer.lastName} - ${status}`,
    pickupNotes: pickupPlanAt ? `Scheduled pickup on ${pickupPlanAt.toLocaleDateString()}` : null,
    returnNotes: returnPlanAt && orderType === 'RENT' ? `Expected return on ${returnPlanAt.toLocaleDateString()}` : null,
    damageNotes: '',
    outletId: outlet.id,
    customerId: customer.id,
    selectedProducts
  };
}

// Reset orders function
async function resetOrders() {
  console.log('🗑️  Resetting all orders, order items, and payments...');
  
  try {
    // Delete in correct order due to foreign key constraints
    await prisma.payment.deleteMany({});
    console.log('✅ Deleted all payments');
    
    await prisma.orderItem.deleteMany({});
    console.log('✅ Deleted all order items');
    
    await prisma.order.deleteMany({});
    console.log('✅ Deleted all orders');
    
    console.log('🎉 Orders reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting orders:', error);
    throw error;
  }
}

// Regenerate orders function
async function regenerateOrders() {
  console.log('🌱 Regenerating orders with new structure...');
  
  try {
    // Get existing data
    const merchants = await prisma.merchant.findMany();
    if (merchants.length === 0) {
      throw new Error('No merchants found. Please create merchants first.');
    }
    
    const outlets = await prisma.outlet.findMany({
      include: { merchant: true }
    });
    if (outlets.length === 0) {
      throw new Error('No outlets found. Please create outlets first.');
    }
    
    const customers = await prisma.customer.findMany({
      include: { merchant: true }
    });
    if (customers.length === 0) {
      throw new Error('No customers found. Please create customers first.');
    }
    
    const products = await prisma.product.findMany({
      include: { category: true }
    });
    if (products.length === 0) {
      throw new Error('No products found. Please create products first.');
    }
    
    console.log(`📊 Found: ${merchants.length} merchants, ${outlets.length} outlets, ${customers.length} customers, ${products.length} products`);
    
    const createdOrders = [];
    let orderPublicId = 1;
    
    // Create orders for each outlet
    for (const outlet of outlets) {
      console.log(`\n🏪 Creating orders for outlet: ${outlet.name} (${outlet.merchant.name})`);
      
      // Get customers and products for this merchant
      const outletCustomers = customers.filter(c => c.merchantId === outlet.merchantId);
      const outletProducts = products.filter(p => p.merchantId === outlet.merchantId);
      
      // Create 25 orders per outlet (100 total for 4 outlets)
      for (let i = 0; i < 25; i++) {
        const customer = pickRandom(outletCustomers);
        const orderData = generateOrderData(i, customer, outletProducts, outlet);
        
        try {
          // Create the order
          const order = await prisma.order.create({
            data: {
              publicId: orderPublicId++,
              orderNumber: orderData.orderNumber,
              orderType: orderData.orderType,
              status: orderData.status,
              totalAmount: orderData.totalAmount,
              depositAmount: orderData.depositAmount,
              securityDeposit: orderData.securityDeposit,
              damageFee: orderData.damageFee,
              lateFee: orderData.lateFee,
              pickupPlanAt: orderData.pickupPlanAt,
              returnPlanAt: orderData.returnPlanAt,
              pickedUpAt: orderData.pickedUpAt,
              returnedAt: orderData.returnedAt,
              rentalDuration: orderData.rentalDuration,
              isReadyToDeliver: orderData.isReadyToDeliver,
              collateralType: orderData.collateralType,
              collateralDetails: orderData.collateralDetails,
              notes: orderData.notes,
              pickupNotes: orderData.pickupNotes,
              returnNotes: orderData.returnNotes,
              damageNotes: orderData.damageNotes,
              outletId: outlet.id,
              customerId: customer.id
            }
          });
          
          // Create order items
          for (const product of orderData.selectedProducts) {
            const quantity = Math.floor(Math.random() * 2) + 1;
            const unitPrice = orderData.orderType === 'SALE' ? 
              (product.salePrice || product.rentPrice) : product.rentPrice;
            const totalPrice = unitPrice * quantity;
            
            await prisma.orderItem.create({
              data: {
                orderId: order.id,
                productId: product.id,
                quantity,
                unitPrice,
                totalPrice,
                rentalDays: orderData.rentalDuration,
                notes: `${product.name} - ${orderData.orderType}`
              }
            });
          }
          
          // Create payment record
          if (orderData.depositAmount > 0 || orderData.status === 'COMPLETED') {
            const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DIGITAL_WALLET'];
            const paymentMethod = pickRandom(paymentMethods);
            
            await prisma.payment.create({
              data: {
                orderId: order.id,
                amount: orderData.status === 'COMPLETED' ? orderData.totalAmount : orderData.depositAmount,
                method: paymentMethod,
                type: orderData.status === 'COMPLETED' ? 'FULL_PAYMENT' : 'DEPOSIT',
                status: orderData.status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED',
                reference: `PAY-${order.publicId.toString().padStart(6, '0')}`,
                notes: `${orderData.orderType} ${orderData.status === 'COMPLETED' ? 'payment' : 'deposit'} for ${orderData.orderNumber}`
              }
            });
          }
          
          createdOrders.push(order);
          
          if (i < 5) { // Log first 5 orders for each outlet
            console.log(`  ✅ Created ${orderData.orderType} order: ${order.orderNumber} - ${orderData.status} - $${orderData.totalAmount}`);
          }
          
        } catch (error) {
          console.error(`❌ Error creating order ${i + 1} for outlet ${outlet.name}:`, error);
        }
      }
      
      console.log(`  📋 Created ${25} orders for ${outlet.name}`);
    }
    
    console.log(`\n🎉 Order regeneration completed!`);
    console.log(`📊 Total orders created: ${createdOrders.length}`);
    
    // Summary by type and status
    const orderSummary = {};
    createdOrders.forEach(order => {
      if (!orderSummary[order.orderType]) {
        orderSummary[order.orderType] = {};
      }
      if (!orderSummary[order.orderType][order.status]) {
        orderSummary[order.orderType][order.status] = 0;
      }
      orderSummary[order.orderType][order.status]++;
    });
    
    console.log('\n📈 Order Summary:');
    Object.entries(orderSummary).forEach(([type, statuses]) => {
      console.log(`  ${type}:`);
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });
    });
    
    return createdOrders;
    
  } catch (error) {
    console.error('❌ Error regenerating orders:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Order Reset and Regeneration Process...\n');
    
    // Step 1: Reset orders
    await resetOrders();
    
    // Step 2: Regenerate orders
    await regenerateOrders();
    
    console.log('\n🎉 Process completed successfully!');
    console.log('\n📋 What was accomplished:');
    console.log('  ✅ All existing orders, order items, and payments deleted');
    console.log('  ✅ Orders regenerated with new RENT/SALE types');
    console.log('  ✅ Orders use new statuses: BOOKED, ACTIVE, RETURNED, COMPLETED, CANCELLED');
    console.log('  ✅ Realistic order data with proper relationships');
    console.log('  ✅ 100 total orders (25 per outlet)');
    console.log('  ✅ Proper order status flow based on order type');
    
  } catch (error) {
    console.error('❌ Fatal error during process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { resetOrders, regenerateOrders };
