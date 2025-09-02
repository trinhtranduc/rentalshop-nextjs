import { prisma } from './client';
import { createOrder, updateOrder, cancelOrder } from './order';
import type { OrderInput, OrderType, OrderStatus } from '@rentalshop/types';

async function main() {
  console.log('🌱 Starting comprehensive database seed with four-tier role system...');

  // Create merchants
  const merchant1 = await prisma.merchant.upsert({
    where: { id: 'merchant1' },
    update: {},
    create: {
      id: 'merchant1',
      publicId: 1,
      name: 'Rental Shop Demo',
      email: 'merchant@rentalshop.com',
      description: 'Demo rental shop for testing with multiple outlets',
      isActive: true
    }
  });

  const merchant2 = await prisma.merchant.upsert({
    where: { id: 'merchant2' },
    update: {},
    create: {
      id: 'merchant2',
      publicId: 2,
      name: 'Outdoor Equipment Co.',
      email: 'merchant@outdoor.com',
      description: 'Outdoor equipment rental company with beach and mountain outlets',
      isActive: true
    }
  });

  console.log('✅ Merchants created');

  // Create billing cycles
  const monthlyBillingCycle = await prisma.billingCycle.upsert({
    where: { value: 'monthly' },
    update: {},
    create: {
      publicId: 1,
      name: 'Monthly',
      value: 'monthly',
      months: 1,
      discount: 0,
      description: 'Billed every month',
      isActive: true,
      sortOrder: 1
    }
  });

  const quarterlyBillingCycle = await prisma.billingCycle.upsert({
    where: { value: 'quarterly' },
    update: {},
    create: {
      publicId: 2,
      name: 'Quarterly',
      value: 'quarterly',
      months: 3,
      discount: 5,
      description: 'Billed every 3 months with 5% discount',
      isActive: true,
      sortOrder: 2
    }
  });

  const semiAnnualBillingCycle = await prisma.billingCycle.upsert({
    where: { value: 'semi_annual' },
    update: {},
    create: {
      publicId: 3,
      name: 'Semi-Annual',
      value: 'semi_annual',
      months: 6,
      discount: 10,
      description: 'Billed every 6 months with 10% discount',
      isActive: true,
      sortOrder: 3
    }
  });

  const annualBillingCycle = await prisma.billingCycle.upsert({
    where: { value: 'annual' },
    update: {},
    create: {
      publicId: 4,
      name: 'Annual',
      value: 'annual',
      months: 12,
      discount: 20,
      description: 'Billed every 12 months with 20% discount',
      isActive: true,
      sortOrder: 4
    }
  });

  console.log('✅ Billing cycles created');

  // Create outlets for merchant 1
  const outlet1 = await prisma.outlet.upsert({
    where: { id: 'outlet1' },
    update: {},
    create: {
      id: 'outlet1',
      publicId: 1,
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
      publicId: 2,
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
      publicId: 3,
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
      publicId: 4,
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
      publicId: 1,
      name: 'Camping',
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
      publicId: 2,
      name: 'Party',
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
      publicId: 3,
      name: 'Tools',
      description: 'Tools and construction equipment',
      merchantId: merchant1.id,
      isActive: true
    }
  });

  // Create categories for merchant 2
  const waterSportsCategory = await prisma.category.upsert({
    where: { id: 'category4' },
    update: {},
    create: {
      id: 'category4',
      publicId: 4,
      name: 'Water Sports',
      description: 'Water sports and beach equipment',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  const hikingCategory = await prisma.category.upsert({
    where: { id: 'category5' },
    update: {},
    create: {
      id: 'category5',
      publicId: 5,
      name: 'Hiking',
      description: 'Hiking and mountain equipment',
      merchantId: merchant2.id,
      isActive: true
    }
  });

  console.log('✅ Categories created');

  // ============================================================================
  // CREATE USERS WITH PROPER FOUR-TIER ROLE SYSTEM
  // ============================================================================

  // 1. SYSTEM ADMIN (No merchant or outlet assignment)
  const systemAdmin = await prisma.user.upsert({
    where: { id: 'system_admin' },
    update: {},
    create: {
      id: 'system_admin',
      publicId: 1,
      email: 'admin@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+1234567890',
      role: 'ADMIN',
      // No merchantId or outletId for system admin
      isActive: true
    }
  });

  // 2. MERCHANT OWNERS (Assigned to merchant, no outlet)
  const merchantOwner1 = await prisma.user.upsert({
    where: { id: 'merchant_owner_1' },
    update: {},
    create: {
      id: 'merchant_owner_1',
      publicId: 2,
      email: 'merchant@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Rental',
      lastName: 'Merchant',
      phone: '+1234567891',
      role: 'MERCHANT',
      merchantId: merchant1.id,
      // No outletId for merchant owners
      isActive: true
    }
  });

  const merchantOwner2 = await prisma.user.upsert({
    where: { id: 'merchant_owner_2' },
    update: {},
    create: {
      id: 'merchant_owner_2',
      publicId: 3,
      email: 'merchant@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Outdoor',
      lastName: 'Merchant',
      phone: '+1234567892',
      role: 'MERCHANT',
      merchantId: merchant2.id,
      // No outletId for merchant owners
      isActive: true
    }
  });

  // 3. OUTLET ADMINS (Assigned to both merchant and specific outlet)
  const outletAdminMain = await prisma.user.upsert({
    where: { id: 'outlet_admin_main' },
    update: {},
    create: {
      id: 'outlet_admin_main',
      publicId: 4,
      email: 'outlet_admin_main@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Main',
      lastName: 'Admin',
      phone: '+1234567893',
      role: 'OUTLET_ADMIN',
      merchantId: merchant1.id,
      outletId: outlet1.id,
      isActive: true
    }
  });

  const outletAdminDowntown = await prisma.user.upsert({
    where: { id: 'outlet_admin_downtown' },
    update: {},
    create: {
      id: 'outlet_admin_downtown',
      publicId: 5,
      email: 'outlet_admin_downtown@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Downtown',
      lastName: 'Admin',
      phone: '+1234567894',
      role: 'OUTLET_ADMIN',
      merchantId: merchant1.id,
      outletId: outlet2.id,
      isActive: true
    }
  });

  const outletAdminBeach = await prisma.user.upsert({
    where: { id: 'outlet_admin_beach' },
    update: {},
    create: {
      id: 'outlet_admin_beach',
      publicId: 6,
      email: 'outlet_admin_beach@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Beach',
      lastName: 'Admin',
      phone: '+1234567895',
      role: 'OUTLET_ADMIN',
      merchantId: merchant2.id,
      outletId: outlet3.id,
      isActive: true
    }
  });

  const outletAdminMountain = await prisma.user.upsert({
    where: { id: 'outlet_admin_mountain' },
    update: {},
    create: {
      id: 'outlet_admin_mountain',
      publicId: 7,
      email: 'outlet_admin_mountain@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Mountain',
      lastName: 'Admin',
      phone: '+1234567896',
      role: 'OUTLET_ADMIN',
      merchantId: merchant2.id,
      outletId: outlet4.id,
      isActive: true
    }
  });

  // 4. OUTLET STAFF (Assigned to both merchant and specific outlet)
  const outletStaffMain = await prisma.user.upsert({
    where: { id: 'outlet_staff_main' },
    update: {},
    create: {
      id: 'outlet_staff_main',
      publicId: 8,
      email: 'outlet_staff_main@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Main',
      lastName: 'Staff',
      phone: '+1234567897',
      role: 'OUTLET_STAFF',
      merchantId: merchant1.id,
      outletId: outlet1.id,
      isActive: true
    }
  });

  const outletStaffDowntown = await prisma.user.upsert({
    where: { id: 'outlet_staff_downtown' },
    update: {},
    create: {
      id: 'outlet_staff_downtown',
      publicId: 9,
      email: 'outlet_staff_downtown@rentalshop.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Downtown',
      lastName: 'Staff',
      phone: '+1234567898',
      role: 'OUTLET_STAFF',
      merchantId: merchant1.id,
      outletId: outlet2.id,
      isActive: true
    }
  });

  const outletStaffBeach = await prisma.user.upsert({
    where: { id: 'outlet_staff_beach' },
    update: {},
    create: {
      id: 'outlet_staff_beach',
      publicId: 10,
      email: 'outlet_staff_beach@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Beach',
      lastName: 'Staff',
      phone: '+1234567899',
      role: 'OUTLET_STAFF',
      merchantId: merchant2.id,
      outletId: outlet3.id,
      isActive: true
    }
  });

  const outletStaffMountain = await prisma.user.upsert({
    where: { id: 'outlet_staff_mountain' },
    update: {},
    create: {
      id: 'outlet_staff_mountain',
      publicId: 11,
      email: 'outlet_staff_mountain@outdoor.com',
      password: '$2b$10$I7uXDvyRITy0eHewELxK9OZAF1rFGoIbahgNGSTlVJfTTMx.iXWNG', // password123
      firstName: 'Mountain',
      lastName: 'Staff',
      phone: '+1234567900',
      role: 'OUTLET_STAFF',
      merchantId: merchant2.id,
      outletId: outlet4.id,
      isActive: true
    }
  });

  console.log('✅ Users created with proper four-tier role system');

  // ============================================================================
  // ROLE SYSTEM SUMMARY
  // ============================================================================
  console.log('\n🔐 FOUR-TIER ROLE SYSTEM IMPLEMENTED:');
  console.log('🏢 ADMIN (System-wide): admin@rentalshop.com');
  console.log('🏪 MERCHANT (Organization-wide):');
  console.log('   - merchant@rentalshop.com (Rental Shop Demo)');
  console.log('   - merchant@outdoor.com (Outdoor Equipment Co.)');
  console.log('🏬 OUTLET_ADMIN (Outlet-wide):');
  console.log('   - outlet_admin_main@rentalshop.com (Main Branch)');
  console.log('   - outlet_admin_downtown@rentalshop.com (Downtown Branch)');
  console.log('   - outlet_admin_beach@outdoor.com (Beach Branch)');
  console.log('   - outlet_admin_mountain@outdoor.com (Mountain Branch)');
  console.log('👥 OUTLET_STAFF (Limited outlet access):');
  console.log('   - outlet_staff_main@rentalshop.com (Main Branch)');
  console.log('   - outlet_staff_downtown@rentalshop.com (Downtown Branch)');
  console.log('   - outlet_staff_beach@outdoor.com (Beach Branch)');
  console.log('   - outlet_staff_mountain@outdoor.com (Mountain Branch)');
  console.log('\nAll passwords: password123\n');

  // Create customers
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const customer = await prisma.customer.upsert({
      where: { id: `customer${i}` },
      update: {},
      create: {
        id: `customer${i}`,
        publicId: i,
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
        publicId: i,
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
  const merchant2Categories = [waterSportsCategory, hikingCategory];
  
  for (let i = 1; i <= 30; i++) {
    const category = merchant2Categories[i % 2];
    const product = await prisma.product.upsert({
      where: { id: `product2_${i}` },
      update: {},
      create: {
        id: `product2_${i}`,
        publicId: i + 30, // Continue from where merchant 1 left off
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
  console.log('⚠️ Order creation temporarily disabled - will be added with proper public IDs later');

  /*
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]) => arr[randomInt(0, arr.length - 1)];

  const makeOrderInput = (
    orderType: OrderType,
    outletId: number,
    customerId: number | undefined,
    productIds: number[],
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
    outletId: number,
    customerId: number | undefined,
    productIds: number[],
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
      'BOOKED',
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
      i % 2 === 0 ? 'COMPLETED' : 'BOOKED'
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
  */

  console.log('✅ Sample orders creation skipped for now');

  console.log('🎉 Comprehensive database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Merchants: 2`);
  console.log(`- Outlets: 4 (2 per merchant)`);
  console.log(`- Categories: 5 (3 for merchant1, 2 for merchant2)`);
  console.log(`- Products: 60 (30 per merchant with outlet stock distribution)`);
  console.log(`- Users: 11 (1 System Admin, 2 Merchant Owners, 4 Outlet Admins, 4 Outlet Staff)`);
  console.log(`- Orders: 0 (temporarily disabled)`);
  console.log(`- Customers: 20 (10 per merchant)`);
  
  console.log('\n🔑 Login Credentials (standardized)');
  console.log('\n=== SYSTEM ADMIN (admin@rentalshop.com) ===');
  console.log('System Administrator: admin@rentalshop.com / password123');
  
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
  
  console.log('\n🔢 Public ID Examples:');
  console.log('Users: 1, 2, 3...');
console.log('Customers: 1, 2, 3...');
console.log('Products: 1, 2, 3...');
console.log('Orders: 1, 2, 3...');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 