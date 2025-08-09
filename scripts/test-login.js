const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Check if users exist
    const users = await prisma.user.findMany({
      include: {
        merchant: true,
        outlet: true
      }
    });
    
    console.log(`📊 Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role}`);
      console.log(`  Merchant: ${user.merchant?.name || 'None'}`);
      console.log(`  Outlet: ${user.outlet?.name || 'None'}`);
    });
    
    // Test password verification
    const testUser = users.find(u => u.email === 'admin@rentalshop.com');
    if (testUser) {
      console.log('\n🔐 Testing password verification...');
      const isValid = await bcrypt.compare('password123', testUser.password);
      console.log(`Password 'password123' is valid: ${isValid}`);
      
      // Generate new hash
      const newHash = bcrypt.hashSync('password123', 10);
      console.log(`New hash for 'password123': ${newHash}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
