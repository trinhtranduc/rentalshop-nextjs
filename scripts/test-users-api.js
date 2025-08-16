const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function testUsersAPI() {
  try {
    console.log('🔍 Testing Users API data structure...\n');
    
    // Simulate the same query that the API uses
    const users = await prisma.user.findMany({
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            merchant: {
              select: { id: true, name: true }
            }
          }
        }
      },
      take: 3
    });
    
    console.log('📊 API Query Result:');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.firstName} ${user.lastName}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Public ID: ${user.publicId} (type: ${typeof user.publicId})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has publicId field: ${'publicId' in user}`);
      console.log(`   All fields:`, Object.keys(user));
    });
    
    // Test direct query to see if publicId exists
    console.log('\n🔍 Direct Database Query:');
    const directUser = await prisma.user.findFirst({
      select: {
        id: true,
        publicId: true,
        firstName: true,
        lastName: true
      }
    });
    
    if (directUser) {
      console.log('Direct query result:', directUser);
      console.log('PublicId type:', typeof directUser.publicId);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUsersAPI();
