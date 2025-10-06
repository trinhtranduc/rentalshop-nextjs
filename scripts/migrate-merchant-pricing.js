#!/usr/bin/env node

/**
 * Merchant Pricing Migration Script
 * 
 * This script migrates existing merchants to use the new pricing configuration system.
 * It adds default pricing configurations based on each merchant's business type.
 */

const { PrismaClient } = require('@prisma/client');
const { BUSINESS_TYPE_DEFAULTS } = require('../packages/constants/dist/index.js');

const prisma = new PrismaClient();

// Helper function to get default pricing config based on business type
function getDefaultPricingConfig(businessType) {
  // Map common business type strings to our enum values
  const businessTypeMap = {
    'Vehicle Rental': 'VEHICLE',
    'Equipment Rental': 'EQUIPMENT',
    'Clothing Rental': 'CLOTHING',
    'General Rental': 'GENERAL',
    'VEHICLE': 'VEHICLE',
    'EQUIPMENT': 'EQUIPMENT', 
    'CLOTHING': 'CLOTHING',
    'GENERAL': 'GENERAL',
    'null': 'GENERAL',
    'undefined': 'GENERAL'
  };

  const mappedType = businessTypeMap[businessType] || 'GENERAL';
  return BUSINESS_TYPE_DEFAULTS[mappedType];
}

// Helper function to determine business type from merchant data
function determineBusinessType(merchant) {
  // If businessType is already set and valid, use it
  if (merchant.businessType && ['VEHICLE', 'EQUIPMENT', 'CLOTHING', 'GENERAL'].includes(merchant.businessType)) {
    return merchant.businessType;
  }

  // Try to infer from merchant name or description
  const name = (merchant.name || '').toLowerCase();
  const description = (merchant.description || '').toLowerCase();
  const combined = `${name} ${description}`;

  if (combined.includes('vehicle') || combined.includes('car') || combined.includes('bike') || combined.includes('motorcycle')) {
    return 'VEHICLE';
  }
  
  if (combined.includes('equipment') || combined.includes('tool') || combined.includes('machine') || combined.includes('construction')) {
    return 'EQUIPMENT';
  }
  
  if (combined.includes('clothing') || combined.includes('dress') || combined.includes('suit') || combined.includes('costume')) {
    return 'CLOTHING';
  }

  // Default to GENERAL
  return 'GENERAL';
}

