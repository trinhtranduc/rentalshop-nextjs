#!/usr/bin/env node

/**
 * Seed Plans and Plan Variants
 * 
 * This script creates sample plans and their variants for testing the Plan Variants system.
 * It includes different pricing tiers and durations to demonstrate the full functionality.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Plans and Plan Variants seeding...');

  try {
    // Check for existing data
    const existingPlans = await prisma.plan.count();
    const existingVariants = await prisma.planVariant.count();
    
    if (existingPlans > 0 || existingVariants > 0) {
      console.log(`⚠️  Found existing data: ${existingPlans} plans, ${existingVariants} variants`);
      console.log('📝 Adding new data without clearing existing data...');
    } else {
      console.log('✅ No existing data found, proceeding with fresh seeding');
    }

    // Create Plans
    console.log('📋 Creating plans...');
    
    const plans = [
      {
        publicId: 1,
        name: 'Starter',
        description: 'Perfect for small rental businesses just getting started',
        basePrice: 29.99,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 3,
        maxProducts: 100,
        maxCustomers: -1, // Unlimited customers
        features: [
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Email support',
          'Mobile app access'
        ],
        mobileOnly: true, // Mobile app only
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        publicId: 2,
        name: 'Professional',
        description: 'Ideal for growing rental businesses with multiple outlets',
        basePrice: 79.99,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 5,
        maxUsers: 15,
        maxProducts: 1000,
        maxCustomers: -1, // Unlimited customers
        features: [
          'Advanced inventory management',
          'Multi-outlet support',
          'Advanced reporting & analytics',
          'Inventory forecasting',
          'Priority support',
          'API access',
          'Custom branding',
          'Advanced customer management',
          'Team collaboration tools',
          'Advanced integrations'
        ],
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        publicId: 3,
        name: 'Enterprise',
        description: 'Complete solution for large rental operations',
        basePrice: 199.99,
        currency: 'USD',
        trialDays: 30,
        maxOutlets: -1, // Unlimited outlets
        maxUsers: -1, // Unlimited users
        maxProducts: -1, // Unlimited products
        maxCustomers: -1, // Unlimited customers
        features: [
          'Unlimited everything',
          'Advanced analytics & reporting',
          '24/7 priority support',
          'Full API access',
          'White-label solution',
          'Advanced integrations',
          'Custom workflows',
          'Dedicated account manager',
          'SLA guarantee',
          'Advanced security features',
          'Custom training',
          'Priority feature requests'
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        publicId: 4,
        name: 'Trial',
        description: 'Free trial plan for new merchants to test the platform',
        basePrice: 0.00,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 2,
        maxProducts: 50,
        maxCustomers: 100,
        features: [
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Email support',
          'Mobile app access',
          '14-day free trial'
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Create plans in database
    const createdPlans = [];
    for (const planData of plans) {
      // Check if plan already exists
      const existingPlan = await prisma.plan.findUnique({
        where: { publicId: planData.publicId }
      });
      
      if (existingPlan) {
        console.log(`⚠️  Plan already exists: ${planData.name} (ID: ${planData.publicId})`);
        createdPlans.push(existingPlan);
      } else {
        const plan = await prisma.plan.create({
          data: {
            ...planData,
            features: JSON.stringify(planData.features)
          }
        });
        console.log(`✅ Created plan: ${plan.name} (ID: ${plan.publicId})`);
        createdPlans.push(plan);
      }
    }

    // Create Plan Variants for each plan
    console.log('🎯 Creating plan variants...');

    // Starter Plan Variants
    const starterVariants = [
      {
        planId: 1, // Will be updated with actual plan ID
        name: '1 Month',
        duration: 1,
        price: 29.99,
        discount: 0,
        savings: 0,
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        planId: 1,
        name: '3 Months',
        duration: 3,
        price: 79.99,
        discount: 11.1, // (29.99 * 3 - 79.99) / (29.99 * 3) * 100
        savings: 9.98, // 29.99 * 3 - 79.99
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: 1,
        name: '6 Months',
        duration: 6,
        price: 149.99,
        discount: 16.7, // (29.99 * 6 - 149.99) / (29.99 * 6) * 100
        savings: 29.95, // 29.99 * 6 - 149.99
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: 1,
        name: '12 Months',
        duration: 12,
        price: 269.99,
        discount: 25.0, // (29.99 * 12 - 269.99) / (29.99 * 12) * 100
        savings: 89.89, // 29.99 * 12 - 269.99
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Professional Plan Variants
    const professionalVariants = [
      {
        planId: 2,
        name: '1 Month',
        duration: 1,
        price: 79.99,
        discount: 0,
        savings: 0,
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        planId: 2,
        name: '3 Months',
        duration: 3,
        price: 209.99,
        discount: 12.5, // (79.99 * 3 - 209.99) / (79.99 * 3) * 100
        savings: 29.98, // 79.99 * 3 - 209.99
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: 2,
        name: '6 Months',
        duration: 6,
        price: 399.99,
        discount: 16.7, // (79.99 * 6 - 399.99) / (79.99 * 6) * 100
        savings: 79.95, // 79.99 * 6 - 399.99
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: 2,
        name: '12 Months',
        duration: 12,
        price: 719.99,
        discount: 25.0, // (79.99 * 12 - 719.99) / (79.99 * 12) * 100
        savings: 239.89, // 79.99 * 12 - 719.99
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Enterprise Plan Variants
    const enterpriseVariants = [
      {
        planId: 3,
        name: '1 Month',
        duration: 1,
        price: 199.99,
        discount: 0,
        savings: 0,
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        planId: 3,
        name: '3 Months',
        duration: 3,
        price: 529.99,
        discount: 11.7, // (199.99 * 3 - 529.99) / (199.99 * 3) * 100
        savings: 69.98, // 199.99 * 3 - 529.99
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: 3,
        name: '6 Months',
        duration: 6,
        price: 999.99,
        discount: 16.7, // (199.99 * 6 - 999.99) / (199.99 * 6) * 100
        savings: 199.95, // 199.99 * 6 - 999.99
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: 3,
        name: '12 Months',
        duration: 12,
        price: 1799.99,
        discount: 25.0, // (199.99 * 12 - 1799.99) / (199.99 * 12) * 100
        savings: 599.89, // 199.99 * 12 - 1799.99
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Trial Plan Variants (Trial plan has no variants - it's free)
    const trialVariants = [];

    // Use the created plans for ID mapping
    const planIdMap = {};
    createdPlans.forEach(plan => {
      planIdMap[plan.publicId] = plan.id;
    });

    // Create variants for each plan
    const allVariants = [
      ...starterVariants.map(v => ({ ...v, planId: planIdMap[1] })),
      ...professionalVariants.map(v => ({ ...v, planId: planIdMap[2] })),
      ...enterpriseVariants.map(v => ({ ...v, planId: planIdMap[3] })),
      ...trialVariants.map(v => ({ ...v, planId: planIdMap[4] }))
    ];

    for (const variantData of allVariants) {
      // Check if variant already exists for this plan
      const existingVariant = await prisma.planVariant.findFirst({
        where: {
          planId: variantData.planId,
          name: variantData.name
        }
      });
      
      if (existingVariant) {
        console.log(`⚠️  Variant already exists: ${variantData.name} for plan ${variantData.planId}`);
        continue;
      }
      
      // Get next publicId for variant
      const lastVariant = await prisma.planVariant.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const nextPublicId = (lastVariant?.publicId || 0) + 1;

      const variant = await prisma.planVariant.create({
        data: {
          ...variantData,
          publicId: nextPublicId
        }
      });
      
      const plan = createdPlans.find(p => p.id === variantData.planId);
      console.log(`✅ Created variant: ${variant.name} for ${plan?.publicId} (ID: ${variant.publicId})`);
    }

    // Create some deleted variants for testing recycling
    console.log('🗑️ Creating deleted variants for recycling demo...');
    
    const deletedVariants = [
      {
        planId: planIdMap[1], // Starter plan
        name: '2 Months (Discontinued)',
        duration: 2,
        price: 54.99,
        discount: 8.3,
        savings: 4.99,
        isActive: false,
        isPopular: false,
        sortOrder: 5,
        deletedAt: new Date()
      },
      {
        planId: planIdMap[2], // Professional plan
        name: '9 Months (Legacy)',
        duration: 9,
        price: 599.99,
        discount: 16.7,
        savings: 119.92,
        isActive: false,
        isPopular: false,
        sortOrder: 5,
        deletedAt: new Date()
      }
    ];

    for (const variantData of deletedVariants) {
      const lastVariant = await prisma.planVariant.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const nextPublicId = (lastVariant?.publicId || 0) + 1;

      const variant = await prisma.planVariant.create({
        data: {
          ...variantData,
          publicId: nextPublicId
        }
      });
      
      const plan = createdPlans.find(p => p.id === variantData.planId);
      console.log(`✅ Created deleted variant: ${variant.name} for ${plan?.publicId} (ID: ${variant.publicId})`);
    }

    console.log('\n🎉 Plans and Plan Variants seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${plans.length} plans created`);
    console.log(`   • ${allVariants.length} active variants created`);
    console.log(`   • ${deletedVariants.length} deleted variants created (for recycling demo)`);
    console.log('\n🚀 You can now test the Plan Variants system at:');
    console.log('   • Admin Plans: http://localhost:3000/admin/plans');
    console.log('   • Plan Variants: http://localhost:3000/admin/plan-variants');

  } catch (error) {
    console.error('❌ Error seeding plans and variants:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
