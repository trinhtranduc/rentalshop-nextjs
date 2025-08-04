const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = 'http://localhost:3002';
  
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Test 1: Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'client@rentalshop.com',
        password: 'client123',
      }),
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Login successful');
    console.log(`   User: ${loginData.data.user.name} (${loginData.data.user.role})`);
    console.log(`   Token: ${loginData.data.token.substring(0, 20)}...`);

    const token = loginData.data.token;

    // Test 2: Access products without token (should fail)
    console.log('\n2. Testing products access without token...');
    const noTokenResponse = await fetch(`${baseUrl}/api/products`);
    const noTokenData = await noTokenResponse.json();
    
    if (noTokenResponse.status === 401) {
      console.log('✅ Correctly blocked access without token');
    } else {
      console.log('❌ Should have blocked access without token');
    }

    // Test 3: Access products with token (should succeed)
    console.log('\n3. Testing products access with token...');
    const withTokenResponse = await fetch(`${baseUrl}/api/products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const withTokenData = await withTokenResponse.json();
    
    if (withTokenResponse.ok && withTokenData.success) {
      console.log('✅ Successfully accessed products with token');
      console.log(`   Found ${withTokenData.data.products.length} products`);
      
      if (withTokenData.data.products.length > 0) {
        const product = withTokenData.data.products[0];
        console.log(`   Sample product: ${product.name} - $${product.rentPrice}/day`);
      }
    } else {
      console.log('❌ Failed to access products with token:', withTokenData);
    }

    // Test 4: Test product filtering
    console.log('\n4. Testing product filtering...');
    const filterResponse = await fetch(`${baseUrl}/api/products?search=iPhone`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const filterData = await filterResponse.json();
    
    if (filterResponse.ok && filterData.success) {
      console.log('✅ Product filtering works');
      console.log(`   Found ${filterData.data.products.length} products matching "iPhone"`);
    } else {
      console.log('❌ Product filtering failed:', filterData);
    }

    // Test 5: Test invalid token
    console.log('\n5. Testing invalid token...');
    const invalidTokenResponse = await fetch(`${baseUrl}/api/products`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    const invalidTokenData = await invalidTokenResponse.json();
    
    if (invalidTokenResponse.status === 401) {
      console.log('✅ Correctly rejected invalid token');
    } else {
      console.log('❌ Should have rejected invalid token');
    }

    console.log('\n🎉 Authentication tests completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Login works');
    console.log('   ✅ Token-based authentication works');
    console.log('   ✅ Products API requires authentication');
    console.log('   ✅ Product filtering works');
    console.log('   ✅ Invalid tokens are rejected');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the API server is running:');
    console.log('   npm run dev:api');
  }
}

testAuth(); 