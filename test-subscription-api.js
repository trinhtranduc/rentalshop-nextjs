const fetch = require('node-fetch');

async function testSubscriptionAPI() {
  try {
    console.log('🧪 Testing Subscription API...\n');
    
    // Test the subscription status endpoint
    const response = await fetch('http://localhost:3001/api/subscriptions/status', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token', // This will fail auth but we can see the response
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSubscriptionAPI();
