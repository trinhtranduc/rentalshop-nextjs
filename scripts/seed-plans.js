/**
 * Plan Seeder Script
 * 
 * This script seeds plans from SUBSCRIPTION_PLANS constants.
 * 
 * Features:
 * - Upsert logic (update if exists, create if not)
 * - Support --force flag to overwrite existing plans
 * - Includes orders field in limits
 * - Logs detailed progress
 * 
 * Usage:
 *   node scripts/seed-plans.js          # Upsert plans (update if exists)
 *   node scripts/seed-plans.js --force  # Force overwrite existing plans
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Check for --force flag
const forceMode = process.argv.includes('--force');

// SUBSCRIPTION_PLANS constants (copied from packages/constants/src/subscription.ts)
// We can't easily import TypeScript files in Node.js, so we'll define them here
const SUBSCRIPTION_PLANS = {
  TRIAL: {
    id: 'trial',
    name: 'Trial',
    description: 'Free trial with starter plan limits',
    basePrice: 0,
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2000,
      orders: 2000
    },
    features: [
      'Mobile app access',
      'Basic inventory management',
      'Customer management',
      'Order processing',
      'Basic reporting',
      'Public product catalog',
      'Product public check'
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 0
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for small rental businesses',
    basePrice: 79000,
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2000,
      orders: 2000
    },
    features: [
      'Mobile app access',
      'Basic inventory management',
      'Customer management',
      'Order processing',
      'Basic reporting',
      'Public product catalog',
      'Product public check'
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 1
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing rental businesses with web access',
    basePrice: 199000,
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 8,
      products: 5000,
      customers: 10000,
      orders: 10000
    },
    features: [
      'All Basic features',
      'Web dashboard access',
      'Advanced reporting & analytics',
      'Inventory forecasting',
      'Online payments',
      'API integration',
      'Team collaboration tools',
      'Priority support'
    ],
    isPopular: true,
    isActive: true,
    sortOrder: 2
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large rental operations with multiple outlets',
    basePrice: 399000,
    currency: 'VND',
    limits: {
      outlets: 3,
      users: 15,
      products: 15000,
      customers: 50000,
      orders: 50000
    },
    features: [
      'All Professional features',
      'Multiple outlets',
      'Advanced team management',
      'Custom integrations',
      'Dedicated account manager',
      'Custom reporting',
      'White-label solution',
      '24/7 phone support'
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 3
  }
};

/**
 * Helper function to format currency
 */
function formatCurrency(amount, currency = 'VND') {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Helper function to generate pricing preview
 */
function generatePricingPreview(basePrice) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3,
      discount: 0,
      savings: 0
    },
    semi_annual: {
      price: basePrice * 6 * 0.95,
      discount: 5,
      savings: basePrice * 6 * 0.05
    },
    annual: {
      price: basePrice * 12 * 0.90,
      discount: 10,
      savings: basePrice * 12 * 0.10
    }
  };
}

/**
 * Seed plans from SUBSCRIPTION_PLANS constants
 */
