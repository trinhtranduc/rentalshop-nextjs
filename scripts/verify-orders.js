/**
 * Verify Orders Script - Check current order state after reset
 * 
 * This script will show you the current state of your orders
 * after the reset and regeneration process.
 * 
 * Run with: node scripts/verify-orders.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyOrders() {
  try {
    console.log('🔍 Verifying current order state...\n');
    
    // Count total orders
    const totalOrders = await prisma.order.count();
    console.log(`📊 Total Orders: ${totalOrders}`);
    
    // Count by order type
    const ordersByType = await prisma.order.groupBy({
      by: ['orderType'],
      _count: { orderType: true }
    });
    
    console.log('\n📋 Orders by Type:');
    ordersByType.forEach(group => {
      console.log(`  ${group.orderType}: ${group._count.orderType}`);
    });
    
    // Count by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    console.log('\n📈 Orders by Status:');
    ordersByStatus.forEach(group => {
      console.log(`  ${group.status}: ${group._count.status}`);
    });
    
    // Count by outlet
    const ordersByOutlet = await prisma.order.groupBy({
      by: ['outletId'],
      _count: { outletId: true }
    });
    
    console.log('\n🏪 Orders by Outlet:');
    for (const group of ordersByOutlet) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: group.outletId },
        select: { name: true, merchant: { select: { name: true } } }
      });
      console.log(`  ${outlet.merchant.name} - ${outlet.name}: ${group._count.outletId}`);
    }
    
    // Show sample orders
    console.log('\n📝 Sample Orders (first 10):');
    const sampleOrders = await prisma.order.findMany({
      take: 10,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        outlet: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    sampleOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.orderNumber} - ${order.orderType} - ${order.status}`);
      console.log(`     Customer: ${order.customer?.firstName} ${order.customer?.lastName}`);
      console.log(`     Outlet: ${order.outlet.name}`);
      console.log(`     Amount: $${order.totalAmount}`);
      console.log(`     Created: ${order.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    // Check order items
    const totalOrderItems = await prisma.orderItem.count();
    console.log(`📦 Total Order Items: ${totalOrderItems}`);
    
    // Check payments
    const totalPayments = await prisma.payment.count();
    console.log(`💳 Total Payments: ${totalPayments}`);
    
    // Verify order status flow logic
    console.log('\n✅ Order Status Flow Verification:');
    
    // Check RENT orders with invalid statuses
    const invalidRentOrders = await prisma.order.findMany({
      where: {
        orderType: 'RENT',
        status: { in: ['COMPLETED'] } // RENT orders shouldn't have COMPLETED status
      }
    });
    
    if (invalidRentOrders.length === 0) {
      console.log('  ✅ RENT orders have valid statuses only');
    } else {
      console.log(`  ❌ Found ${invalidRentOrders.length} RENT orders with invalid statuses`);
    }
    
    // Check SALE orders with invalid statuses
    const invalidSaleOrders = await prisma.order.findMany({
      where: {
        orderType: 'SALE',
        status: { in: ['ACTIVE', 'RETURNED'] } // SALE orders shouldn't have these statuses
      }
    });
    
    if (invalidSaleOrders.length === 0) {
      console.log('  ✅ SALE orders have valid statuses only');
    } else {
      console.log(`  ❌ Found ${invalidSaleOrders.length} SALE orders with invalid statuses`);
    }
    
    console.log('\n🎉 Order verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyOrders();
}

module.exports = { verifyOrders };
