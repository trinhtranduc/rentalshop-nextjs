const jwt = require('jsonwebtoken');

// Tạo token mới cho admin user
const secret = 'local-jwt-secret-key-change-this';
const payload = {
  userId: 1001,  // Admin user ID
  email: 'admin@rentalshop.com',
  role: 'ADMIN'
};

const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log('🔑 Token tạo mới:', token);

// Test tất cả các API
async function testAllAPIs() {
  try {
    console.log('\n🔍 Testing all APIs...');
    
    // Test 1: Profile API
    console.log('\n1. Testing Profile API');
    const profileResponse = await fetch('http://localhost:3002/api/users/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Super',
        lastName: 'Administrator',
        phone: '+1-555-ADMIN-TEST'
      })
    });
    
    console.log('Profile response status:', profileResponse.status);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Profile updated:', profileData.message);
    } else {
      const errorText = await profileResponse.text();
      console.log('❌ Profile error:', errorText);
    }
    
    // Test 2: Outlet API
    console.log('\n2. Testing Outlet API');
    const outletResponse = await fetch('http://localhost:3002/api/outlets?outletId=1', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Outlet Update',
        address: 'Test Address',
        phone: '+1-555-OUTLET-TEST',
        description: 'Test description'
      })
    });
    
    console.log('Outlet response status:', outletResponse.status);
    if (outletResponse.ok) {
      const outletData = await outletResponse.json();
      console.log('✅ Outlet updated:', outletData.message);
    } else {
      const errorText = await outletResponse.text();
      console.log('❌ Outlet error:', errorText);
    }
    
    // Test 3: Merchant API (nếu có)
    console.log('\n3. Testing Merchant API');
    const merchantResponse = await fetch('http://localhost:3002/api/settings/merchant', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Merchant Update',
        email: 'test@merchant.com',
        phone: '+1-555-MERCHANT-TEST'
      })
    });
    
    console.log('Merchant response status:', merchantResponse.status);
    if (merchantResponse.ok) {
      const merchantData = await merchantResponse.json();
      console.log('✅ Merchant updated:', merchantData.message);
    } else {
      const errorText = await merchantResponse.text();
      console.log('❌ Merchant error:', errorText);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Chạy test
testAllAPIs();
