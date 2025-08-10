const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPagination() {
  try {
    console.log('🔍 Testing pagination...\n');

    // Test customers pagination
    console.log('📊 Customers Pagination Test:');
    const customersResult = await prisma.customer.findMany({
      take: 10,
      skip: 0,
      select: { id: true, firstName: true, lastName: true }
    });
    
    const totalCustomers = await prisma.customer.count();
    const totalPages = Math.ceil(totalCustomers / 10);
    
    console.log(`Total customers: ${totalCustomers}`);
    console.log(`Total pages: ${totalPages}`);
    console.log(`Page 1 customers: ${customersResult.length}`);
    console.log('');

    // Test orders pagination
    console.log('📦 Orders Pagination Test:');
    const ordersResult = await prisma.order.findMany({
      take: 10,
      skip: 0,
      select: { id: true, orderNumber: true, status: true }
    });
    
    const totalOrders = await prisma.order.count();
    const totalOrderPages = Math.ceil(totalOrders / 10);
    
    console.log(`Total orders: ${totalOrders}`);
    console.log(`Total pages: ${totalOrderPages}`);
    console.log(`Page 1 orders: ${ordersResult.length}`);
    console.log('');

    // Test products pagination
    console.log('🏷️ Products Pagination Test:');
    const productsResult = await prisma.product.findMany({
      take: 10,
      skip: 0,
      select: { id: true, name: true, totalStock: true }
    });
    
    const totalProducts = await prisma.product.count();
    const totalProductPages = Math.ceil(totalProducts / 10);
    
    console.log(`Total products: ${totalProducts}`);
    console.log(`Total pages: ${totalProductPages}`);
    console.log(`Page 1 products: ${productsResult.length}`);
    console.log('');

    // Test API endpoints
    console.log('🌐 API Endpoints Test:');
    console.log('GET /api/customers?page=1&limit=10');
    console.log('GET /api/orders?page=1&limit=10');
    console.log('GET /api/products?page=1&limit=10');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPagination();
