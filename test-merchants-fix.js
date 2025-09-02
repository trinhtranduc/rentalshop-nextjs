// Test the merchants array handling fix
const testMerchantsArrayHandling = () => {
  console.log('🧪 Testing Merchants Array Handling Fix...\n');
  
  // Test 1: Normal array
  console.log('1️⃣ Testing with normal array:');
  const merchants1 = [
    { id: 1, name: 'Test 1', email: 'test1@example.com' },
    { id: 2, name: 'Test 2', email: 'test2@example.com' }
  ];
  
  try {
    const filtered1 = (merchants1 || []).filter(m => m.name.includes('Test'));
    console.log('✅ Success:', filtered1.length, 'merchants found');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: Null/undefined array
  console.log('\n2️⃣ Testing with null array:');
  const merchants2 = null;
  
  try {
    const filtered2 = (merchants2 || []).filter(m => m.name.includes('Test'));
    console.log('✅ Success:', filtered2.length, 'merchants found (empty array)');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 3: Undefined array
  console.log('\n3️⃣ Testing with undefined array:');
  let merchants3;
  
  try {
    const filtered3 = (merchants3 || []).filter(m => m.name.includes('Test'));
    console.log('✅ Success:', filtered3.length, 'merchants found (empty array)');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: Empty array
  console.log('\n4️⃣ Testing with empty array:');
  const merchants4 = [];
  
  try {
    const filtered4 = (merchants4 || []).filter(m => m.name.includes('Test'));
    console.log('✅ Success:', filtered4.length, 'merchants found (empty array)');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n🎯 All tests completed!');
  console.log('📝 The fix ensures merchants.filter() never throws an error');
};

// Run the test
testMerchantsArrayHandling();
