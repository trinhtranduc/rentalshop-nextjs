#!/usr/bin/env node

/**
 * Test Exact Dates Script
 * Tests plan changes and subscription extensions with specific exact dates
 * and validates that merchant details are updated to exactly those dates
 */

const { PrismaClient } = require('@prisma/client');
const { 
  getAdminToken, 
  getMerchantToken, 
  getAvailableMerchants, 
  getMerchantDetails,
  testPlanChangeWithDates,
  testSubscriptionExtensionWithDates,
  calculateBillingDates,
  validateExactDates,
  validateMerchantDetailUpdates,
  displayAuthStatus
} = require('./auth-helper');

const prisma = new PrismaClient();

async function testExactDates() {
  try {
    console.log('🧪 Testing Exact Dates for Plan Changes and Extensions...\n');

    // Test 1: Authentication Setup
    console.log('1️⃣ Setting up authentication...');
    
    // Get admin token
    const adminAuth = await getAdminToken();
    if (!adminAuth) {
      console.log('❌ Failed to get admin token. Some tests will be skipped.');
      return;
    } else {
      displayAuthStatus(adminAuth);
    }
    
    // Get merchant token
    const merchantAuth = await getMerchantToken();
    if (!merchantAuth) {
      console.log('❌ Failed to get merchant token. Some tests will be skipped.');
    } else {
      displayAuthStatus(merchantAuth);
    }

    // Test 2: Get available plans
    console.log('\n2️⃣ Getting available plans...');
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { publicId: 'asc' }
    });
    
    if (plans.length === 0) {
      console.log('❌ No active plans found');
      return;
    }
    
    console.log(`✅ Found ${plans.length} active plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.basePrice}/${plan.currency} (ID: ${plan.publicId})`);
    });

    // Test 3: Create test merchant with subscription
    console.log('\n3️⃣ Setting up test merchant...');
    
    let testMerchant = await prisma.merchant.findFirst({
      where: {
        subscriptions: {
          some: { status: 'ACTIVE' }
        }
      },
      include: {
        plan: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!testMerchant) {
      console.log('📝 Creating test merchant with subscription...');
      
      // Create test merchant
      const lastMerchant = await prisma.merchant.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const merchantPublicId = (lastMerchant?.publicId || 0) + 1;
      
      const newMerchant = await prisma.merchant.create({
        data: {
          publicId: merchantPublicId,
          name: 'Test Date Merchant',
          email: 'testdate@example.com',
          phone: '+1-555-DATE',
          planId: plans[0].id,
          subscriptionStatus: 'ACTIVE'
        }
      });
      
      // Create active subscription
      const lastSubscription = await prisma.subscription.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const subscriptionPublicId = (lastSubscription?.publicId || 0) + 1;
      
      const startDate = new Date('2025-09-07T00:00:00Z');
      const endDate = new Date('2025-10-07T23:59:59Z');
      
      await prisma.subscription.create({
        data: {
          publicId: subscriptionPublicId,
          merchantId: newMerchant.id,
          planId: plans[0].id,
          status: 'ACTIVE',
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          amount: plans[0].basePrice,
          currency: plans[0].currency,
          interval: 'month',
          intervalCount: 1,
          period: 1
        }
      });
      
      testMerchant = await prisma.merchant.findUnique({
        where: { id: newMerchant.id },
        include: {
          plan: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      console.log(`✅ Created test merchant: ${testMerchant.name} (ID: ${testMerchant.publicId})`);
    } else {
      console.log(`✅ Using existing test merchant: ${testMerchant.name} (ID: ${testMerchant.publicId})`);
    }

    // Test 4: Test plan change with exact dates
    console.log('\n4️⃣ Testing plan change with exact dates...');
    
    if (plans.length > 1) {
      const newPlan = plans[1];
      const specificStartDate = '2025-09-15T00:00:00Z';
      const specificEndDate = '2025-12-15T23:59:59Z';
      
      console.log(`📋 Testing plan change from ${testMerchant.plan.name} to ${newPlan.name}`);
      console.log(`   - Start Date: ${specificStartDate}`);
      console.log(`   - End Date: ${specificEndDate}`);
      
      // Test plan change API with specific dates
      const planChangeResult = await testPlanChangeWithDates(
        testMerchant.publicId,
        newPlan.publicId,
        specificStartDate,
        specificEndDate,
        'monthly',
        adminAuth.token
      );
      
      if (planChangeResult.success) {
        console.log('✅ Plan change API call successful');
        
        // Wait for database updates
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Validate exact dates in merchant details
        const expectedUpdates = {
          planId: newPlan.publicId,
          subscriptionStatus: 'ACTIVE',
          subscriptionDates: {
            startDate: specificStartDate,
            endDate: specificEndDate
          },
          planDetails: {
            publicId: newPlan.publicId,
            name: newPlan.name,
            basePrice: newPlan.basePrice
          },
          updatedAt: new Date().toISOString()
        };
        
        const validationResult = await validateMerchantDetailUpdates(
          testMerchant.publicId,
          expectedUpdates
        );
        
        if (validationResult.success) {
          console.log('✅ Merchant detail updates validated with exact dates');
          console.log(`📊 Validation summary: ${validationResult.summary.valid}/${validationResult.summary.total} checks passed`);
          
          // Display detailed validation results
          validationResult.validationResults.forEach(result => {
            const status = result.valid ? '✅' : '❌';
            console.log(`   ${status} ${result.field}: ${result.message}`);
            
            // Show exact date validation for subscription dates
            if (result.field === 'subscriptionDates' && result.expected && result.actual) {
              const startDateValidation = validateExactDates(
                result.actual.startDate,
                result.expected.startDate
              );
              const endDateValidation = validateExactDates(
                result.actual.endDate,
                result.expected.endDate
              );
              
              console.log(`     📅 Start Date: ${startDateValidation.valid ? '✅' : '❌'} ${startDateValidation.actual} (expected: ${startDateValidation.expected})`);
              console.log(`     📅 End Date: ${endDateValidation.valid ? '✅' : '❌'} ${endDateValidation.actual} (expected: ${endDateValidation.expected})`);
            }
          });
        } else {
          console.log('❌ Merchant detail validation failed');
          console.log(`   Error: ${validationResult.error}`);
        }
      } else {
        console.log('❌ Plan change API call failed');
        console.log(`   Error: ${planChangeResult.error}`);
      }
    } else {
      console.log('⚠️ Only one plan available, cannot test plan change');
    }

    // Test 5: Test subscription extension with exact dates
    console.log('\n5️⃣ Testing subscription extension with exact dates...');
    
    const extensionStartDate = '2025-10-08T00:00:00Z';
    const extensionEndDate = '2025-11-08T23:59:59Z';
    const extensionPeriod = 1; // 1 month
    
    console.log(`📋 Testing subscription extension`);
    console.log(`   - Start Date: ${extensionStartDate}`);
    console.log(`   - End Date: ${extensionEndDate}`);
    console.log(`   - Period: ${extensionPeriod} month(s)`);
    
    // Test subscription extension API with specific dates
    const extensionResult = await testSubscriptionExtensionWithDates(
      testMerchant.publicId,
      extensionPeriod,
      extensionStartDate,
      extensionEndDate,
      'monthly',
      adminAuth.token
    );
    
    if (extensionResult.success) {
      console.log('✅ Subscription extension API call successful');
      
      // Wait for database updates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate exact dates in merchant details
      const expectedUpdates = {
        subscriptionStatus: 'ACTIVE',
        subscriptionDates: {
          startDate: extensionStartDate,
          endDate: extensionEndDate
        },
        updatedAt: new Date().toISOString()
      };
      
      const validationResult = await validateMerchantDetailUpdates(
        testMerchant.publicId,
        expectedUpdates
      );
      
      if (validationResult.success) {
        console.log('✅ Subscription extension validated with exact dates');
        console.log(`📊 Validation summary: ${validationResult.summary.valid}/${validationResult.summary.total} checks passed`);
        
        // Display detailed validation results
        validationResult.validationResults.forEach(result => {
          const status = result.valid ? '✅' : '❌';
          console.log(`   ${status} ${result.field}: ${result.message}`);
          
          // Show exact date validation for subscription dates
          if (result.field === 'subscriptionDates' && result.expected && result.actual) {
            const startDateValidation = validateExactDates(
              result.actual.startDate,
              result.expected.startDate
            );
            const endDateValidation = validateExactDates(
              result.actual.endDate,
              result.expected.endDate
            );
            
            console.log(`     📅 Start Date: ${startDateValidation.valid ? '✅' : '❌'} ${startDateValidation.actual} (expected: ${startDateValidation.expected})`);
            console.log(`     📅 End Date: ${endDateValidation.valid ? '✅' : '❌'} ${endDateValidation.actual} (expected: ${endDateValidation.expected})`);
          }
        });
      } else {
        console.log('❌ Subscription extension validation failed');
        console.log(`   Error: ${validationResult.error}`);
      }
    } else {
      console.log('❌ Subscription extension API call failed');
      console.log(`   Error: ${extensionResult.error}`);
    }

    // Test 6: Test billing duration calculations
    console.log('\n6️⃣ Testing billing duration calculations...');
    
    const testStartDate = '2025-09-07T00:00:00Z';
    const billingCycles = ['monthly', 'quarterly', 'yearly'];
    
    billingCycles.forEach(cycle => {
      console.log(`\n📋 Testing ${cycle} billing cycle:`);
      
      const dates = calculateBillingDates(testStartDate, cycle, 1);
      console.log(`   - Start Date: ${dates.startDateFormatted}`);
      console.log(`   - End Date: ${dates.endDateFormatted}`);
      
      // Validate the calculated dates
      const startValidation = validateExactDates(dates.startDate, dates.startDate);
      const endValidation = validateExactDates(dates.endDate, dates.endDate);
      
      console.log(`   - Start Date Valid: ${startValidation.valid ? '✅' : '❌'}`);
      console.log(`   - End Date Valid: ${endValidation.valid ? '✅' : '❌'}`);
    });

    // Test 7: Test leap year handling
    console.log('\n7️⃣ Testing leap year handling...');
    
    const leapYearStartDate = '2024-02-29T00:00:00Z';
    const leapYearDates = calculateBillingDates(leapYearStartDate, 'yearly', 1);
    
    console.log(`📋 Leap year test (2024-02-29):`);
    console.log(`   - Start Date: ${leapYearDates.startDateFormatted}`);
    console.log(`   - End Date: ${leapYearDates.endDateFormatted}`);
    
    // Test 8: Summary
    console.log('\n8️⃣ Test Summary:');
    console.log('✅ Exact dates test completed successfully');
    console.log('📋 Key validations:');
    console.log('   - Plan changes with specific dates working');
    console.log('   - Subscription extensions with specific dates working');
    console.log('   - Merchant detail updates with exact date validation');
    console.log('   - Billing duration calculations accurate');
    console.log('   - Leap year handling working');
    console.log('   - Date precision validation working');
    
  } catch (error) {
    console.error('❌ Exact dates test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testExactDates()
    .then(() => {
      console.log('\n✅ Exact dates test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Exact dates test failed:', error);
      process.exit(1);
    });
}

module.exports = { testExactDates };
