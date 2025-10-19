// Test file naming logic
function testFileNameGeneration() {
  const testCases = [
    { name: 'blob', type: 'image/jpeg' },
    { name: 'blob', type: 'image/png' },
    { name: 'blob', type: 'image/webp' },
    { name: 'photo.jpg', type: 'image/jpeg' },
    { name: 'photo.png', type: 'image/jpeg' }, // Wrong extension
    { name: 'photo', type: 'image/png' }, // No extension
    { name: 'my-image.webp', type: 'image/webp' }
  ];

  testCases.forEach(testCase => {
    const { name, type } = testCase;
    const fileExtension = type.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    
    let properFileName;
    
    if (name === 'blob' || name === 'image' || !name) {
      properFileName = `image-${timestamp}-${randomId}.${fileExtension}`;
    } else if (name.includes('.')) {
      const existingExt = name.split('.').pop()?.toLowerCase();
      const correctExt = fileExtension.toLowerCase();
      
      if (existingExt === correctExt) {
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        properFileName = `${nameWithoutExt}-${timestamp}.${fileExtension}`;
      } else {
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        properFileName = `${nameWithoutExt}-${timestamp}.${fileExtension}`;
      }
    } else {
      properFileName = `${name}-${timestamp}.${fileExtension}`;
    }
    
    console.log(`Input: name="${name}", type="${type}"`);
    console.log(`Output: "${properFileName}"`);
    console.log('---');
  });
}

testFileNameGeneration();
