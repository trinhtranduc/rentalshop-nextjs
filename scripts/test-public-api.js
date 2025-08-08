async function testPublicAPI() {
  try {
    console.log('Testing public API...');
    
    // Test health endpoint
    const response = await fetch('http://localhost:3002/api/health/database');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body (text):', text);
    
    if (text) {
      try {
        const data = JSON.parse(text);
        console.log('Response data (parsed):', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('Failed to parse JSON:', parseError.message);
      }
    }
    
  } catch (error) {
    console.error('Error testing public API:', error);
  }
}

testPublicAPI(); 