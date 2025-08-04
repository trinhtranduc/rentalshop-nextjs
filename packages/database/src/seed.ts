import { prisma } from './client';
import { hashPassword } from '@rentalshop/auth';

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default categories
  const categories = [
    { name: 'Electronics', description: 'Electronic devices and gadgets', icon: '📱' },
    { name: 'Tools', description: 'Hand tools and power tools', icon: '🔧' },
    { name: 'Party Supplies', description: 'Party decorations and supplies', icon: '🎉' },
    { name: 'Sports Equipment', description: 'Sports and fitness equipment', icon: '⚽' },
    { name: 'Camping Gear', description: 'Camping and outdoor equipment', icon: '🏕️' },
    { name: 'Furniture', description: 'Furniture and home decor', icon: '🪑' },
    { name: 'Vehicles', description: 'Cars, bikes, and other vehicles', icon: '🚗' },
    { name: 'Clothing', description: 'Clothing and accessories', icon: '👕' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('✅ Categories seeded');

  // Create default super admin user
  const superAdminEmail = 'admin@rentalshop.com';
  const superAdminPassword = await hashPassword('admin123');

  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password: superAdminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  // Create super admin record
  await prisma.admin.upsert({
    where: { userId: superAdminUser.id },
    update: {},
    create: {
      userId: superAdminUser.id,
      level: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Super Admin user seeded');

  // Create sample merchant
  const merchantEmail = 'merchant@rentalshop.com';
  const merchantPassword = await hashPassword('merchant123');

  const merchantUser = await prisma.user.upsert({
    where: { email: merchantEmail },
    update: {},
    create: {
      email: merchantEmail,
      password: merchantPassword,
      name: 'Sample Merchant',
      role: 'MERCHANT',
      phone: '+1234567890',
      emailVerified: true,
      isActive: true,
    },
  });

  // Create merchant record
  const merchant = await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      companyName: 'Sample Rental Company',
      businessLicense: 'LIC123456',
      address: '123 Business St, City, State 12345',
      description: 'A sample rental company for testing purposes',
      isVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Sample merchant seeded');

  // Create sample outlet
  const existingOutlet = await prisma.outlet.findFirst({
    where: {
      merchantId: merchant.id,
      name: 'Main Outlet'
    }
  });

  const outlet = existingOutlet || await prisma.outlet.create({
    data: {
      merchantId: merchant.id,
      name: 'Main Outlet',
      address: '456 Main St, City, State 12345',
      description: 'Main outlet for the rental company',
      phone: '+1234567890',
      email: 'main@rentalshop.com',
      isActive: true,
    },
  });

  console.log('✅ Sample outlet seeded');

  // Create outlet manager
  const outletManagerEmail = 'manager@rentalshop.com';
  const outletManagerPassword = await hashPassword('manager123');

  const outletManagerUser = await prisma.user.upsert({
    where: { email: outletManagerEmail },
    update: {},
    create: {
      email: outletManagerEmail,
      password: outletManagerPassword,
      name: 'Outlet Manager',
      role: 'OUTLET_STAFF',
      phone: '+1987654321',
      emailVerified: true,
      isActive: true,
    },
  });

  // Create outlet manager record
  await prisma.outletStaff.upsert({
    where: { userId: outletManagerUser.id },
    update: {},
    create: {
      userId: outletManagerUser.id,
      outletId: outlet.id,
      role: 'MANAGER',
      isActive: true,
    },
  });

  console.log('✅ Outlet manager seeded');

  // Create outlet staff
  const outletStaffEmail = 'staff@rentalshop.com';
  const outletStaffPassword = await hashPassword('staff123');

  const outletStaffUser = await prisma.user.upsert({
    where: { email: outletStaffEmail },
    update: {},
    create: {
      email: outletStaffEmail,
      password: outletStaffPassword,
      name: 'Outlet Staff',
      role: 'OUTLET_STAFF',
      phone: '+1555555555',
      emailVerified: true,
      isActive: true,
    },
  });

  // Create outlet staff record
  await prisma.outletStaff.upsert({
    where: { userId: outletStaffUser.id },
    update: {},
    create: {
      userId: outletStaffUser.id,
      outletId: outlet.id,
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('✅ Outlet staff seeded');

  // Create sample client user
  const clientEmail = 'client@rentalshop.com';
  const clientPassword = await hashPassword('client123');

  await prisma.user.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      password: clientPassword,
      name: 'Sample Client',
      role: 'CLIENT',
      phone: '+1777777777',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Sample client user seeded');

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Default credentials:');
  console.log('Super Admin: admin@rentalshop.com / admin123');
  console.log('Merchant: merchant@rentalshop.com / merchant123');
  console.log('Outlet Manager: manager@rentalshop.com / manager123');
  console.log('Outlet Staff: staff@rentalshop.com / staff123');
  console.log('Client: client@rentalshop.com / client123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 