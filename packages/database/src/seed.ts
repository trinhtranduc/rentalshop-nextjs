import { prisma } from './client';
import { createOrder, updateOrder, cancelOrder } from './order';
import type { OrderInput, OrderType, OrderStatus } from './types';

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // Create merchants
  const merchant1 = await prisma.merchant.upsert({
    where: { id: 'merchant1' },
    update: {},
    create: {
      id: 'merchant1',
      name: 'Rental Shop Demo',
      description: 'Demo rental shop for testing with multiple outlets',
      isActive: true
    }
  });

  const merchant2 = await prisma.merchant.upsert({
    where: { id: 'merchant2' },
    update: {},
    create: {
      id: 'merchant2',
      name: 'Outdoor Equipment Co.',
      description: 'Outdoor equipment rental company with beach and mountain outlets',
      isActive: true
    }
  });

  console.log('✅ Merchants created');

  // Create outlets for merchant 1
  const outlet1 = await prisma.outlet.upsert({
    where: { id: 'outlet1' },
    update: {},
    create: {
      id: 'outlet1',
      name: 'Main Branch',
      address: '123 Main Street, City Center',
      description: 'Main rental outlet in city center',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  const outlet2 = await prisma.outlet.upsert({
    where: { id: 'outlet2' },
    update: {},
    create: {
      id: 'outlet2',
      name: 'Downtown Branch',
      address: '456 Downtown Ave, Business District',
      description: 'Downtown rental outlet for business customers',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  // Create outlets for merchant 2
  const outlet3 = await prisma.outlet.upsert({
    where: { id: 'outlet3' },
    update: {},
    create: {
      id: 'outlet3',
      name: 'Beach Branch',
      address: '789 Beach Road, Coastal Area',
      description: 'Beach equipment rental for water sports',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  const outlet4 = await prisma.outlet.upsert({
    where: { id: 'outlet4' },
    update: {},
    create: {
      id: 'outlet4',
      name: 'Mountain Branch',
      address: '321 Mountain Trail, Highland Area',
      description: 'Mountain equipment rental for hiking and climbing',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  console.log('✅ Outlets created');

  // Create categories for merchant 1
  const campingCategory = await prisma.category.upsert({
    where: { id: 'category1' },
    update: {},
    create: {
      id: 'category1',
      name: 'Camping Equipment',
      description: 'Camping and outdoor equipment',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  const partyCategory = await prisma.category.upsert({
    where: { id: 'category2' },
    update: {},
    create: {
      id: 'category2',
      name: 'Party Equipment',
      description: 'Party and event equipment',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  const toolsCategory = await prisma.category.upsert({
    where: { id: 'category3' },
    update: {},
    create: {
      id: 'category3',
      name: 'Tools & Equipment',
      description: 'Professional tools and equipment',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  // Create categories for merchant 2
  const beachCategory = await prisma.category.upsert({
    where: { id: 'category4' },
    update: {},
    create: {
      id: 'category4',
      name: 'Beach Equipment',
      description: 'Beach and water sports equipment',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  const mountainCategory = await prisma.category.upsert({
    where: { id: 'category5' },
    update: {},
    create: {
      id: 'category5',
      name: 'Mountain Equipment',
      description: 'Mountain and climbing equipment',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  console.log('✅ Categories created');

  // Create users for merchant 1
  const adminUser1 = await prisma.user.upsert({
    where: { id: 'user1' },
    update: {},
    create: {
      id: 'user1',
      email: 'merchant@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Merchant',
      lastName: 'Owner',
      phone: '+1234567890',
      role: 'ADMIN',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  const staffUser1 = await prisma.user.upsert({
    where: { id: 'user2' },
    update: {},
    create: {
      id: 'user2',
      email: 'outlet_staff_main@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Main',
      lastName: 'Staff',
      phone: '+1234567891',
      role: 'USER',
      merchantId: merchant1.id,
      outletId: outlet1.id,
      isActive: true
    }
  });

  const staffUser2 = await prisma.user.upsert({
    where: { id: 'user3' },
    update: {},
    create: {
      id: 'user3',
      email: 'outlet_staff_downtown@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Downtown',
      lastName: 'Staff',
      phone: '+1234567892',
      role: 'USER',
      merchantId: merchant1.id,
      outletId: outlet2.id,
      isActive: true
    }
  });

  // Create users for merchant 2
  const adminUser2 = await prisma.user.upsert({
    where: { id: 'user4' },
    update: {},
    create: {
      id: 'user4',
      email: 'merchant@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Merchant',
      lastName: 'Owner',
      phone: '+1234567893',
      role: 'ADMIN',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  const beachStaff = await prisma.user.upsert({
    where: { id: 'user5' },
    update: {},
    create: {
      id: 'user5',
      email: 'outlet_staff_beach@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Beach',
      lastName: 'Staff',
      phone: '+1234567894',
      role: 'USER',
      merchantId: merchant2.id,
      outletId: outlet3.id,
      isActive: true
    }
  });

  const mountainStaff = await prisma.user.upsert({
    where: { id: 'user6' },
    update: {},
    create: {
      id: 'user6',
      email: 'outlet_staff_mountain@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Mountain',
      lastName: 'Staff',
      phone: '+1234567895',
      role: 'USER',
      merchantId: merchant2.id,
      outletId: outlet4.id,
      isActive: true
    }
  });

  console.log('✅ Users created');

  // Per-outlet admin accounts (model: merchant -> outlet -> users)
  // Merchant 1 - Outlet 1 (Main Branch)
  await prisma.user.upsert({
    where: { id: 'user7' },
    update: {},
    create: {
      id: 'user7',
      email: 'outlet_admin_main@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Main',
      lastName: 'Admin',
      role: 'ADMIN',
      merchantId: merchant1.id,
      outletId: outlet1.id,
      isActive: true
    }
  });

  // Merchant 1 - Outlet 2 (Downtown Branch)
  await prisma.user.upsert({
    where: { id: 'user9' },
    update: {},
    create: {
      id: 'user9',
      email: 'outlet_admin_downtown@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Downtown',
      lastName: 'Admin',
      role: 'ADMIN',
      merchantId: merchant1.id,
      outletId: outlet2.id,
      isActive: true
    }
  });

  // Merchant 2 - Outlet 3 (Beach Branch)
  await prisma.user.upsert({
    where: { id: 'user11' },
    update: {},
    create: {
      id: 'user11',
      email: 'outlet_admin_beach@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Beach',
      lastName: 'Admin',
      role: 'ADMIN',
      merchantId: merchant2.id,
      outletId: outlet3.id,
      isActive: true
    }
  });

  // Merchant 2 - Outlet 4 (Mountain Branch)
  await prisma.user.upsert({
    where: { id: 'user13' },
    update: {},
    create: {
      id: 'user13',
      email: 'outlet_admin_mountain@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Mountain',
      lastName: 'Admin',
      role: 'ADMIN',
      merchantId: merchant2.id,
      outletId: outlet4.id,
      isActive: true
    }
  });

  // Create customers
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const customer = await prisma.customer.upsert({
      where: { id: `customer${i}` },
      update: {},
      create: {
        id: `customer${i}`,
        firstName: `Customer${i}`,
        lastName: `Demo${i}`,
        email: `customer${i}@example.com`,
        phone: `+1234567${i.toString().padStart(3, '0')}`,
        address: `${i} Customer St, City`,
        merchantId: i <= 10 ? merchant1.id : merchant2.id,
        isActive: true
      }
    });
    customers.push(customer);
  }

  console.log('✅ Customers created');

  // Create products for merchant 1 (30 products)
  const merchant1Products = [];
  const merchant1Categories = [campingCategory, partyCategory, toolsCategory];
  
  for (let i = 1; i <= 30; i++) {
    const category = merchant1Categories[i % 3];
    const product = await prisma.product.upsert({
      where: { id: `product1_${i}` },
      update: {},
      create: {
        id: `product1_${i}`,
        name: `Product ${i} - ${category.name}`,
        description: `High-quality ${category.name.toLowerCase()} for rent`,
        barcode: `PROD1_${i.toString().padStart(3, '0')}`,
        totalStock: Math.floor(Math.random() * 20) + 5,
        rentPrice: Math.floor(Math.random() * 50) + 10,
        salePrice: Math.floor(Math.random() * 200) + 100,
        deposit: Math.floor(Math.random() * 100) + 20,
        images: JSON.stringify([`product${i}_1.jpg`, `product${i}_2.jpg`]),
        merchantId: merchant1.id,
        categoryId: category.id,
        isActive: true,
        outletStock: {
          create: [
            {
              outletId: outlet1.id,
              stock: Math.floor(Math.random() * 10) + 3,
              available: Math.floor(Math.random() * 10) + 3,
              renting: 0
            },
            {
              outletId: outlet2.id,
              stock: Math.floor(Math.random() * 10) + 2,
              available: Math.floor(Math.random() * 10) + 2,
              renting: 0
            }
          ]
        }
      }
    });
    merchant1Products.push(product);
  }

  // Create products for merchant 2 (30 products)
  const merchant2Products = [];
  const merchant2Categories = [beachCategory, mountainCategory];
  
  for (let i = 1; i <= 30; i++) {
    const category = merchant2Categories[i % 2];
    const product = await prisma.product.upsert({
      where: { id: `product2_${i}` },
      update: {},
      create: {
        id: `product2_${i}`,
        name: `Outdoor Product ${i} - ${category.name}`,
        description: `Professional ${category.name.toLowerCase()} for outdoor activities`,
        barcode: `PROD2_${i.toString().padStart(3, '0')}`,
        totalStock: Math.floor(Math.random() * 15) + 5,
        rentPrice: Math.floor(Math.random() * 80) + 20,
        salePrice: Math.floor(Math.random() * 300) + 150,
        deposit: Math.floor(Math.random() * 150) + 50,
        images: JSON.stringify([`outdoor${i}_1.jpg`, `outdoor${i}_2.jpg`]),
        merchantId: merchant2.id,
        categoryId: category.id,
        isActive: true,
        outletStock: {
          create: [
            {
              outletId: outlet3.id,
              stock: Math.floor(Math.random() * 8) + 2,
              available: Math.floor(Math.random() * 8) + 2,
              renting: 0
            },
            {
              outletId: outlet4.id,
              stock: Math.floor(Math.random() * 8) + 2,
              available: Math.floor(Math.random() * 8) + 2,
              renting: 0
            }
          ]
        }
      }
    });
    merchant2Products.push(product);
  }

  console.log('✅ Products created with outlet stock');

  // Create sample orders for Orders page
  console.log('🧾 Creating sample orders...');

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]) => arr[randomInt(0, arr.length - 1)];

  const makeOrderInput = (
    orderType: OrderType,
    outletId: string,
    customerId: string | undefined,
    productIds: string[],
    priceLookup: Record<string, { rentPrice: number; salePrice?: number; deposit: number }>,
    schedule?: { pickupPlanAt?: Date; returnPlanAt?: Date }
  ): OrderInput => {
    const orderItems = productIds.map((pid) => {
      const { rentPrice, salePrice, deposit } = priceLookup[pid];
      const quantity = randomInt(1, 2);
      const unitPrice = orderType === 'SALE' ? (salePrice ?? rentPrice) : rentPrice;
      return {
        productId: pid,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        deposit: orderType === 'RENT' ? deposit * quantity : 0,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);
    const depositAmount = orderItems.reduce((s, i) => s + (i.deposit ?? 0), 0);
    const totalAmount = subtotal; // taxes/discounts not modeled in schema

    return {
      orderType,
      customerId,
      outletId,
      pickupPlanAt: schedule?.pickupPlanAt,
      returnPlanAt: schedule?.returnPlanAt,
      subtotal,
      totalAmount,
      depositAmount,
      orderItems,
    };
  };

  // Build a quick price lookup for products
  const productPriceLookup: Record<string, { rentPrice: number; salePrice?: number; deposit: number }> = {};
  for (const p of [...merchant1Products, ...merchant2Products]) {
    productPriceLookup[p.id] = {
      rentPrice: p.rentPrice,
      salePrice: p.salePrice ?? undefined,
      deposit: p.deposit,
    };
  }

  const ordersCreated: string[] = [];

  // Helper to create and then optionally update status/timestamps
  const createOrderWithStatus = async (
    orderType: OrderType,
    outletId: string,
    customerId: string | undefined,
    productIds: string[],
    status: OrderStatus,
    schedule?: { pickupPlanAt?: Date; returnPlanAt?: Date; pickedUpAt?: Date; returnedAt?: Date }
  ) => {
    const input = makeOrderInput(orderType, outletId, customerId, productIds, productPriceLookup, schedule);
    const created = await createOrder(input, 'user1');
    ordersCreated.push(created.id);

    // Apply status transitions consistent with business rules
    if (status === 'CANCELLED') {
      // Directly cancel to ensure stock adjustments are handled correctly
      await cancelOrder(created.id, 'user1', 'Seeded cancellation');
    } else if (status !== 'PENDING') {
      const update: any = { status };
      if (schedule?.pickedUpAt) update.pickedUpAt = schedule.pickedUpAt;
      if (schedule?.returnedAt) update.returnedAt = schedule.returnedAt;
      await updateOrder(created.id, update, 'user1');
    }
  };

  // Merchant 1 orders (outlet1 and outlet2) - mix of RENT and SALE
  const m1Customers = customers.filter((c) => c.merchantId === merchant1.id);
  const m1ProductIds = merchant1Products.map((p) => p.id);

  // Create several RENT orders across statuses
  for (let i = 0; i < 4; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds)],
      'PENDING',
      {
        pickupPlanAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }
    );
  }

  for (let i = 0; i < 4; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds), pick(m1ProductIds)],
      'CONFIRMED',
      {
        pickupPlanAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      }
    );
  }

  for (let i = 0; i < 5; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds)],
      'ACTIVE',
      {
        pickupPlanAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        pickedUpAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }
    );
  }

  for (let i = 0; i < 3; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds)],
      'ACTIVE',
      {
        pickupPlanAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
        pickedUpAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }
    );
  }

  for (let i = 0; i < 5; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds), pick(m1ProductIds)],
      'COMPLETED',
      {
        pickupPlanAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        pickedUpAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        returnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }
    );
  }

  for (let i = 0; i < 2; i++) {
    await createOrderWithStatus(
      'RENT',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds)],
      'CANCELLED',
      {
        pickupPlanAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        returnPlanAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      }
    );
  }

  // SALE orders for merchant 1
  for (let i = 0; i < 4; i++) {
    await createOrderWithStatus(
      'SALE',
      i % 2 === 0 ? outlet1.id : outlet2.id,
      pick(m1Customers).id,
      [pick(m1ProductIds)],
      i % 2 === 0 ? 'COMPLETED' : 'CONFIRMED'
    );
  }

  // Merchant 2 orders (outlet3 and outlet4)
  const m2Customers = customers.filter((c) => c.merchantId === merchant2.id);
  const m2ProductIds = merchant2Products.map((p) => p.id);

  for (let i = 0; i < 6; i++) {
    await createOrderWithStatus(
      i % 3 === 0 ? 'SALE' : 'RENT',
      i % 2 === 0 ? outlet3.id : outlet4.id,
      pick(m2Customers).id,
      [pick(m2ProductIds)],
      i % 3 === 0 ? 'COMPLETED' : 'PENDING',
      i % 3 === 0
        ? undefined
        : {
            pickupPlanAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            returnPlanAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          }
    );
  }

  console.log(`✅ Sample orders created: ${ordersCreated.length}`);

  console.log('🎉 Comprehensive database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Merchants: 2`);
  console.log(`- Outlets: 4 (2 per merchant)`);
  console.log(`- Categories: 5 (3 for merchant1, 2 for merchant2)`);
  console.log(`- Products: 60 (30 per merchant with outlet stock distribution)`);
  console.log(`- Users: 6 (2 admins, 4 staff)`);
  console.log(`- Orders: ${ordersCreated.length} (mixed statuses and types)`);
  console.log(`- Customers: 20 (10 per merchant)`);
  
  console.log('\n🔑 Login Credentials (standardized)');
  console.log('\n=== MERCHANT 1 (Rental Shop Demo) ===');
  console.log('Merchant owner: merchant@rentalshop.com / password123');
  console.log('Outlet admin (Main): outlet_admin_main@rentalshop.com / password123');
  console.log('Outlet staff (Main): outlet_staff_main@rentalshop.com / password123');
  console.log('Outlet admin (Downtown): outlet_admin_downtown@rentalshop.com / password123');
  console.log('Outlet staff (Downtown): outlet_staff_downtown@rentalshop.com / password123');
  
  console.log('\n=== MERCHANT 2 (Outdoor Equipment Co.) ===');
  console.log('Merchant owner: merchant@outdoor.com / password123');
  console.log('Outlet admin (Beach): outlet_admin_beach@outdoor.com / password123');
  console.log('Outlet staff (Beach): outlet_staff_beach@outdoor.com / password123');
  console.log('Outlet admin (Mountain): outlet_admin_mountain@outdoor.com / password123');
  console.log('Outlet staff (Mountain): outlet_staff_mountain@outdoor.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 