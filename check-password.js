const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking password for test4@gmail.com...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'test4@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('User found:');
    console.log('Email:', user.email);
    console.log('Password hash:', user.password);
    console.log('Created:', user.createdAt);
    
    // Test common passwords
    const passwords = ['test123', 'password', '123456', 'admin123', 'test4'];
    
    for (const password of passwords) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`Password "${password}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPassword();
