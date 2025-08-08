const jwt = require('jsonwebtoken');

// Create a test token
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  merchant: {
    id: 'test-merchant-id',
    companyName: 'Test Merchant'
  }
};

const token = jwt.sign(testUser, 'your-secret-key', { expiresIn: '1h' });

console.log('Test token:', token);

// Test the search API
async function testSearch() {
  try {
    const response = await fetch('http://localhost:3002/api/customers?search=john', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

testSearch(); 