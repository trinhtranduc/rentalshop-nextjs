#!/usr/bin/env node

/**
 * Clean and Re-seed Plans
 * 
 * This script removes all existing plans and variants, then re-seeds with the updated plan structure.
 * This ensures we have the correct Trial plan instead of the old Seasonal plan.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning and re-seeding plans...');

  try {
    // Step 1: Delete all existing plan variants
    console.log('🗑️ Deleting existing plan variants...');
    const deletedVariants = await prisma.planVariant.deleteMany({});
    console.log(`✅ Deleted ${deletedVariants.count} plan variants`);

    // Step 2: Delete all existing plans
    console.log('🗑️ Deleting existing plans...');
    const deletedPlans = await prisma.plan.deleteMany({});
    console.log(`✅ Deleted ${deletedPlans.count} plans`);

    // Step 3: Re-seed with updated plans
    console.log('🌱 Re-seeding plans and variants...');
    
    // Create Plans (Trial first, then paid plans)
    const plans = [
      {
        publicId: 1,
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
        isPopular: true,
        sortOrder: 1
      },
      {
        publicId: 2,
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
        sortOrder: 2
      },
      {
        publicId: 3,
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
        isPopular: false,
        sortOrder: 3
      },
      {
        publicId: 4,
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
        sortOrder: 4
      }
    ];

    // Create plans in database
    const createdPlans = [];
    for (const planData of plans) {
      const plan = await prisma.plan.create({
        data: {
          ...planData,
          features: JSON.stringify(planData.features)
        }
      });
      console.log(`✅ Created plan: ${plan.name} (ID: ${plan.publicId})`);
      createdPlans.push(plan);
    }

    // Create Plan Variants
    console.log('🎯 Creating plan variants...');

    // Trial Plan Variants (Trial plan has no variants - it's free)
    const trialVariants = [];

    // Starter Plan Variants
    const starterVariants = [
      {
        planId: createdPlans[1].id,
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
        planId: createdPlans[1].id,
        name: '3 Months',
        duration: 3,
        price: 79.99,
        discount: 11.1,
        savings: 9.98,
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: createdPlans[1].id,
        name: '6 Months',
        duration: 6,
        price: 149.99,
        discount: 16.7,
        savings: 29.95,
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: createdPlans[1].id,
        name: '12 Months',
        duration: 12,
        price: 269.99,
        discount: 25.0,
        savings: 89.89,
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Professional Plan Variants
    const professionalVariants = [
      {
        planId: createdPlans[2].id,
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
        planId: createdPlans[2].id,
        name: '3 Months',
        duration: 3,
        price: 209.99,
        discount: 12.5,
        savings: 29.98,
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: createdPlans[2].id,
        name: '6 Months',
        duration: 6,
        price: 399.99,
        discount: 16.7,
        savings: 79.95,
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: createdPlans[2].id,
        name: '12 Months',
        duration: 12,
        price: 719.99,
        discount: 25.0,
        savings: 239.89,
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Enterprise Plan Variants
    const enterpriseVariants = [
      {
        planId: createdPlans[3].id,
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
        planId: createdPlans[3].id,
        name: '3 Months',
        duration: 3,
        price: 529.99,
        discount: 11.7,
        savings: 69.98,
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        planId: createdPlans[3].id,
        name: '6 Months',
        duration: 6,
        price: 999.99,
        discount: 16.7,
        savings: 199.95,
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        planId: createdPlans[3].id,
        name: '12 Months',
        duration: 12,
        price: 1799.99,
        discount: 25.0,
        savings: 599.89,
        isActive: true,
        isPopular: false,
        sortOrder: 4
      }
    ];

    // Create all variants
    const allVariants = [
      ...trialVariants,
      ...starterVariants,
      ...professionalVariants,
      ...enterpriseVariants
    ];

    for (const variantData of allVariants) {
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
      console.log(`✅ Created variant: ${variant.name} for ${plan?.name} (ID: ${variant.publicId})`);
    }

    console.log('\n🎉 Clean and re-seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${plans.length} plans created`);
    console.log(`   • ${allVariants.length} variants created`);
    console.log('\n🚀 Updated plans:');
    const planSummary = plans.map(plan => `${plan.name}: $${plan.basePrice} (${plan.trialDays}d trial)`).join(' | ');
    console.log(`   ${planSummary}`);

  } catch (error) {
    console.error('❌ Error cleaning and re-seeding:', error);
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
