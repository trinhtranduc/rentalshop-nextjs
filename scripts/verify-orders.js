// Simple script to verify orders with new BOOKED status
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyOrders() {
  try {
    console.log('🔍 Verifying orders with new BOOKED status...\n');

    // Get all orders
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        outlet: {
          select: {
            name: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        publicId: 'asc'
      }
    });

    if (orders.length === 0) {
      console.log('❌ No orders found in database');
      return;
    }

    console.log(`📊 Found ${orders.length} orders:\n`);

    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order #${order.publicId}: ${order.orderNumber}`);
      console.log(`   Type: ${order.orderType}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Customer: ${order.customer?.firstName} ${order.customer?.lastName}`);
      console.log(`   Outlet: ${order.outlet?.name}`);
      console.log(`   Amount: $${order.totalAmount}`);
      console.log(`   Items: ${order.orderItems.length}`);
      
      if (order.pickupPlanAt) {
        console.log(`   Pickup: ${order.pickupPlanAt.toLocaleDateString()}`);
      }
      if (order.returnPlanAt) {
        console.log(`   Return: ${order.returnPlanAt.toLocaleDateString()}`);
      }
      if (order.pickedUpAt) {
        console.log(`   Picked up: ${order.pickedUpAt.toLocaleDateString()}`);
      }
      
      console.log('');
    });

    // Check status distribution
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    console.log('📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} orders`);
    });

    console.log('\n✅ Order verification completed!');

  } catch (error) {
    console.error('❌ Error verifying orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOrders();
