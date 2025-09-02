#!/usr/bin/env node

/**
 * Test Plan API Script
 * Tests all plan API endpoints to ensure they work correctly
 */

const API_BASE = 'http://localhost:3002';

// Test data for creating a new plan
const testPlanData = {
  name: 'Test Plan',
  description: 'A test plan for API testing',
  price: 49.99,
  currency: 'USD',
  trialDays: 7,
  maxOutlets: 2,
  maxUsers: 5,
  maxProducts: 200,
  maxCustomers: 1000,
  features: [
    'Test feature 1',
    'Test feature 2',
    'Test feature 3'
  ],
  isActive: true,
  isPopular: false,
  sortOrder: 4,
  billingCycle: 'monthly'
};

// Admin token will be set dynamically
let ADMIN_TOKEN = null;

async function testPlanAPI() {
  try {
    console.log('🧪 Testing Plan API endpoints...\n');

    // Test 1: Get public plans (no auth required)
    console.log('1️⃣ Testing GET /api/plans/public...');
    try {
      const publicResponse = await fetch(`${API_BASE}/api/plans/public`);
      const publicData = await publicResponse.json();
      
      if (publicResponse.ok) {
        console.log(`✅ Public plans: ${publicData.data?.length || 0} plans found`);
        if (publicData.data?.length > 0) {
          console.log(`   - First plan: ${publicData.data[0].name} ($${publicData.data[0].price})`);
        }
      } else {
        console.log(`❌ Public plans failed: ${publicData.message}`);
      }
    } catch (error) {
      console.log(`❌ Public plans error: ${error.message}`);
    }

    // Test 2: Get admin plans (requires auth)
    console.log('\n2️⃣ Testing GET /api/plans (admin)...');
    try {
      const adminResponse = await fetch(`${API_BASE}/api/plans`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      const adminData = await adminResponse.json();
      
      if (adminResponse.ok) {
        console.log(`✅ Admin plans: ${adminData.data?.length || 0} plans found`);
        if (adminData.data?.length > 0) {
          console.log(`   - Total plans: ${adminData.total}`);
          console.log(`   - Has more: ${adminData.hasMore}`);
        }
      } else {
        console.log(`❌ Admin plans failed: ${adminData.message}`);
      }
    } catch (error) {
      console.log(`❌ Admin plans error: ${error.message}`);
    }

    // Test 3: Get plan statistics (requires admin auth)
    console.log('\n3️⃣ Testing GET /api/plans/stats...');
    try {
      const statsResponse = await fetch(`${API_BASE}/api/plans/stats`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      const statsData = await statsResponse.json();
      
      if (statsResponse.ok) {
        console.log('✅ Plan statistics:');
        console.log(`   - Total plans: ${statsData.data?.totalPlans || 0}`);
        console.log(`   - Active plans: ${statsData.data?.activePlans || 0}`);
        console.log(`   - Total subscriptions: ${statsData.data?.totalSubscriptions || 0}`);
        console.log(`   - Active subscriptions: ${statsData.data?.activeSubscriptions || 0}`);
        console.log(`   - Total revenue: $${statsData.data?.totalRevenue || 0}`);
      } else {
        console.log(`❌ Plan stats failed: ${statsData.message}`);
      }
    } catch (error) {
      console.log(`❌ Plan stats error: ${error.message}`);
    }

    // Test 4: Get specific plan (requires auth)
    console.log('\n4️⃣ Testing GET /api/plans/1...');
    try {
      const planResponse = await fetch(`${API_BASE}/api/plans/1`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      const planData = await planResponse.json();
      
      if (planResponse.ok) {
        console.log(`✅ Plan details: ${planData.data?.name}`);
        console.log(`   - Price: $${planData.data?.price}`);
        console.log(`   - Features: ${planData.data?.features?.length || 0} features`);
        console.log(`   - Merchant count: ${planData.data?.merchantCount || 0}`);
      } else {
        console.log(`❌ Plan details failed: ${planData.message}`);
      }
    } catch (error) {
      console.log(`❌ Plan details error: ${error.message}`);
    }

    // Test 5: Create new plan (requires admin auth)
    console.log('\n5️⃣ Testing POST /api/plans (create)...');
    try {
      const createResponse = await fetch(`${API_BASE}/api/plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPlanData)
      });
      const createData = await createResponse.json();
      
      if (createResponse.ok) {
        console.log(`✅ Plan created: ${createData.data?.name} (ID: ${createData.data?.id})`);
        const createdPlanId = createData.data?.id;
        
        // Test 6: Update the created plan
        console.log('\n6️⃣ Testing PUT /api/plans/[id] (update)...');
        const updateData = {
          ...testPlanData,
          name: 'Updated Test Plan',
          price: 59.99
        };
        
        const updateResponse = await fetch(`${API_BASE}/api/plans/${createdPlanId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        const updateResult = await updateResponse.json();
        
        if (updateResponse.ok) {
          console.log(`✅ Plan updated: ${updateResult.data?.name} (Price: $${updateResult.data?.price})`);
        } else {
          console.log(`❌ Plan update failed: ${updateResult.message}`);
        }
        
        // Test 7: Delete the created plan
        console.log('\n7️⃣ Testing DELETE /api/plans/[id] (delete)...');
        const deleteResponse = await fetch(`${API_BASE}/api/plans/${createdPlanId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        const deleteResult = await deleteResponse.json();
        
        if (deleteResponse.ok) {
          console.log(`✅ Plan deleted: ${deleteResult.data?.name}`);
        } else {
          console.log(`❌ Plan delete failed: ${deleteResult.message}`);
        }
        
      } else {
        console.log(`❌ Plan creation failed: ${createData.message}`);
        if (createData.error) {
          console.log(`   - Validation errors:`, createData.error);
        }
      }
    } catch (error) {
      console.log(`❌ Plan creation error: ${error.message}`);
    }

    console.log('\n🎉 Plan API testing completed!');

  } catch (error) {
    console.error('❌ Error testing plan API:', error);
  }
}

// Helper function to get admin token
async function getAdminToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@rentalshop.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    if (response.ok && data.token) {
      return data.token;
    }
    return null;
  } catch (error) {
    console.error('Error getting admin token:', error);
    return null;
  }
}

// Run the tests
if (require.main === module) {
  (async () => {
    console.log('🔑 Getting admin token...');
    const token = await getAdminToken();
    
    if (token) {
      console.log('✅ Admin token obtained');
      ADMIN_TOKEN = token;
    } else {
      console.log('❌ Failed to get admin token. Some tests will be skipped.');
    }
    
    await testPlanAPI();
    process.exit(0);
  })();
}

module.exports = { testPlanAPI };