async function seedPlans() {
  console.log('\n🌱 Starting Plan Seeding Process...\n');
  console.log(`Mode: ${forceMode ? 'FORCE (overwrite existing)' : 'UPSERT (update if exists)'}\n`);

  try {
    const planEntries = Object.values(SUBSCRIPTION_PLANS);
    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: []
    };

    for (const planConfig of planEntries) {
      try {
        // Check if plan already exists
        const existingPlan = await prisma.plan.findUnique({
          where: { name: planConfig.name }
        });

        // Prepare plan data
        const planData = {
          name: planConfig.name,
          description: planConfig.description,
          basePrice: planConfig.basePrice,
          currency: planConfig.currency || 'VND',
          trialDays: 14,
          limits: JSON.stringify({
            outlets: planConfig.limits.outlets,
            users: planConfig.limits.users,
            products: planConfig.limits.products,
            customers: planConfig.limits.customers,
            orders: planConfig.limits.orders ?? (planConfig.limits.orders === undefined ? 0 : planConfig.limits.orders) // Use exact value from config
          }),
          features: JSON.stringify(planConfig.features),
          isActive: planConfig.isActive !== undefined ? planConfig.isActive : true,
          isPopular: planConfig.isPopular || false,
          sortOrder: planConfig.sortOrder || 0
        };

        if (existingPlan) {
          if (forceMode) {
            // Force overwrite existing plan
            const updatedPlan = await prisma.plan.update({
              where: { id: existingPlan.id },
              data: planData
            });

            results.updated.push(updatedPlan);
            console.log(`✅ UPDATED: ${updatedPlan.name} (ID: ${updatedPlan.id})`);
            console.log(`   Base Price: ${formatCurrency(updatedPlan.basePrice, updatedPlan.currency)}/month`);
          } else {
            // Update only if data has changed
            const existingLimits = JSON.parse(existingPlan.limits);
            const newLimits = JSON.parse(planData.limits);

            const hasChanges = 
              existingPlan.description !== planData.description ||
              existingPlan.basePrice !== planData.basePrice ||
              existingPlan.currency !== planData.currency ||
              existingPlan.isActive !== planData.isActive ||
              existingPlan.isPopular !== planData.isPopular ||
              existingPlan.sortOrder !== planData.sortOrder ||
              JSON.stringify(existingLimits) !== JSON.stringify(newLimits) ||
              existingPlan.features !== planData.features;

            if (hasChanges) {
              const updatedPlan = await prisma.plan.update({
                where: { id: existingPlan.id },
                data: planData
              });

              results.updated.push(updatedPlan);
              console.log(`✅ UPDATED: ${updatedPlan.name} (ID: ${updatedPlan.id})`);
              console.log(`   Base Price: ${formatCurrency(updatedPlan.basePrice, updatedPlan.currency)}/month`);
            } else {
              results.skipped.push(existingPlan);
              console.log(`⏭️  SKIPPED: ${existingPlan.name} (ID: ${existingPlan.id}) - No changes detected`);
            }
          }
        } else {
          // Create new plan
          const newPlan = await prisma.plan.create({
            data: planData
          });

          results.created.push(newPlan);
          console.log(`✨ CREATED: ${newPlan.name} (ID: ${newPlan.id})`);
          console.log(`   Base Price: ${formatCurrency(newPlan.basePrice, newPlan.currency)}/month`);
        }

        // Display pricing structure for each plan
        const pricing = generatePricingPreview(planConfig.basePrice);
        console.log(`   Pricing Structure:`);
        console.log(`     Monthly:    ${formatCurrency(pricing.monthly.price, planConfig.currency)}/month     (0% off)`);
        console.log(`     Quarterly:  ${formatCurrency(pricing.quarterly.price, planConfig.currency)}/quarter   (5% off, Save ${formatCurrency(pricing.quarterly.savings, planConfig.currency)})`);
        console.log(`     Semi-Annual: ${formatCurrency(pricing.semi_annual.price, planConfig.currency)}/6 months  (10% off, Save ${formatCurrency(pricing.semi_annual.savings, planConfig.currency)})`);
        console.log(`     Annual:     ${formatCurrency(pricing.annual.price, planConfig.currency)}/year      (20% off, Save ${formatCurrency(pricing.annual.savings, planConfig.currency)})`);
        console.log(`   Limits: ${planConfig.limits.outlets} outlets, ${planConfig.limits.users} users, ${planConfig.limits.products} products, ${planConfig.limits.customers} customers, ${planConfig.limits.orders} orders`);
        console.log('');

      } catch (error) {
        console.error(`❌ ERROR processing plan "${planConfig.name}":`, error.message);
        results.errors.push({ plan: planConfig.name, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log('='.repeat(60));
    console.log(`✨ Created: ${results.created.length}`);
    console.log(`✅ Updated: ${results.updated.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(({ plan, error }) => {
        console.log(`  - ${plan}: ${error}`);
      });
    }

    console.log('\n✅ Plan seeding completed!\n');

    return results;

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established\n');

    // Seed plans
    await seedPlans();

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedPlans };

