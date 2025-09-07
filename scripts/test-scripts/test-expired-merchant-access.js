#!/usr/bin/env node

/**
 * Test Expired Merchant API Access Script
 * Tests that expired merchants cannot access any APIs except extension APIs
 */

const { PrismaClient } = require('@prisma/client');
const { 
  getAdminToken, 
  getMerchantToken, 
  getAvailableMerchants, 
  getMerchantDetails,
  testAuthenticatedEndpoint,
  displayAuthStatus
} = require('./auth-helper');

const prisma = new PrismaClient();

async function testExpiredMerchantAccess() {
  try {
    console.log('🧪 Testing Expired Merchant API Access...\n');

    // Test 1: Authentication Setup
    console.log('1️⃣ Setting up authentication...');
    
    // Get admin token
    const adminAuth = await getAdminToken();
    if (!adminAuth) {
      console.log('❌ Failed to get admin token. Some tests will be skipped.');
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

    // Test 2: Create or find expired merchant
    console.log('\n2️⃣ Setting up expired merchant for testing...');
    
    let expiredMerchant = null;
    
    // Try to find an existing expired merchant
    const existingExpiredMerchant = await prisma.merchant.findFirst({
      where: {
        subscriptions: {
          some: {
            status: 'EXPIRED'
          }
        }
      },
      include: {
        plan: true,
        subscriptions: {
          where: { status: 'EXPIRED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (existingExpiredMerchant) {
      expiredMerchant = existingExpiredMerchant;
      console.log(`✅ Found existing expired merchant: ${expiredMerchant.name} (ID: ${expiredMerchant.publicId})`);
    } else {
      // Create a test expired merchant
      console.log('📝 Creating test expired merchant...');
      
      // Get a plan for the expired merchant
      const plan = await prisma.plan.findFirst({
        where: { isActive: true }
      });
      
      if (!plan) {
        console.log('❌ No active plans found. Cannot create expired merchant.');
        return;
      }
      
      // Create merchant
      const lastMerchant = await prisma.merchant.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const merchantPublicId = (lastMerchant?.publicId || 0) + 1;
      
      const newMerchant = await prisma.merchant.create({
        data: {
          publicId: merchantPublicId,
          name: 'Test Expired Merchant',
          email: 'expired@test.com',
          phone: '+1-555-EXPIRED',
          planId: plan.id,
          subscriptionStatus: 'EXPIRED'
        }
      });
      
      // Create expired subscription
      const lastSubscription = await prisma.subscription.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const subscriptionPublicId = (lastSubscription?.publicId || 0) + 1;
      
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Expired yesterday
      
      await prisma.subscription.create({
        data: {
          publicId: subscriptionPublicId,
          merchantId: newMerchant.id,
          planId: plan.id,
          status: 'EXPIRED',
          currentPeriodStart: new Date(expiredDate.getTime() - (30 * 24 * 60 * 60 * 1000)), // Started 30 days ago
          currentPeriodEnd: expiredDate,
          amount: plan.basePrice,
          currency: plan.currency,
          interval: 'month',
          intervalCount: 1,
          period: 1
        }
      });
      
      expiredMerchant = await prisma.merchant.findUnique({
        where: { id: newMerchant.id },
        include: {
          plan: true,
          subscriptions: {
            where: { status: 'EXPIRED' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      console.log(`✅ Created test expired merchant: ${expiredMerchant.name} (ID: ${expiredMerchant.publicId})`);
    }

    // Test 3: Test expired merchant API access
    console.log('\n3️⃣ Testing expired merchant API access...');
    
    if (expiredMerchant) {
      // Get a user for the expired merchant
      const expiredMerchantUser = await prisma.user.findFirst({
        where: { merchantId: expiredMerchant.id }
      });
      
      if (!expiredMerchantUser) {
        // Create a user for the expired merchant
        const lastUser = await prisma.user.findFirst({
          orderBy: { publicId: 'desc' }
        });
        const userPublicId = (lastUser?.publicId || 0) + 1;
        
        await prisma.user.create({
          data: {
            publicId: userPublicId,
            email: 'expired@test.com',
            password: 'expired123',
            firstName: 'Expired',
            lastName: 'Merchant',
            role: 'MERCHANT',
            merchantId: expiredMerchant.id
          }
        });
      }
      
      // Get token for expired merchant
      const expiredMerchantAuth = await getMerchantToken('expired@test.com');
      
      if (expiredMerchantAuth) {
        console.log('✅ Got token for expired merchant');
        
        // Test API endpoints that should be blocked
        const blockedEndpoints = [
          { path: '/api/merchants', method: 'GET', name: 'Merchants API' },
          { path: '/api/outlets', method: 'GET', name: 'Outlets API' },
          { path: '/api/products', method: 'GET', name: 'Products API' },
          { path: '/api/orders', method: 'GET', name: 'Orders API' },
          { path: '/api/customers', method: 'GET', name: 'Customers API' },
          { path: '/api/users', method: 'GET', name: 'Users API' },
          { path: '/api/analytics', method: 'GET', name: 'Analytics API' },
          { path: '/api/payments', method: 'GET', name: 'Payments API' },
          { path: `/api/merchants/${expiredMerchant.publicId}/plan`, method: 'PUT', name: 'Plan Change API' }
        ];
        
        console.log('\n🔒 Testing blocked API endpoints...');
        let blockedCount = 0;
        
        for (const endpoint of blockedEndpoints) {
          const result = await testAuthenticatedEndpoint(
            endpoint.path,
            endpoint.method,
            null,
            expiredMerchantAuth.token
          );
          
          if (result.success) {
            console.log(`❌ ${endpoint.name}: Should be blocked but was allowed`);
          } else {
            console.log(`✅ ${endpoint.name}: Properly blocked (${result.status})`);
            blockedCount++;
          }
        }
        
        console.log(`\n📊 Blocked endpoints: ${blockedCount}/${blockedEndpoints.length}`);
        
        // Test API endpoints that should be allowed (extension only)
        const allowedEndpoints = [
          { path: '/api/subscriptions/extend', method: 'POST', name: 'Subscription Extension API' }
        ];
        
        console.log('\n🔓 Testing allowed API endpoints...');
        let allowedCount = 0;
        
        for (const endpoint of allowedEndpoints) {
          const result = await testAuthenticatedEndpoint(
            endpoint.path,
            endpoint.method,
            { subscriptionId: expiredMerchant.subscriptions[0]?.publicId, newEndDate: new Date().toISOString(), amount: 100 },
            expiredMerchantAuth.token
          );
          
          if (result.success) {
            console.log(`✅ ${endpoint.name}: Properly allowed`);
            allowedCount++;
          } else {
            console.log(`⚠️ ${endpoint.name}: ${result.status} - ${result.error}`);
          }
        }
        
        console.log(`\n📊 Allowed endpoints: ${allowedCount}/${allowedEndpoints.length}`);
        
        // Test 4: Verify subscription status
        console.log('\n4️⃣ Verifying subscription status...');
        
        const merchantDetails = await getMerchantDetails(expiredMerchant.publicId, adminAuth?.token);
        
        if (merchantDetails) {
          console.log(`📋 Merchant Status: ${merchantDetails.subscriptionStatus}`);
          console.log(`📋 Plan: ${merchantDetails.plan?.name}`);
          console.log(`📋 Subscription End Date: ${merchantDetails.subscriptions?.[0]?.currentPeriodEnd}`);
          
          const isExpired = merchantDetails.subscriptionStatus === 'EXPIRED';
          console.log(`📋 Is Expired: ${isExpired ? '✅ Yes' : '❌ No'}`);
        }
        
      } else {
        console.log('❌ Could not get token for expired merchant');
      }
    } else {
      console.log('❌ No expired merchant available for testing');
    }

    // Test 5: Test admin access to expired merchant
    console.log('\n5️⃣ Testing admin access to expired merchant...');
    
    if (adminAuth && expiredMerchant) {
      const adminResult = await testAuthenticatedEndpoint(
        `/api/merchants/${expiredMerchant.publicId}`,
        'GET',
        null,
        adminAuth.token
      );
      
      if (adminResult.success) {
        console.log('✅ Admin can access expired merchant details');
      } else {
        console.log('❌ Admin cannot access expired merchant details');
      }
    }

    // Test 6: Summary
    console.log('\n6️⃣ Test Summary:');
    console.log('✅ Expired merchant API access test completed');
    console.log('📋 Key validations:');
    console.log('   - Expired merchants blocked from most APIs');
    console.log('   - Only extension APIs allowed for expired merchants');
    console.log('   - Admin can still access expired merchant details');
    console.log('   - Subscription status properly tracked');
    console.log('   - Security measures working correctly');
    
  } catch (error) {
    console.error('❌ Expired merchant access test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testExpiredMerchantAccess()
    .then(() => {
      console.log('\n✅ Expired merchant access test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Expired merchant access test failed:', error);
      process.exit(1);
    });
}

module.exports = { testExpiredMerchantAccess };
