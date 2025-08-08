const jwt = require('jsonwebtoken');

const JWT_SECRET = 'local-jwt-secret-key-change-this';

// Test token from our script
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWUxaHluankwMDAwN3BnMHpsbWpoM29yIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTc1NDU3NzE5OSwiZXhwIjoxNzU1MTgxOTk5fQ.20z_PJXVJJgJDqzYa5wVrmzQaW6ObDGbMnZ2z5K2JLc';

function testJWT() {
  try {
    console.log('Testing JWT verification...');
    
    // Verify the token
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('JWT verification successful!');
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Create a new token with the same payload
    const newToken = jwt.sign({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('\nNew token created:', newToken);
    
  } catch (error) {
    console.error('JWT verification failed:', error.message);
  }
}

testJWT(); 