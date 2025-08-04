const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugJWT() {
  try {
    console.log('🔍 Debugging JWT Token Issue...\n');

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

    // Verify token
    console.log('🔍 Verifying JWT token...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verification successful:');
      console.log('  Decoded:', decoded);
      console.log('');

      // Test middleware logic
      console.log('🛡️ Testing middleware logic...');
      
      // Simulate protected route check
      const isProtectedRoute = ['/api/users', '/api/products', '/api/orders', '/api/payments', '/api/shops']
        .some(route => '/api/products'.startsWith(route));
      
      console.log('  Is protected route:', isProtectedRoute);
      
      // Simulate admin route check
      const isAdminRoute = ['/api/admin', '/api/users']
        .some(route => '/api/products'.startsWith(route));
      
      console.log('  Is admin route:', isAdminRoute);
      console.log('  User role:', decoded.role);
      console.log('  Admin access required:', isAdminRoute && decoded.role !== 'ADMIN');
      console.log('');

      if (isAdminRoute && decoded.role !== 'ADMIN') {
        console.log('❌ 403 Error: Admin access required');
        console.log('   This explains the 403 error!');
      } else {
        console.log('✅ Access should be granted');
      }

    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
    }

    // Test with different JWT secrets
    console.log('🧪 Testing with different JWT secrets...');
    
    const secrets = [
      process.env.JWT_SECRET,
      'your-secret-key',
      'local-jwt-secret-key-change-this',
      'dev-jwt-secret-key-change-this'
    ];

    for (const secret of secrets) {
      if (!secret) continue;
      
      try {
        const testDecoded = jwt.verify(token, secret);
        console.log(`✅ Token works with secret: ${secret ? 'SET' : 'NOT SET'}`);
        break;
      } catch (error) {
        console.log(`❌ Token fails with secret: ${secret ? 'SET' : 'NOT SET'}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugJWT(); 