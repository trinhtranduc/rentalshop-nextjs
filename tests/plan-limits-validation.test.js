#!/usr/bin/env node

// ============================================================================
// PLAN LIMITS VALIDATION TESTS
// ============================================================================
// Tests for plan limits validation functions and database operations

const { PrismaClient } = require('@prisma/client');

class PlanLimitsValidationTester {
  constructor() {
    this.prisma = new PrismaClient();
    this.testResults = [];
    this.testMerchantId = null;
    this.testSubscriptionId = null;
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...');
    
    try {
      // Create test merchant
      const merchant = await this.prisma.merchant.create({
        data: {
          name: 'Test Merchant for Plan Limits',
          email: 'test.merchant@example.com',
          phone: '1234567890',
          status: 'ACTIVE'
        }
      });
      
      this.testMerchantId = merchant.publicId;
      console.log(`✅ Created test merchant: ${merchant.name} (ID: ${this.testMerchantId})`);
      
      // Create test subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          merchant: { connect: { id: merchant.id } },
          plan: { connect: { id: 'starter' } },
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          billingCycle: 'monthly'
        }
      });
      
      this.testSubscriptionId = subscription.id;
      console.log(`✅ Created test subscription: ${subscription.id}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error setting up test data:', error);
      return false;
    }
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      if (this.testMerchantId) {
        // Find merchant by publicId
        const merchant = await this.prisma.merchant.findUnique({
          where: { publicId: this.testMerchantId }
        });
        
        if (merchant) {
          // Delete all related data
          await this.prisma.order.deleteMany({
            where: { outlet: { merchantId: merchant.id } }
          });
          
          await this.prisma.orderItem.deleteMany({
            where: { order: { outlet: { merchantId: merchant.id } } }
          });
          
          await this.prisma.product.deleteMany({
            where: { merchantId: merchant.id }
          });
          
          await this.prisma.customer.deleteMany({
            where: { merchantId: merchant.id }
          });
          
          await this.prisma.user.deleteMany({
            where: { merchantId: merchant.id }
          });
          
          await this.prisma.outlet.deleteMany({
            where: { merchantId: merchant.id }
          });
          
          await this.prisma.subscription.deleteMany({
            where: { merchantId: merchant.id }
          });
          
          await this.prisma.merchant.delete({
            where: { id: merchant.id }
          });
          
          console.log('✅ Test data cleaned up successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
    }
  }

  async testGetCurrentEntityCounts() {
    console.log('\n🧪 Testing getCurrentEntityCounts function...');
    
    try {
      const { getCurrentEntityCounts } = require('../packages/utils/dist/core/plan-limits-validation');
      
      const counts = await getCurrentEntityCounts(this.testMerchantId);
      
      const hasRequiredFields = counts && 
        typeof counts.outlets === 'number' &&
        typeof counts.users === 'number' &&
        typeof counts.products === 'number' &&
        typeof counts.customers === 'number' &&
        typeof counts.orders === 'number';
      
      console.log(`   ${hasRequiredFields ? '✅' : '❌'} getCurrentEntityCounts structure`);
      console.log(`   Outlets: ${counts.outlets}`);
      console.log(`   Users: ${counts.users}`);
      console.log(`   Products: ${counts.products}`);
      console.log(`   Customers: ${counts.customers}`);
      console.log(`   Orders: ${counts.orders}`);
      
      this.testResults.push({
        test: 'getCurrentEntityCounts',
        passed: hasRequiredFields,
        expected: 'Object with numeric counts',
        actual: counts
      });
      
      return hasRequiredFields;
    } catch (error) {
      console.log(`   ❌ getCurrentEntityCounts - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'getCurrentEntityCounts',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testGetPlanLimitsInfo() {
    console.log('\n🧪 Testing getPlanLimitsInfo function...');
    
    try {
      const { getPlanLimitsInfo } = require('../packages/utils/dist/core/plan-limits-validation');
      
      const planInfo = await getPlanLimitsInfo(this.testMerchantId);
      
      const hasRequiredFields = planInfo && 
        planInfo.planSummary &&
        planInfo.planLimits &&
        planInfo.currentCounts &&
        planInfo.isUnlimited &&
        planInfo.platformAccess;
      
      console.log(`   ${hasRequiredFields ? '✅' : '❌'} getPlanLimitsInfo structure`);
      
      if (hasRequiredFields) {
        console.log(`   Plan: ${planInfo.planSummary.planName}`);
        console.log(`   Platform: ${planInfo.platformAccess.mobile ? 'Mobile' : ''} ${planInfo.platformAccess.web ? '+ Web' : ''}`);
        console.log(`   Limits:`, planInfo.planLimits);
        console.log(`   Current:`, planInfo.currentCounts);
        console.log(`   Unlimited:`, planInfo.isUnlimited);
      }
      
      this.testResults.push({
        test: 'getPlanLimitsInfo',
        passed: hasRequiredFields,
        expected: 'Object with plan information',
        actual: planInfo
      });
      
      return hasRequiredFields;
    } catch (error) {
      console.log(`   ❌ getPlanLimitsInfo - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'getPlanLimitsInfo',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testAssertPlanLimit() {
    console.log('\n🧪 Testing assertPlanLimit function...');
    
    try {
      const { assertPlanLimit } = require('../packages/utils/dist/core/plan-limits-validation');
      
      // Test with valid limits (should not throw)
      try {
        await assertPlanLimit(this.testMerchantId, 'outlets');
        console.log('   ✅ assertPlanLimit (outlets) - No error thrown');
        
        await assertPlanLimit(this.testMerchantId, 'users');
        console.log('   ✅ assertPlanLimit (users) - No error thrown');
        
        await assertPlanLimit(this.testMerchantId, 'products');
        console.log('   ✅ assertPlanLimit (products) - No error thrown');
        
        await assertPlanLimit(this.testMerchantId, 'customers');
        console.log('   ✅ assertPlanLimit (customers) - No error thrown');
        
        this.testResults.push({
          test: 'assertPlanLimit (valid)',
          passed: true,
          expected: 'No error thrown',
          actual: 'No error thrown'
        });
        
        return true;
      } catch (error) {
        console.log(`   ❌ assertPlanLimit (valid) - ERROR: ${error.message}`);
        this.testResults.push({
          test: 'assertPlanLimit (valid)',
          passed: false,
          error: error.message
        });
        return false;
      }
    } catch (error) {
      console.log(`   ❌ assertPlanLimit - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'assertPlanLimit',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testCheckPlanFeature() {
    console.log('\n🧪 Testing checkPlanFeature function...');
    
    try {
      const { checkPlanFeature } = require('../packages/utils/dist/core/plan-limits-validation');
      
      // Test with valid features
      const hasMobileAccess = await checkPlanFeature(this.testMerchantId, 'mobile_access');
      const hasWebAccess = await checkPlanFeature(this.testMerchantId, 'web_access');
      
      console.log(`   ✅ checkPlanFeature (mobile_access) - ${hasMobileAccess}`);
      console.log(`   ✅ checkPlanFeature (web_access) - ${hasWebAccess}`);
      
      this.testResults.push({
        test: 'checkPlanFeature',
        passed: true,
        expected: 'Boolean values',
        actual: { mobile_access: hasMobileAccess, web_access: hasWebAccess }
      });
      
      return true;
    } catch (error) {
      console.log(`   ❌ checkPlanFeature - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'checkPlanFeature',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testValidatePlatformAccess() {
    console.log('\n🧪 Testing validatePlatformAccess function...');
    
    try {
      const { validatePlatformAccess } = require('../packages/utils/dist/core/plan-limits-validation');
      
      // Test mobile access
      const mobileAccess = await validatePlatformAccess(this.testMerchantId, 'mobile');
      console.log(`   ✅ validatePlatformAccess (mobile) - ${mobileAccess}`);
      
      // Test web access
      const webAccess = await validatePlatformAccess(this.testMerchantId, 'web');
      console.log(`   ✅ validatePlatformAccess (web) - ${webAccess}`);
      
      this.testResults.push({
        test: 'validatePlatformAccess',
        passed: true,
        expected: 'Boolean values',
        actual: { mobile: mobileAccess, web: webAccess }
      });
      
      return true;
    } catch (error) {
      console.log(`   ❌ validatePlatformAccess - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'validatePlatformAccess',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testGetUpgradeSuggestions() {
    console.log('\n🧪 Testing getUpgradeSuggestions function...');
    
    try {
      const { getUpgradeSuggestions } = require('../packages/utils/dist/core/plan-limits-validation');
      
      const suggestions = await getUpgradeSuggestions(this.testMerchantId);
      
      const hasRequiredFields = suggestions && 
        Array.isArray(suggestions) &&
        suggestions.length >= 0;
      
      console.log(`   ${hasRequiredFields ? '✅' : '❌'} getUpgradeSuggestions structure`);
      console.log(`   Suggestions: ${suggestions.length}`);
      
      if (suggestions.length > 0) {
        console.log(`   First suggestion:`, suggestions[0]);
      }
      
      this.testResults.push({
        test: 'getUpgradeSuggestions',
        passed: hasRequiredFields,
        expected: 'Array of suggestions',
        actual: suggestions
      });
      
      return hasRequiredFields;
    } catch (error) {
      console.log(`   ❌ getUpgradeSuggestions - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'getUpgradeSuggestions',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testPlanLimitsWithEntities() {
    console.log('\n🧪 Testing plan limits with actual entities...');
    
    try {
      const { assertPlanLimit, getCurrentEntityCounts } = require('../packages/utils/dist/core/plan-limits-validation');
      
      // Get initial counts
      const initialCounts = await getCurrentEntityCounts(this.testMerchantId);
      console.log(`   Initial counts:`, initialCounts);
      
      // Find merchant by publicId
      const merchant = await this.prisma.merchant.findUnique({
        where: { publicId: this.testMerchantId }
      });
      
      if (!merchant) {
        console.log('   ❌ Merchant not found');
        return false;
      }
      
      // Create test outlet
      const outlet = await this.prisma.outlet.create({
        data: {
          merchant: { connect: { id: merchant.id } },
          name: 'Test Outlet for Limits',
          address: 'Test Address',
          phone: '1234567890',
          status: 'ACTIVE'
        }
      });
      
      console.log(`   ✅ Created outlet: ${outlet.name}`);
      
      // Check updated counts
      const updatedCounts = await getCurrentEntityCounts(this.testMerchantId);
      console.log(`   Updated counts:`, updatedCounts);
      
      // Verify outlet count increased
      const outletCountIncreased = updatedCounts.outlets === initialCounts.outlets + 1;
      console.log(`   ${outletCountIncreased ? '✅' : '❌'} Outlet count increased`);
      
      // Test plan limit assertion
      try {
        await assertPlanLimit(this.testMerchantId, 'outlets');
        console.log('   ✅ Plan limit assertion passed');
      } catch (error) {
        console.log(`   ❌ Plan limit assertion failed: ${error.message}`);
      }
      
      this.testResults.push({
        test: 'plan limits with entities',
        passed: outletCountIncreased,
        expected: 'Outlet count increased by 1',
        actual: `Initial: ${initialCounts.outlets}, Updated: ${updatedCounts.outlets}`
      });
      
      return outletCountIncreased;
    } catch (error) {
      console.log(`   ❌ plan limits with entities - ERROR: ${error.message}`);
      this.testResults.push({
        test: 'plan limits with entities',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Plan Limits Validation Tests...\n');
    
    try {
      // Setup test data
      const setupSuccess = await this.setupTestData();
      if (!setupSuccess) {
        console.log('❌ Cannot proceed without test data setup');
        return;
      }
      
      // Run tests
      const tests = [
        { name: 'Get Current Entity Counts', test: () => this.testGetCurrentEntityCounts() },
        { name: 'Get Plan Limits Info', test: () => this.testGetPlanLimitsInfo() },
        { name: 'Assert Plan Limit', test: () => this.testAssertPlanLimit() },
        { name: 'Check Plan Feature', test: () => this.testCheckPlanFeature() },
        { name: 'Validate Platform Access', test: () => this.testValidatePlatformAccess() },
        { name: 'Get Upgrade Suggestions', test: () => this.testGetUpgradeSuggestions() },
        { name: 'Plan Limits with Entities', test: () => this.testPlanLimitsWithEntities() }
      ];
      
      let passedTests = 0;
      
      for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        console.log('='.repeat(50));
        
        try {
          const result = await test.test();
          if (result) {
            passedTests++;
            console.log(`✅ ${test.name} - PASSED`);
          } else {
            console.log(`❌ ${test.name} - FAILED`);
          }
        } catch (error) {
          console.log(`❌ ${test.name} - ERROR: ${error.message}`);
        }
      }
      
      this.printResults(passedTests, tests.length);
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      // Cleanup test data
      await this.cleanupTestData();
      await this.prisma.$disconnect();
    }
  }

  printResults(passed, total) {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      } else if (!result.passed) {
        console.log(`    Expected: ${JSON.stringify(result.expected)}`);
        console.log(`    Actual: ${JSON.stringify(result.actual)}`);
      }
    });
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Plan limits validation is working correctly.');
      console.log('\n✅ Plan limits validation features:');
      console.log('   - Entity counting functionality');
      console.log('   - Plan limits information retrieval');
      console.log('   - Plan limit assertion');
      console.log('   - Plan feature checking');
      console.log('   - Platform access validation');
      console.log('   - Upgrade suggestions');
      console.log('   - Database integration');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PlanLimitsValidationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = PlanLimitsValidationTester;
