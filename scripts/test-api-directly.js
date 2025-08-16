const fetch = require('node-fetch');

async function testAPIDirectly() {
  try {
    console.log('🔍 Testing API directly...\n');
    
    // Test the users API endpoint
    const response = await fetch('http://localhost:3001/api/users?limit=3');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📡 API Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.users) {
      console.log('\n🔍 Users from API:');
      data.data.users.forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.firstName} ${user.lastName}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Public ID: ${user.publicId} (type: ${typeof user.publicId})`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Has publicId field: ${'publicId' in user}`);
        console.log(`   All fields:`, Object.keys(user));
      });
    } else {
      console.log('❌ API response does not contain expected data structure');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the API server is running on port 3001');
    }
  }
}

testAPIDirectly();
