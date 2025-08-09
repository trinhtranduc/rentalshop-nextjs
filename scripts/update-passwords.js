const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePasswords() {
  try {
    console.log('🔧 Updating user passwords...');
    
    const passwordHash = bcrypt.hashSync('password123', 10);
    console.log(`New password hash: ${passwordHash}`);
    
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update`);
    
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash }
      });
      console.log(`✅ Updated password for ${user.email}`);
    }
    
    console.log('🎉 All passwords updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswords();
