const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugToken() {
  try {
    console.log('🔍 Debugging Token Storage Issue...\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('');

    // Find the client user
    console.log('👤 Finding client user...');
    const user = await prisma.user.findUnique({
      where: { email: 'client@rentalshop.com' },
    });

    if (!user) {
      console.log('❌ Client user not found!');
      return;
    }

    console.log('✅ Client user found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Is Active:', user.isActive);
    console.log('');

    // Generate token
    console.log('🔑 Generating JWT token...');
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    console.log('✅ Token generated:');
    console.log('  Token:', token.substring(0, 50) + '...');
    console.log('  Payload:', payload);
    console.log('');

    // Test API call with token
    console.log('🌐 Testing API call with token...');
    
    try {
      const response = await fetch('http://localhost:3002/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful!');
        console.log('  Products count:', data.data?.products?.length || 0);
      } else {
        const errorData = await response.json();
        console.log('❌ API call failed:', errorData);
      }
    } catch (apiError) {
      console.log('❌ API call error:', apiError.message);
    }

    console.log('');
    console.log('🔧 Manual Testing Steps:');
    console.log('1. Open browser console');
    console.log('2. Run: localStorage.setItem("authToken", "' + token + '")');
    console.log('3. Run: localStorage.setItem("user", \'' + JSON.stringify(payload) + '\')');
    console.log('4. Navigate to: http://localhost:3000/dashboard');
    console.log('5. Check if products load successfully');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugToken(); 