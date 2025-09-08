const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      include: {
        merchant: true,
        outlet: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Merchant ID: ${user.merchantId}`);
      console.log(`   Outlet ID: ${user.outletId}`);
      console.log(`   Created: ${user.createdAt}`);
      if (user.merchant) {
        console.log(`   Merchant Name: ${user.merchant.name}`);
        console.log(`   Merchant Email: ${user.merchant.email}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
