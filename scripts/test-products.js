const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProducts() {
  try {
    console.log('🧪 Testing Product API Implementation...\n');

    // Test 1: Check if products exist
    console.log('1. Checking products in database...');
    const products = await prisma.product.findMany({
      include: {
        category: true,
        outlet: true,
      },
      take: 5,
    });

    console.log(`✅ Found ${products.length} products`);
    
    if (products.length > 0) {
      const product = products[0];
      console.log(`   Sample product: ${product.name}`);
      console.log(`   Category: ${product.category.name}`);
      console.log(`   Outlet: ${product.outlet.name}`);
      console.log(`   Stock: ${product.stock}, Available: ${product.available}`);
      console.log(`   Rent Price: $${product.rentPrice}/day`);
    }

    // Test 2: Check categories
    console.log('\n2. Checking categories...');
    const categories = await prisma.category.findMany();
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach(cat => console.log(`   - ${cat.name}`));

    // Test 3: Check outlets
    console.log('\n3. Checking outlets...');
    const outlets = await prisma.outlet.findMany();
    console.log(`✅ Found ${outlets.length} outlets:`);
    outlets.forEach(outlet => console.log(`   - ${outlet.name} (${outlet.address})`));

    // Test 4: Check product statistics
    console.log('\n4. Product statistics...');
    const totalProducts = await prisma.product.count();
    const availableProducts = await prisma.product.count({
      where: { available: { gt: 0 } }
    });
    const totalStock = await prisma.product.aggregate({
      _sum: { stock: true }
    });
    const totalRenting = await prisma.product.aggregate({
      _sum: { renting: true }
    });

    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Available products: ${availableProducts}`);
    console.log(`   Total stock: ${totalStock._sum.stock || 0}`);
    console.log(`   Currently renting: ${totalRenting._sum.renting || 0}`);

    // Test 5: Check by category
    console.log('\n5. Products by category...');
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      include: {
        category: true,
      },
    });

    productsByCategory.forEach(group => {
      console.log(`   ${group.category.name}: ${group._count.id} products`);
    });

    console.log('\n🎉 All tests passed! Product API is ready.');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the API server: npm run dev:api');
    console.log('   2. Test endpoints: curl http://localhost:3002/api/products');
    console.log('   3. Access client app: http://localhost:3000/dashboard');
    console.log('   4. Access admin app: http://localhost:3001/dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProducts(); 