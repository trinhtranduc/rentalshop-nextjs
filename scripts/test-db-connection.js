const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:../prisma/dev.db'
    }
  }
});

async function testDbConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const customerCount = await prisma.customer.count();
    console.log('Total customers in database:', customerCount);
    
    // Test search query
    const searchResult = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: 'john' } },
          { lastName: { contains: 'john' } },
          { email: { contains: 'john' } },
          { phone: { contains: 'john' } }
        ]
      },
      take: 5
    });
    
    console.log('Search results:', searchResult.length);
    searchResult.forEach(customer => {
      console.log(`- ${customer.firstName} ${customer.lastName} (${customer.email})`);
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDbConnection(); 