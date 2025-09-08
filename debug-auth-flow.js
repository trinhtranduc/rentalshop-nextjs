// Using built-in fetch in Node.js 18+

async function debugAuthFlow() {
  console.log('🔍 Debugging Authentication Flow...\n');

  try {
    // Step 1: Login to get a token
    console.log('1️⃣ Attempting login...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test4@gmail.com',
        password: 'test123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginData.data.token;
    console.log('✅ Token received:', token ? 'Yes' : 'No');
    console.log('Token length:', token ? token.length : 0);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');

    // Step 2: Test token verification
    console.log('\n2️⃣ Testing token verification...');
    const verifyResponse = await fetch('http://localhost:3002/api/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const verifyData = await verifyResponse.json();
    console.log('Profile response status:', verifyResponse.status);
    console.log('Profile response:', JSON.stringify(verifyData, null, 2));

    if (!verifyData.success) {
      console.error('❌ Token verification failed');
      return;
    }

    // Step 3: Test merchant update
    console.log('\n3️⃣ Testing merchant update...');
    const updateResponse = await fetch('http://localhost:3002/api/settings/merchant', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Business Updated',
        email: 'test4@gmail.com',
        phone: '123-456-7890',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country',
        businessType: 'RENTAL',
        taxId: 'TAX123456'
      })
    });

    const updateData = await updateResponse.json();
    console.log('Update response status:', updateResponse.status);
    console.log('Update response:', JSON.stringify(updateData, null, 2));

    if (updateData.success) {
      console.log('✅ Merchant update successful');
    } else {
      console.error('❌ Merchant update failed');
    }

  } catch (error) {
    console.error('❌ Error in auth flow:', error);
  }
}

debugAuthFlow();
