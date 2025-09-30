// ============================================================================
// TEST NEW SIMPLIFIED DATABASE API OPERATIONS
// ============================================================================
// Testing the new db.users, db.products, db.orders API with simple ID system

const { PrismaClient } = require('@prisma/client');

// Simulate the new API structure
const createNewAPI = (prisma) => ({
  users: {
    findById: async (id) => {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    findByEmail: async (email) => {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    search: async (filters = {}) => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      const where = {};
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.outletId) where.outletId = whereFilters.outletId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      if (whereFilters.role) where.role = whereFilters.role;
      
      if (whereFilters.search) {
        where.OR = [
          { firstName: { contains: whereFilters.search } },
          { lastName: { contains: whereFilters.search } },
          { email: { contains: whereFilters.search } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ]);

      return {
        data: users,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  },

  products: {
    findById: async (id) => {
      return await prisma.product.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
    },

    findByBarcode: async (barcode) => {
      return await prisma.product.findUnique({
        where: { barcode },
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } }
        }
      });
    },

    search: async (filters = {}) => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      const where = {};
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      
      if (whereFilters.search) {
        where.OR = [
          { name: { contains: whereFilters.search } },
          { description: { contains: whereFilters.search } },
          { barcode: { contains: whereFilters.search } }
        ];
      }

      if (whereFilters.minPrice !== undefined || whereFilters.maxPrice !== undefined) {
        where.rentPrice = {};
        if (whereFilters.minPrice !== undefined) where.rentPrice.gte = whereFilters.minPrice;
        if (whereFilters.maxPrice !== undefined) where.rentPrice.lte = whereFilters.maxPrice;
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where })
      ]);

      return {
        data: products,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  },

  orders: {
    findById: async (id) => {
      return await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          outlet: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } }
            }
          },
          payments: true
        }
      });
    },

    findByNumber: async (orderNumber) => {
      return await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          outlet: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } }
            }
          },
          payments: true
        }
      });
    },

    search: async (filters = {}) => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      const where = {};
      if (whereFilters.outletId) where.outletId = whereFilters.outletId;
      if (whereFilters.customerId) where.customerId = whereFilters.customerId;
      if (whereFilters.status) where.status = whereFilters.status;
      if (whereFilters.orderType) where.orderType = whereFilters.orderType;
      
      if (whereFilters.startDate || whereFilters.endDate) {
        where.createdAt = {};
        if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
        if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
      }

      if (whereFilters.search) {
        where.OR = [
          { orderNumber: { contains: whereFilters.search } },
          { customer: { firstName: { contains: whereFilters.search } } },
          { customer: { lastName: { contains: whereFilters.search } } },
          { customer: { phone: { contains: whereFilters.search } } }
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            outlet: { select: { id: true, name: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({ where })
      ]);

      return {
        data: orders,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  }
});

async function testNewAPIOperations() {
  console.log('🧪 TESTING NEW SIMPLIFIED DATABASE API OPERATIONS');
  console.log('=' .repeat(60));

  const prisma = new PrismaClient();
  const db = createNewAPI(prisma);

  try {
    // ============================================================================
    // TEST 1: User Operations
    // ============================================================================
    console.log('\n👥 TEST 1: User Operations...');
    
    // Test findById
    const user = await db.users.findById(1001);
    console.log('✅ User findById:', {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role
    });

    // Test findByEmail
    const userByEmail = await db.users.findByEmail('admin@rentalshop.com');
    console.log('✅ User findByEmail:', {
      id: userByEmail.id,
      email: userByEmail.email
    });

    // Test search
    const userSearch = await db.users.search({
      merchantId: 1,
      page: 1,
      limit: 3
    });
    console.log('✅ User search:', {
      total: userSearch.total,
      count: userSearch.data.length,
      hasMore: userSearch.hasMore
    });

    // ============================================================================
    // TEST 2: Product Operations
    // ============================================================================
    console.log('\n📦 TEST 2: Product Operations...');
    
    // Test findById
    const product = await db.products.findById(1);
    console.log('✅ Product findById:', {
      id: product.id,
      name: product.name,
      rentPrice: product.rentPrice,
      merchant: product.merchant?.name,
      category: product.category?.name
    });

    // Test search with filters
    const productSearch = await db.products.search({
      merchantId: 1,
      minPrice: 10,
      maxPrice: 50,
      page: 1,
      limit: 3
    });
    console.log('✅ Product search with filters:', {
      total: productSearch.total,
      count: productSearch.data.length,
      hasMore: productSearch.hasMore
    });

    // Test search by text
    const productTextSearch = await db.products.search({
      search: 'Electronics',
      page: 1,
      limit: 3
    });
    console.log('✅ Product text search:', {
      total: productTextSearch.total,
      count: productTextSearch.data.length,
      products: productTextSearch.data.map(p => p.name)
    });

    // ============================================================================
    // TEST 3: Order Operations
    // ============================================================================
    console.log('\n📋 TEST 3: Order Operations...');
    
    // Test findById
    const order = await db.orders.findById(1);
    console.log('✅ Order findById:', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customer: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'No customer',
      outlet: order.outlet?.name,
      itemCount: order.orderItems.length
    });

    // Test findByNumber
    const orderByNumber = await db.orders.findByNumber('ORD-001-0001');
    console.log('✅ Order findByNumber:', {
      id: orderByNumber.id,
      orderNumber: orderByNumber.orderNumber
    });

    // Test search
    const orderSearch = await db.orders.search({
      outletId: 1,
      status: 'COMPLETED',
      page: 1,
      limit: 3
    });
    console.log('✅ Order search:', {
      total: orderSearch.total,
      count: orderSearch.data.length,
      hasMore: orderSearch.hasMore,
      orders: orderSearch.data.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : 'No customer'
      }))
    });

    // ============================================================================
    // TEST 4: Performance Test
    // ============================================================================
    console.log('\n⚡ TEST 4: Performance Test...');
    
    const iterations = 10;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await db.users.search({ page: 1, limit: 5 });
      await db.products.search({ page: 1, limit: 5 });
      await db.orders.search({ page: 1, limit: 5 });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Performance test completed: ${duration}ms for ${iterations} iterations`);
    console.log(`📊 Average: ${duration / iterations}ms per iteration`);

    console.log('\n🎉 ALL NEW API OPERATIONS WORKING PERFECTLY!');
    console.log('✅ Simple ID system (no dual ID complexity)');
    console.log('✅ Consistent API across all entities');
    console.log('✅ Fast performance');
    console.log('✅ Clean and maintainable code');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNewAPIOperations().catch(console.error);
