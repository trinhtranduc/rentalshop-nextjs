/**
 * Test API Response Script
 * 
 * This script will test the API response to verify that product names
 * are being returned correctly in order items
 * 
 * Run with: node scripts/test-api-response.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApiResponse() {
  try {
    console.log('🧪 Testing API Response for Order Items...\n');
    
    // Get a sample order with full details (similar to what the API returns)
    const order = await prisma.order.findFirst({
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                barcode: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            merchantId: true,
            merchant: {
              select: {
                id: true,
                publicId: true,
                name: true,
                description: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!order) {
      console.log('❌ No orders found in database');
      return;
    }
    
    console.log('📋 Sample Order Response:');
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Type: ${order.orderType}`);
    console.log(`Status: ${order.status}`);
    console.log(`Customer: ${order.customer?.firstName} ${order.customer?.lastName}`);
    console.log(`Outlet: ${order.outlet?.name}`);
    console.log(`Total Amount: $${order.totalAmount}`);
    console.log(`Order Items (${order.orderItems.length}):`);
    
    order.orderItems.forEach((item, index) => {
      console.log(`\n  ${index + 1}. Order Item:`);
      console.log(`     Quantity: ${item.quantity}`);
      console.log(`     Unit Price: $${item.unitPrice}`);
      console.log(`     Total Price: $${item.totalPrice}`);
      console.log(`     Product ID: ${item.productId}`);
      
      if (item.product) {
        console.log(`     ✅ Product Name: ${item.product.name}`);
        console.log(`     Product Description: ${item.product.description}`);
        console.log(`     Product Barcode: ${item.product.barcode}`);
      } else {
        console.log(`     ❌ UNKNOWN PRODUCT - Product not found!`);
      }
      
      console.log(`     Notes: ${item.notes}`);
    });
    
    // Test the exact query that the API would use
    console.log('\n🔍 Testing API Query Pattern...');
    
    const apiResponse = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                barcode: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            merchantId: true,
            merchant: {
              select: {
                id: true,
                publicId: true,
                name: true,
                description: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true
          }
        }
      }
    });
    
    console.log('\n📊 API Response Summary:');
    console.log(`Order ID: ${apiResponse.id}`);
    console.log(`Order Number: ${apiResponse.orderNumber}`);
    console.log(`Order Items Count: ${apiResponse.orderItems.length}`);
    
    const productsWithNames = apiResponse.orderItems.filter(item => item.product && item.product.name);
    const productsWithoutNames = apiResponse.orderItems.filter(item => !item.product || !item.product.name);
    
    console.log(`Products with names: ${productsWithNames.length}`);
    console.log(`Products without names: ${productsWithoutNames.length}`);
    
    if (productsWithoutNames.length > 0) {
      console.log('\n❌ Products missing names:');
      productsWithoutNames.forEach((item, index) => {
        console.log(`  ${index + 1}. Product ID: ${item.productId}`);
        console.log(`     Product object: ${JSON.stringify(item.product)}`);
      });
    } else {
      console.log('\n✅ All products have names!');
    }
    
    // Simulate the exact response structure your API returns
    const simulatedApiResponse = {
      success: true,
      data: {
        id: apiResponse.id,
        publicId: apiResponse.publicId,
        orderNumber: apiResponse.orderNumber,
        orderType: apiResponse.orderType,
        status: apiResponse.status,
        totalAmount: apiResponse.totalAmount,
        orderItems: apiResponse.orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productId: item.productId,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            images: item.product.images,
            barcode: item.product.barcode
          } : null
        }))
      }
    };
    
    console.log('\n📤 Simulated API Response:');
    console.log(JSON.stringify(simulatedApiResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error during API response test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testApiResponse();
}

module.exports = { testApiResponse };
