/**
 * Test script for Python Embedding API
 * 
 * Usage:
 *   yarn tsx scripts/test-python-api.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PYTHON_API_URL = process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';

async function testPythonAPI() {
  console.log('🧪 Testing Python Embedding API...');
  console.log(`📍 API URL: ${PYTHON_API_URL}\n`);

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${PYTHON_API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Generate embedding
  console.log('\n2️⃣ Testing embedding generation...');
  
  // Find a test image
  const testImagePath = path.join(__dirname, '../test-images');
  const testImages = fs.readdirSync(testImagePath).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.JPG')
  );
  
  if (testImages.length === 0) {
    console.error('❌ No test images found in test-images/');
    return;
  }
  
  const imagePath = path.join(testImagePath, testImages[0]);
  const imageBuffer = fs.readFileSync(imagePath);
  
  console.log(`   Using image: ${testImages[0]} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
  
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, testImages[0]);
    
    const startTime = Date.now();
    const response = await fetch(`${PYTHON_API_URL}/embed`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('✅ Embedding generated successfully!');
    console.log(`   Dimension: ${data.dimension}`);
    console.log(`   Normalized: ${data.normalized}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Embedding sample (first 5): [${data.embedding.slice(0, 5).map((x: number) => x.toFixed(4)).join(', ')}...]`);
    
    // Verify embedding
    if (data.dimension !== 512) {
      console.warn(`⚠️ Warning: Expected 512 dimensions, got ${data.dimension}`);
    }
    
    if (!data.normalized) {
      console.warn('⚠️ Warning: Embedding is not normalized');
    }
    
    // Check normalization
    const magnitude = Math.sqrt(data.embedding.reduce((sum: number, x: number) => sum + x * x, 0));
    console.log(`   Magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized)`);
    
  } catch (error: any) {
    console.error('❌ Embedding generation failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  }
  
  console.log('\n✅ Test completed!');
}

// Run test
testPythonAPI().catch(console.error);
