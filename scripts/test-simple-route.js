async function testSimpleRoute() {
  try {
    console.log('Testing simple route...');
    
    const response = await fetch('http://localhost:3002/api/test');
    
    console.log('Response status:', response.status);
    
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
    console.error('Error testing simple route:', error);
  }
}

testSimpleRoute(); 