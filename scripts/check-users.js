const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        publicId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      take: 5
    });
    
    console.log('📊 First 5 users:');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Public ID: ${user.publicId} (type: ${typeof user.publicId})`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      console.log(`\n✅ Found ${users.length} users`);
      console.log(`🔍 Public ID range: ${Math.min(...users.map(u => u.publicId))} - ${Math.max(...users.map(u => u.publicId))}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
