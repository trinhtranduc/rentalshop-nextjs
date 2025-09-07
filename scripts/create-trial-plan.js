#!/usr/bin/env node

/**
 * Create Trial Plan for New Merchants
 * 
 * This script creates a dedicated trial plan that new merchants are automatically
 * enrolled in when they register. The trial plan provides limited features for
 * 14 days to let merchants test the platform.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🆓 Creating Trial Plan for new merchant onboarding...');

  try {
    // Check if trial plan already exists
    const existingTrialPlan = await prisma.plan.findFirst({
      where: { name: 'Trial' }
    });

    if (existingTrialPlan) {
      console.log('⚠️  Trial plan already exists, updating...');
      
      // Update existing trial plan
      await prisma.plan.update({
        where: { id: existingTrialPlan.id },
        data: {
          name: 'Trial',
          description: 'Free trial plan for new merchants to test the platform',
          basePrice: 0, // Free
          currency: 'USD',
          trialDays: 14,
          maxOutlets: 1,
          maxUsers: 2,
          maxProducts: 25,
          maxCustomers: 50,
          features: JSON.stringify([
            'Basic inventory management',
            'Customer management',
            'Order processing (limited)',
            'Basic reporting',
            'Email support',
            'Mobile app access',
            '14-day free trial'
          ]),
          isActive: true,
          isPopular: false,
          sortOrder: 0 // Show first
        }
      });
      
      console.log('✅ Trial plan updated successfully!');
    } else {
      // Create new trial plan
      const lastPlan = await prisma.plan.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const nextPublicId = (lastPlan?.publicId || 0) + 1;

      const trialPlan = await prisma.plan.create({
        data: {
          publicId: nextPublicId,
          name: 'Trial',
          description: 'Free trial plan for new merchants to test the platform',
          basePrice: 0, // Free
          currency: 'USD',
          trialDays: 14,
          maxOutlets: 1,
          maxUsers: 2,
          maxProducts: 25,
          maxCustomers: 50,
          features: JSON.stringify([
            'Basic inventory management',
            'Customer management',
            'Order processing (limited)',
            'Basic reporting',
            'Email support',
            'Mobile app access',
            '14-day free trial'
          ]),
          isActive: true,
          isPopular: false,
          sortOrder: 0 // Show first
        }
      });

      console.log('✅ Trial plan created successfully!');
      console.log(`   Plan ID: ${trialPlan.publicId}`);
      console.log(`   Name: ${trialPlan.name}`);
      console.log(`   Price: $${trialPlan.basePrice}`);
      console.log(`   Trial Days: ${trialPlan.trialDays}`);
    }

    // Display trial plan details
    const trialPlan = await prisma.plan.findFirst({
      where: { name: 'Trial' }
    });

    console.log('\n📊 Trial Plan Details:');
    console.log(`   • Outlets: ${trialPlan.maxOutlets}`);
    console.log(`   • Users: ${trialPlan.maxUsers}`);
    console.log(`   • Products: ${trialPlan.maxProducts}`);
    console.log(`   • Customers: ${trialPlan.maxCustomers}`);
    console.log(`   • Trial Period: ${trialPlan.trialDays} days`);
    console.log(`   • Features: ${JSON.parse(trialPlan.features).length} included`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Update merchant registration to auto-assign trial plan');
    console.log('   2. Add trial plan to subscription preview page');
    console.log('   3. Implement trial expiration handling');
    console.log('   4. Add trial status indicators in admin dashboard');

  } catch (error) {
    console.error('❌ Error creating trial plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
