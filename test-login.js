// Test script to verify login API works
const testLogin = async () => {
  try {
    console.log('🔍 Testing login API...');
    
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@rentalshop.com',
        password: 'admin123' // Default password from setup script
      })
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Login API is working! Prisma client is properly initialized.');
    } else {
      console.log('❌ Login failed, but API is responding (no Prisma client error)');
    }
  } catch (error) {
    console.error('💥 Error testing login:', error);
  }
};

testLogin();