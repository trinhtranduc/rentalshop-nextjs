/**
 * Verify Product Mapping Script
 * 
 * This script will verify that order items are properly linked to products
 * and show the actual product names instead of "Unknown Product"
 * 
 * Run with: node scripts/verify-product-mapping.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyProductMapping() {
  try {
    console.log('🔍 Verifying product mapping in orders...\n');
    
    // Get a few sample orders with their items and products
    const sampleOrders = await prisma.order.findMany({
      take: 5,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                publicId: true,
                merchantId: true
              }
            }
          }
        },
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 Sample Orders with Product Mapping:');
    
    sampleOrders.forEach((order, orderIndex) => {
      console.log(`\n${orderIndex + 1}. Order: ${order.orderNumber}`);
      console.log(`   Type: ${order.orderType} | Status: ${order.status}`);
      console.log(`   Customer: ${order.customer?.firstName} ${order.customer?.lastName}`);
      console.log(`   Outlet: ${order.outlet?.name}`);
      console.log(`   Total Amount: $${order.totalAmount}`);
      console.log(`   Order Items (${order.orderItems.length}):`);
      
      order.orderItems.forEach((item, itemIndex) => {
        if (item.product) {
          console.log(`     ${itemIndex + 1}. ${item.product.name}`);
          console.log(`        Product ID: ${item.product.id}`);
          console.log(`        Public ID: ${item.product.publicId}`);
        } else {
          console.log(`     ${itemIndex + 1}. ❌ UNKNOWN PRODUCT (Product ID: ${item.productId})`);
        }
      });
    });
    
    // Check for any orphaned order items (items without products)
    const orphanedItems = await prisma.orderItem.findMany({
      where: {
        product: null
      },
      include: {
        order: {
          select: {
            orderNumber: true
          }
        }
      }
    });
    
    if (orphanedItems.length === 0) {
      console.log('\n✅ All order items are properly linked to products!');
    } else {
      console.log(`\n❌ Found ${orphanedItems.length} orphaned order items:`);
      orphanedItems.forEach((item, index) => {
        console.log(`   ${index + 1}. Order: ${item.order.orderNumber}, Product ID: ${item.productId}`);
      });
    }
    
    // Summary statistics
    const totalOrderItems = await prisma.orderItem.count();
    const linkedOrderItems = await prisma.orderItem.count({
      where: {
        product: {
          isNot: null
        }
      }
    });
    
    console.log('\n📊 Product Mapping Summary:');
    console.log(`   Total Order Items: ${totalOrderItems}`);
    console.log(`   Properly Linked: ${linkedOrderItems}`);
    console.log(`   Orphaned: ${totalOrderItems - linkedOrderItems}`);
    console.log(`   Success Rate: ${((linkedOrderItems / totalOrderItems) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 Product mapping verification completed!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyProductMapping();
}

module.exports = { verifyProductMapping };
