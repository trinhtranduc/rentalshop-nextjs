const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@rentalshop.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists, updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      });
      
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test login
    console.log('\n🔍 Testing login...');
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@rentalshop.com' }
    });
    
    if (admin) {
      const isValidPassword = await bcrypt.compare('admin123', admin.password);
      console.log(`✅ Password validation: ${isValidPassword ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📧 Email: ${admin.email}`);
      console.log(`👤 Role: ${admin.role}`);
      console.log(`🆔 Public ID: ${admin.publicId}`);
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
