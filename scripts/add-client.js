const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addClient() {
  try {
    console.log('👤 Adding client user...');

    // Check if client already exists
    const existingClient = await prisma.user.findUnique({
      where: { email: 'client@rentalshop.com' }
    });

    if (existingClient) {
      console.log('✅ Client user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('client123', 10);

    // Create client user
    const clientUser = await prisma.user.create({
      data: {
        email: 'client@rentalshop.com',
        password: hashedPassword,
        name: 'John Client',
        role: 'CLIENT',
        phone: '+1777777777',
        emailVerified: true,
        isActive: true,
      },
    });

    console.log('✅ Created client user:', clientUser.email);

    console.log('\n🎉 Client user created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Client: client@rentalshop.com / client123');
    console.log('   Manager: manager@rentalshop.com / manager123');
    console.log('   Admin: admin@rentalshop.com / manager123');

  } catch (error) {
    console.error('❌ Error creating client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addClient(); 