import { prisma } from './client';

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in case db:seed is called without migrate reset)
  await prisma.subscriptionActivity.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.outletStock.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.outlet.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.merchant.deleteMany({});
  await prisma.plan.deleteMany({});

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Create a basic Trial plan
  const trialPlan = await prisma.plan.create({
    data: {
      name: 'Trial',
      description: 'Free trial plan for development/testing',
      basePrice: 0,
      currency: 'USD',
      trialDays: 14,
      limits: JSON.stringify({
        outlets: 2,
        users: 5,
        products: 500,
        customers: 2000,
      }),
      features: JSON.stringify([
        'Basic inventory management',
        'Customer management',
        'Order processing',
        'Basic reporting',
        '14-day free trial',
      ]),
      isActive: true,
      isPopular: false,
      sortOrder: 0,
    },
  });

  console.log('✅ Plan seeded:', trialPlan.name);

  // Helper to seed a merchant with outlet + owner user + subscription
  async function seedMerchant(opts: {
    name: string;
    email: string;
    phone: string;
    tenantKey: string;
  }) {
    const merchant = await prisma.merchant.create({
      data: {
        name: opts.name,
        email: opts.email,
        phone: opts.phone,
        tenantKey: opts.tenantKey,
        businessType: 'GENERAL',
        pricingType: 'FIXED',
        country: 'VN',
        isActive: true,
      } as any,
    });

    const outlet = await prisma.outlet.create({
      data: {
        name: `${merchant.name} - Main Store`,
        address: 'Default address',
        phone: merchant.phone,
        city: 'HCM',
        country: 'VN',
        description: 'Default outlet created by seed script',
        merchantId: merchant.id,
        isActive: true,
        isDefault: true,
      },
    });

    // Simple owner user with password hash placeholder (should be updated via real registration)
    const user = await prisma.user.create({
      data: {
        email: opts.email,
        // NOTE: password here is a placeholder; real login should use accounts created via API.
        password: 'hashed-password',
        firstName: opts.name,
        lastName: '',
        phone: opts.phone,
        role: 'MERCHANT',
        merchantId: merchant.id,
        outletId: outlet.id,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: now,
      },
    });

    const subscription = await prisma.subscription.create({
      data: {
        merchantId: merchant.id,
        planId: trialPlan.id,
        status: 'trial',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd: trialEnd,
        cancelAtPeriodEnd: false,
        amount: 0,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        period: 1,
        discount: 0,
        savings: 0,
      },
    });

    console.log('✅ Merchant seeded:', {
      id: merchant.id,
      name: merchant.name,
      tenantKey: merchant.tenantKey,
      outletId: outlet.id,
      userId: user.id,
      subscriptionId: subscription.id,
    });
  }

  await seedMerchant({
    name: 'My Shop',
    email: 'myshop@example.com',
    phone: '0900000000',
    tenantKey: 'myshop',
  });

  await seedMerchant({
    name: 'Demo Tenant',
    email: 'demo@example.com',
    phone: '0900000001',
    tenantKey: 'demo',
  });

  console.log('🌱 Seed completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