async function migrateMerchantPricing() {
  console.log('🚀 Starting Merchant Pricing Migration...\n');

  try {
    // Get all merchants that need pricing configuration
    const merchants = await prisma.merchant.findMany({
      where: {
        OR: [
          { pricingConfig: null },
          { pricingConfig: '' },
          { pricingConfig: '{}' },
          { pricingConfig: 'null' }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessType: true,
        description: true,
        pricingConfig: true
      }
    });

    console.log(`📊 Found ${merchants.length} merchants that need pricing configuration\n`);

    if (merchants.length === 0) {
      console.log('✅ All merchants already have pricing configuration!');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each merchant
    for (const merchant of merchants) {
      try {
        console.log(`🔄 Processing merchant ${merchant.id}: ${merchant.name} (${merchant.email})`);
        
        // Determine business type
        const businessType = determineBusinessType(merchant);
        console.log(`   📋 Determined business type: ${businessType}`);
        
        // Get default pricing configuration
        const pricingConfig = getDefaultPricingConfig(businessType);
        console.log(`   ⚙️  Using pricing config:`, {
          pricingType: pricingConfig.defaultPricingType,
          requireRentalDates: pricingConfig.businessRules.requireRentalDates,
          showPricingOptions: pricingConfig.businessRules.showPricingOptions
        });

        // Update merchant with pricing configuration
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            businessType: businessType,
            pricingConfig: JSON.stringify(pricingConfig)
          }
        });

        console.log(`   ✅ Successfully migrated merchant ${merchant.id}\n`);
        migrated++;

      } catch (error) {
        console.error(`   ❌ Error migrating merchant ${merchant.id}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated} merchants`);
    console.log(`   ⏭️  Skipped: ${skipped} merchants`);
    console.log(`   ❌ Errors: ${errors} merchants`);
    console.log(`   📈 Total processed: ${migrated + skipped + errors} merchants`);

    if (errors === 0) {
      console.log('\n🎉 All merchants successfully migrated to new pricing system!');
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} errors. Please review and fix manually.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateMigration() {
  console.log('\n🔍 Validating Migration Results...\n');

  try {
    // Check merchants without pricing config
    const merchantsWithoutConfig = await prisma.merchant.count({
      where: {
        OR: [
          { pricingConfig: null },
          { pricingConfig: '' },
          { pricingConfig: '{}' },
          { pricingConfig: 'null' }
        ]
      }
    });

    console.log(`📊 Merchants without pricing config: ${merchantsWithoutConfig}`);

    // Check merchants with pricing config
    const merchantsWithConfig = await prisma.merchant.count({
      where: {
        AND: [
          { pricingConfig: { not: null } },
          { pricingConfig: { not: '' } },
          { pricingConfig: { not: '{}' } },
          { pricingConfig: { not: 'null' } }
        ]
      }
    });

    console.log(`📊 Merchants with pricing config: ${merchantsWithConfig}`);

    // Sample a few merchants to verify configuration
    const sampleMerchants = await prisma.merchant.findMany({
      where: {
        AND: [
          { pricingConfig: { not: null } },
          { pricingConfig: { not: '' } },
          { pricingConfig: { not: '{}' } },
          { pricingConfig: { not: 'null' } }
        ]
      },
      select: {
        id: true,
        name: true,
        businessType: true,
        pricingConfig: true
      },
      take: 5
    });

    console.log('\n📋 Sample migrated merchants:');
    sampleMerchants.forEach(merchant => {
      try {
        const config = JSON.parse(merchant.pricingConfig);
        console.log(`   ${merchant.id}: ${merchant.name} (${merchant.businessType})`);
        console.log(`      Pricing Type: ${config.defaultPricingType}`);
        console.log(`      Business Rules: requireRentalDates=${config.businessRules.requireRentalDates}, showPricingOptions=${config.businessRules.showPricingOptions}`);
        console.log(`      Duration Limits: min=${config.durationLimits.minDuration}, max=${config.durationLimits.maxDuration}`);
      } catch (error) {
        console.log(`   ${merchant.id}: ${merchant.name} - ERROR parsing config: ${error.message}`);
      }
    });

    if (merchantsWithoutConfig === 0) {
      console.log('\n✅ Validation successful: All merchants have pricing configuration!');
    } else {
      console.log(`\n⚠️  Validation warning: ${merchantsWithoutConfig} merchants still need pricing configuration`);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

async function rollbackMigration() {
  console.log('🔄 Rolling back merchant pricing migration...\n');

  try {
    // Remove pricing configurations from all merchants
    const result = await prisma.merchant.updateMany({
      data: {
        pricingConfig: null,
        businessType: null
      }
    });

    console.log(`✅ Rolled back pricing configuration for ${result.count} merchants`);
    console.log('⚠️  Note: This removes all pricing configurations. Run migration again to restore.');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await migrateMerchantPricing();
      break;
    case 'validate':
      await validateMigration();
      break;
    case 'rollback':
      await rollbackMigration();
      break;
    default:
      console.log('🔧 Merchant Pricing Migration Script');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/migrate-merchant-pricing.js migrate   - Run the migration');
      console.log('  node scripts/migrate-merchant-pricing.js validate  - Validate migration results');
      console.log('  node scripts/migrate-merchant-pricing.js rollback  - Rollback migration');
      console.log('');
      console.log('Examples:');
      console.log('  yarn db:migrate-pricing');
      console.log('  yarn db:validate-pricing');
      console.log('  yarn db:rollback-pricing');
      break;
  }
}

// Run the script
main().catch(console.error);
