// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testLogin() {
  console.log('🧪 Testing Login API...\n');

  // Test login
  console.log('1️⃣ Testing login with test credentials...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }),
    });

    console.log('📡 Login API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful!');
      console.log('📋 Response data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data?.token) {
        console.log('\n🔑 Token received successfully');
        console.log('👤 User:', data.data.user.email);
        console.log('🎭 Role:', data.data.user.role);
        
        // Test authenticated endpoint
        console.log('\n2️⃣ Testing authenticated endpoint...');
        const authResponse = await fetch(`${API_BASE}/api/orders?limit=5`, {
          headers: {
            'Authorization': `Bearer ${data.data.token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Orders API response status:', authResponse.status);
        if (authResponse.ok) {
          const ordersData = await authResponse.json();
          console.log('✅ Orders API working!');
          console.log('📊 Orders count:', ordersData.data?.orders?.length || 0);
        } else {
          console.log('❌ Orders API failed:', authResponse.status, authResponse.statusText);
        }
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Login failed:', response.status, errorData);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testLogin();
