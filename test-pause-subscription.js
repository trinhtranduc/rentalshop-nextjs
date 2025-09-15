// ============================================================================
// TEST PAUSE SUBSCRIPTION FUNCTIONALITY
// ============================================================================

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function testPauseSubscription() {
  console.log('🧪 Testing Pause Subscription Functionality...\n');

  // Test data - you'll need to replace these with actual values
  const testData = {
    subscriptionId: 1, // Replace with actual subscription ID
    authToken: 'your-auth-token-here' // Replace with actual auth token
  };

  // Test using the subscriptionsApi (recommended approach)
  console.log('📋 Testing with subscriptionsApi (recommended):');
  try {
    const { subscriptionsApi } = await import('./packages/utils/src/api/subscriptions.ts');
    
    // Test pause
    console.log('1️⃣ Testing PAUSE with subscriptionsApi...');
    const pauseResult = await subscriptionsApi.suspend(testData.subscriptionId, {
      reason: 'Testing pause functionality'
    });
    console.log('Pause Result:', JSON.stringify(pauseResult, null, 2));

    if (pauseResult.success) {
      console.log('✅ Pause subscription successful!');
    } else {
      console.log('❌ Pause subscription failed:', pauseResult.message);
    }

    // Wait a moment before testing resume
    console.log('\n⏳ Waiting 2 seconds before testing resume...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test resume
    console.log('\n2️⃣ Testing RESUME with subscriptionsApi...');
    const resumeResult = await subscriptionsApi.resume(testData.subscriptionId, {
      reason: 'Testing resume functionality'
    });
    console.log('Resume Result:', JSON.stringify(resumeResult, null, 2));

    if (resumeResult.success) {
      console.log('✅ Resume subscription successful!');
    } else {
      console.log('❌ Resume subscription failed:', resumeResult.message);
    }

  } catch (error) {
    console.error('❌ Error with subscriptionsApi:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📋 Testing with direct API calls (alternative approach):');

  try {
    // Test 1: Pause Subscription
    console.log('1️⃣ Testing PAUSE subscription...');
    const pauseResponse = await fetch(`${API_BASE}/api/subscriptions/${testData.subscriptionId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testData.authToken}`
      },
      body: JSON.stringify({
        reason: 'Testing pause functionality'
      })
    });

    const pauseResult = await pauseResponse.json();
    console.log('Pause Response:', JSON.stringify(pauseResult, null, 2));

    if (pauseResult.success) {
      console.log('✅ Pause subscription successful!');
    } else {
      console.log('❌ Pause subscription failed:', pauseResult.message);
    }

    // Wait a moment before testing resume
    console.log('\n⏳ Waiting 2 seconds before testing resume...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Resume Subscription
    console.log('\n2️⃣ Testing RESUME subscription...');
    const resumeResponse = await fetch(`${API_BASE}/api/subscriptions/${testData.subscriptionId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testData.authToken}`
      },
      body: JSON.stringify({
        reason: 'Testing resume functionality'
      })
    });

    const resumeResult = await resumeResponse.json();
    console.log('Resume Response:', JSON.stringify(resumeResult, null, 2));

    if (resumeResult.success) {
      console.log('✅ Resume subscription successful!');
    } else {
      console.log('❌ Resume subscription failed:', resumeResult.message);
    }

    // Test 3: Check Subscription Status
    console.log('\n3️⃣ Checking subscription status...');
    const statusResponse = await fetch(`${API_BASE}/api/subscriptions/${testData.subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.authToken}`
      }
    });

    const statusResult = await statusResponse.json();
    console.log('Status Response:', JSON.stringify(statusResult, null, 2));

    if (statusResult.success) {
      console.log('✅ Subscription status retrieved successfully!');
      console.log(`📊 Current Status: ${statusResult.data.status}`);
    } else {
      console.log('❌ Failed to get subscription status:', statusResult.message);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log('📋 INSTRUCTIONS TO RUN THIS TEST:');
console.log('1. Update the testData object with actual values:');
console.log('   - subscriptionId: Get from your database or API');
console.log('   - authToken: Get from login response');
console.log('2. Make sure your API server is running on port 3001');
console.log('3. Run: node test-pause-subscription.js');
console.log('\n' + '='.repeat(60) + '\n');

// Uncomment the line below to run the test
// testPauseSubscription();
