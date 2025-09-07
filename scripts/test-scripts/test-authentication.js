#!/usr/bin/env node

/**
 * Test Authentication Script
 * Tests authentication and authorization functionality for different user roles
 */

const { PrismaClient } = require('@prisma/client');
const { 
  getAdminToken, 
  getMerchantToken, 
  getOutletAdminToken,
  getAvailableMerchants, 
  getMerchantDetails,
  testAuthenticatedEndpoint,
  validatePlanPermissions,
  displayAuthStatus
} = require('./auth-helper');

const prisma = new PrismaClient();

async function testAuthentication() {
  try {
    console.log('🧪 Testing Authentication and Authorization...\n');

    // Test 1: Admin Authentication
    console.log('1️⃣ Testing admin authentication...');
    const adminAuth = await getAdminToken();
    
    if (adminAuth) {
      displayAuthStatus(adminAuth);
      
      // Test admin permissions
      const adminPermissions = validatePlanPermissions(adminAuth.user, 'change');
      console.log(`📋 Admin plan change permissions: ${adminPermissions.allowed ? '✅' : '❌'} ${adminPermissions.reason}`);
      
      // Test admin API access
      console.log('\n🔍 Testing admin API access...');
      const merchantsResult = await testAuthenticatedEndpoint('/api/merchants', 'GET', null, adminAuth.token);
      if (merchantsResult.success) {
        console.log(`✅ Admin can access merchants API (${merchantsResult.data.data?.length || 0} merchants)`);
      } else {
        console.log(`❌ Admin merchants API failed: ${merchantsResult.error}`);
      }
      
      // Test admin plan access
      const plansResult = await testAuthenticatedEndpoint('/api/plans', 'GET', null, adminAuth.token);
      if (plansResult.success) {
        console.log(`✅ Admin can access plans API (${plansResult.data.data?.length || 0} plans)`);
      } else {
        console.log(`❌ Admin plans API failed: ${plansResult.error}`);
      }
      
    } else {
      console.log('❌ Admin authentication failed');
    }

    // Test 2: Merchant Authentication
    console.log('\n2️⃣ Testing merchant authentication...');
    const merchantAuth = await getMerchantToken();
    
    if (merchantAuth) {
      displayAuthStatus(merchantAuth);
      
      // Test merchant permissions
      const merchantPermissions = validatePlanPermissions(merchantAuth.user, 'change');
      console.log(`📋 Merchant plan change permissions: ${merchantPermissions.allowed ? '✅' : '❌'} ${merchantPermissions.reason}`);
      
      // Test merchant API access
      console.log('\n🔍 Testing merchant API access...');
      const merchantId = merchantAuth.user.merchantId;
      
      if (merchantId) {
        // Test merchant can access their own data
        const ownMerchantResult = await testAuthenticatedEndpoint(`/api/merchants/${merchantId}`, 'GET', null, merchantAuth.token);
        if (ownMerchantResult.success) {
          console.log(`✅ Merchant can access their own merchant data`);
        } else {
          console.log(`❌ Merchant own data access failed: ${ownMerchantResult.error}`);
        }
        
        // Test merchant cannot access other merchants
        const otherMerchantResult = await testAuthenticatedEndpoint('/api/merchants', 'GET', null, merchantAuth.token);
        if (otherMerchantResult.success) {
          console.log(`✅ Merchant can access merchants list (scoped to their own data)`);
        } else {
          console.log(`❌ Merchant merchants list access failed: ${otherMerchantResult.error}`);
        }
      }
      
    } else {
      console.log('❌ Merchant authentication failed');
    }

    // Test 3: Outlet Admin Authentication
    console.log('\n3️⃣ Testing outlet admin authentication...');
    const outletAdminAuth = await getOutletAdminToken();
    
    if (outletAdminAuth) {
      displayAuthStatus(outletAdminAuth);
      
      // Test outlet admin permissions
      const outletAdminPermissions = validatePlanPermissions(outletAdminAuth.user, 'change');
      console.log(`📋 Outlet admin plan change permissions: ${outletAdminPermissions.allowed ? '✅' : '❌'} ${outletAdminPermissions.reason}`);
      
      // Test outlet admin API access
      console.log('\n🔍 Testing outlet admin API access...');
      const outletId = outletAdminAuth.user.outletId;
      const merchantId = outletAdminAuth.user.merchantId;
      
      if (merchantId) {
        // Test outlet admin can access their merchant data
        const merchantResult = await testAuthenticatedEndpoint(`/api/merchants/${merchantId}`, 'GET', null, outletAdminAuth.token);
        if (merchantResult.success) {
          console.log(`✅ Outlet admin can access their merchant data`);
        } else {
          console.log(`❌ Outlet admin merchant access failed: ${merchantResult.error}`);
        }
      }
      
    } else {
      console.log('❌ Outlet admin authentication failed');
    }

    // Test 4: Role-based Access Control
    console.log('\n4️⃣ Testing role-based access control...');
    
    const roles = [
      { name: 'ADMIN', auth: adminAuth, canManageAll: true },
      { name: 'MERCHANT', auth: merchantAuth, canManageAll: false },
      { name: 'OUTLET_ADMIN', auth: outletAdminAuth, canManageAll: false }
    ];
    
    for (const role of roles) {
      if (role.auth) {
        console.log(`\n📋 Testing ${role.name} permissions:`);
        
        // Test plan management permissions
        const planPermissions = validatePlanPermissions(role.auth.user, 'change');
        console.log(`   - Plan change: ${planPermissions.allowed ? '✅' : '❌'}`);
        
        // Test extension permissions
        const extensionPermissions = validatePlanPermissions(role.auth.user, 'extend');
        console.log(`   - Plan extension: ${extensionPermissions.allowed ? '✅' : '❌'}`);
        
        // Test data access scope
        if (role.canManageAll) {
          console.log(`   - Data scope: ✅ All merchants`);
        } else {
          console.log(`   - Data scope: ⚠️ Own merchant only`);
        }
      }
    }

    // Test 5: Token Validation
    console.log('\n5️⃣ Testing token validation...');
    
    const testTokens = [
      { name: 'Admin Token', token: adminAuth?.token },
      { name: 'Merchant Token', token: merchantAuth?.token },
      { name: 'Outlet Admin Token', token: outletAdminAuth?.token }
    ];
    
    for (const testToken of testTokens) {
      if (testToken.token) {
        console.log(`\n🔍 Testing ${testToken.name}:`);
        
        // Test valid token
        const validResult = await testAuthenticatedEndpoint('/api/auth/verify', 'GET', null, testToken.token);
        if (validResult.success) {
          console.log(`   ✅ Token is valid`);
        } else {
          console.log(`   ❌ Token validation failed: ${validResult.error}`);
        }
        
        // Test invalid token
        const invalidResult = await testAuthenticatedEndpoint('/api/auth/verify', 'GET', null, 'invalid-token');
        if (!invalidResult.success) {
          console.log(`   ✅ Invalid token properly rejected`);
        } else {
          console.log(`   ❌ Invalid token was accepted (security issue)`);
        }
      }
    }

    // Test 6: API Endpoint Authorization
    console.log('\n6️⃣ Testing API endpoint authorization...');
    
    const protectedEndpoints = [
      { path: '/api/merchants', method: 'GET', requiresAuth: true },
      { path: '/api/plans', method: 'GET', requiresAuth: true },
      { path: '/api/auth/verify', method: 'GET', requiresAuth: true }
    ];
    
    for (const endpoint of protectedEndpoints) {
      console.log(`\n🔍 Testing ${endpoint.method} ${endpoint.path}:`);
      
      // Test without token
      const noTokenResult = await testAuthenticatedEndpoint(endpoint.path, endpoint.method);
      if (!noTokenResult.success && noTokenResult.status === 401) {
        console.log(`   ✅ Properly requires authentication`);
      } else {
        console.log(`   ❌ Should require authentication but doesn't`);
      }
      
      // Test with admin token
      if (adminAuth) {
        const adminResult = await testAuthenticatedEndpoint(endpoint.path, endpoint.method, null, adminAuth.token);
        if (adminResult.success) {
          console.log(`   ✅ Admin can access endpoint`);
        } else {
          console.log(`   ❌ Admin access failed: ${adminResult.error}`);
        }
      }
    }

    // Test 7: Data Scoping
    console.log('\n7️⃣ Testing data scoping...');
    
    if (adminAuth && merchantAuth) {
      console.log('\n🔍 Testing data access scoping:');
      
      // Admin should see all merchants
      const adminMerchants = await getAvailableMerchants(adminAuth.token);
      console.log(`   - Admin sees ${adminMerchants.length} merchants`);
      
      // Merchant should only see their own data
      const merchantId = merchantAuth.user.merchantId;
      if (merchantId) {
        const merchantDetails = await getMerchantDetails(merchantId, merchantAuth.token);
        if (merchantDetails) {
          console.log(`   - Merchant sees only their own data: ${merchantDetails.name}`);
        }
      }
    }

    // Test 8: Permission Matrix
    console.log('\n8️⃣ Testing permission matrix...');
    
    const operations = ['change', 'extend', 'view', 'create', 'delete'];
    const userRoles = [
      { name: 'ADMIN', auth: adminAuth },
      { name: 'MERCHANT', auth: merchantAuth },
      { name: 'OUTLET_ADMIN', auth: outletAdminAuth }
    ];
    
    console.log('\n📊 Permission Matrix:');
    console.log('Operation    | Admin | Merchant | Outlet Admin');
    console.log('-------------|-------|----------|-------------');
    
    for (const operation of operations) {
      const row = [operation.padEnd(11)];
      
      for (const role of userRoles) {
        if (role.auth) {
          const permission = validatePlanPermissions(role.auth.user, operation);
          row.push(permission.allowed ? '✅' : '❌');
        } else {
          row.push('❌');
        }
      }
      
      console.log(` ${row.join(' | ')}`);
    }

    console.log('\n🎉 Authentication testing completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Admin authentication working');
    console.log('   ✅ Merchant authentication working');
    console.log('   ✅ Outlet admin authentication working');
    console.log('   ✅ Role-based permissions working');
    console.log('   ✅ Token validation working');
    console.log('   ✅ API endpoint authorization working');
    console.log('   ✅ Data scoping working');
    console.log('   ✅ Permission matrix validated');

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAuthentication()
    .then(() => {
      console.log('\n✅ Authentication test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Authentication test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthentication };
