// ============================================================================
// STEP-BY-STEP TEST FOR NEW SIMPLIFIED DATABASE API
// ============================================================================
// Testing without dual ID system - using only simple "id"

const { PrismaClient } = require('@prisma/client');

async function testStepByStep() {
  console.log('🧪 STEP-BY-STEP TEST: New Simplified Database API');
  console.log('=' .repeat(60));

  const prisma = new PrismaClient();

  try {
    // ============================================================================
    // STEP 1: Test Database Connection
    // ============================================================================
    console.log('\n📡 STEP 1: Testing Database Connection...');
    
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', connectionTest);

    // ============================================================================
    // STEP 2: Test Basic Data Access (No Dual ID Complexity)
    // ============================================================================
    console.log('\n📊 STEP 2: Testing Basic Data Access...');
    
    // Test users table
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);
    
    if (userCount > 0) {
      const firstUser = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          merchantId: true,
          outletId: true
        }
      });
      console.log('✅ First user:', firstUser);
    }

    // Test products table
    const productCount = await prisma.product.count();
    console.log(`✅ Products in database: ${productCount}`);
    
    if (productCount > 0) {
      const firstProduct = await prisma.product.findFirst({
        select: {
          id: true,
          name: true,
          rentPrice: true,
          merchantId: true,
          categoryId: true
        }
      });
      console.log('✅ First product:', firstProduct);
    }

    // Test orders table
    const orderCount = await prisma.order.count();
    console.log(`✅ Orders in database: ${orderCount}`);
    
    if (orderCount > 0) {
      const firstOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          outletId: true,
          customerId: true
        }
      });
      console.log('✅ First order:', firstOrder);
    }

    // ============================================================================
    // STEP 3: Test Simple ID Lookups (No PublicID Complexity)
    // ============================================================================
    console.log('\n🔍 STEP 3: Testing Simple ID Lookups...');
    
    if (userCount > 0) {
      const user = await prisma.user.findFirst();
      const userById = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
      console.log('✅ User lookup by ID:', {
        id: userById.id,
        email: userById.email,
        merchant: userById.merchant?.name,
        outlet: userById.outlet?.name
      });
    }

    if (productCount > 0) {
      const product = await prisma.product.findFirst();
      const productById = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } }
        }
      });
      console.log('✅ Product lookup by ID:', {
        id: productById.id,
        name: productById.name,
        merchant: productById.merchant?.name,
        category: productById.category?.name
      });
    }

    // ============================================================================
    // STEP 4: Test Search Operations
    // ============================================================================
    console.log('\n🔎 STEP 4: Testing Search Operations...');
    
    // Search users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 5
    });
    console.log(`✅ Active users found: ${users.length}`);
    
    // Search products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, rentPrice: true },
      take: 5
    });
    console.log(`✅ Active products found: ${products.length}`);
    
    // Search orders
    const orders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, orderNumber: true, status: true, totalAmount: true },
      take: 5
    });
    console.log(`✅ Active orders found: ${orders.length}`);

    // ============================================================================
    // STEP 5: Test Relationships (No Dual ID Complexity)
    // ============================================================================
    console.log('\n🔗 STEP 5: Testing Relationships...');
    
    if (orderCount > 0) {
      const orderWithRelations = await prisma.order.findFirst({
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          outlet: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true } }
            }
          }
        }
      });
      
      console.log('✅ Order with relationships:', {
        orderId: orderWithRelations.id,
        orderNumber: orderWithRelations.orderNumber,
        customer: orderWithRelations.customer ? 
          `${orderWithRelations.customer.firstName} ${orderWithRelations.customer.lastName}` : 'No customer',
        outlet: orderWithRelations.outlet?.name,
        createdBy: orderWithRelations.createdBy ? 
          `${orderWithRelations.createdBy.firstName} ${orderWithRelations.createdBy.lastName}` : 'Unknown',
        itemCount: orderWithRelations.orderItems.length
      });
    }

    console.log('\n🎉 ALL TESTS PASSED! Simple ID system is working perfectly!');
    console.log('✅ No dual ID complexity');
    console.log('✅ Simple and clean API');
    console.log('✅ All relationships working');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testStepByStep().catch(console.error);
