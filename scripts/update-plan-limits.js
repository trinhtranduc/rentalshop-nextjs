#!/usr/bin/env node

/**
 * Update Plan Limits Based on Modern Subscription Strategy
 * 
 * This script updates existing plans with the new recommended limits:
 * - Unlimited customers for all plans
 * - More generous user and product limits
 * - Updated features
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating plan limits based on modern subscription strategy...');

  try {
    // Update Starter Plan
    console.log('📋 Updating Starter plan...');
    await prisma.plan.updateMany({
      where: { name: 'Starter' },
      data: {
        maxUsers: 3,
        maxProducts: 100,
        maxCustomers: -1, // Unlimited
        features: JSON.stringify([
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Email support',
          'Mobile app access'
        ])
      }
    });

    // Update Professional Plan
    console.log('📋 Updating Professional plan...');
    await prisma.plan.updateMany({
      where: { name: 'Professional' },
      data: {
        maxOutlets: 5,
        maxUsers: 15,
        maxProducts: 1000,
        maxCustomers: -1, // Unlimited
        features: JSON.stringify([
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
        ])
      }
    });

    // Update Enterprise Plan
    console.log('📋 Updating Enterprise plan...');
    await prisma.plan.updateMany({
      where: { name: 'Enterprise' },
      data: {
        maxOutlets: -1, // Unlimited
        maxUsers: -1, // Unlimited
        maxProducts: -1, // Unlimited
        maxCustomers: -1, // Unlimited
        features: JSON.stringify([
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
        ])
      }
    });

    // Update Seasonal Plan if it exists
    console.log('📋 Updating Seasonal plan...');
    await prisma.plan.updateMany({
      where: { name: 'Seasonal' },
      data: {
        maxCustomers: -1, // Unlimited
        features: JSON.stringify([
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Email support',
          'Mobile app access',
          'Seasonal pricing tools'
        ])
      }
    });

    console.log('✅ Plan limits updated successfully!');
    
    // Display updated plans
    console.log('\n📊 Updated Plans:');
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    plans.forEach(plan => {
      console.log(`\n${plan.name}:`);
      console.log(`  • Outlets: ${plan.maxOutlets === -1 ? 'Unlimited' : plan.maxOutlets}`);
      console.log(`  • Users: ${plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}`);
      console.log(`  • Products: ${plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts.toLocaleString()}`);
      console.log(`  • Customers: ${plan.maxCustomers === -1 ? 'Unlimited' : plan.maxCustomers.toLocaleString()}`);
      console.log(`  • Price: $${plan.basePrice}/${plan.currency}`);
    });

  } catch (error) {
    console.error('❌ Error updating plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
