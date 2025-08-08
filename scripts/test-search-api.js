const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWUxaHluankwMDAwN3BnMHpsbWpoM29yIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVCIsImlhdCI6MTc1NDU3NzE5OSwiZXhwIjoxNzU1MTgxOTk5fQ.20z_PJXVJJgJDqzYa5wVrmzQaW6ObDGbMnZ2z5K2JLc';

async function testSearch() {
  try {
    console.log('Testing search API...');
    
    const response = await fetch('http://localhost:3002/api/customers?search=john', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

testSearch(); 