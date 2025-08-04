const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addManager() {
  try {
    console.log('👤 Adding manager user...');

    // Check if manager already exists
    const existingManager = await prisma.user.findUnique({
      where: { email: 'manager@rentalshop.com' }
    });

    if (existingManager) {
      console.log('✅ Manager user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('manager123', 10);

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@rentalshop.com',
        password: hashedPassword,
        name: 'Outlet Manager',
        role: 'OUTLET_STAFF',
        phone: '+1987654321',
        emailVerified: true,
        isActive: true,
      },
    });

    console.log('✅ Created manager user:', managerUser.email);

    // Find the first outlet to assign the manager to
    const outlet = await prisma.outlet.findFirst();
    
    if (outlet) {
      // Create outlet staff record
      await prisma.outletStaff.create({
        data: {
          userId: managerUser.id,
          outletId: outlet.id,
          role: 'MANAGER',
          isActive: true,
        },
      });

      console.log(`✅ Assigned manager to outlet: ${outlet.name}`);
    } else {
      console.log('⚠️ No outlets found to assign manager to');
    }

    // Also create admin user if it doesn't exist
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@rentalshop.com' }
    });

    if (!existingAdmin) {
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@rentalshop.com',
          password: hashedPassword, // Same password for simplicity
          name: 'System Administrator',
          role: 'ADMIN',
          phone: '+1234567890',
          emailVerified: true,
          isActive: true,
        },
      });

      // Create admin record
      await prisma.admin.create({
        data: {
          userId: adminUser.id,
          level: 'SUPER_ADMIN',
        },
      });

      console.log('✅ Created admin user:', adminUser.email);
    }

    console.log('\n🎉 Manager and admin users created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Manager: manager@rentalshop.com / manager123');
    console.log('   Admin: admin@rentalshop.com / manager123');

  } catch (error) {
    console.error('❌ Error creating manager:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addManager(); 