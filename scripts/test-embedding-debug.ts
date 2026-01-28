#!/usr/bin/env tsx
/**
 * Debug test script to identify root cause of memory corruption
 * Tests with different image sizes and strategies
 */

import * as fs from 'fs';
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';

async function testWithImage(imagePath: string, description: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${description}`);
  console.log(`📁 Image: ${imagePath}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Check file
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ File not found: ${imagePath}`);
      return;
    }

    const stats = fs.statSync(imagePath);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);

    // Read image
    console.log('🔄 Step 1: Reading image file...');
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`   ✅ Buffer size: ${imageBuffer.length} bytes`);
    console.log(`   ✅ Buffer type: ${imageBuffer.constructor.name}`);
    console.log(`   ✅ Buffer.buffer size: ${imageBuffer.buffer.byteLength} bytes`);
    console.log(`   ✅ Buffer.byteOffset: ${imageBuffer.byteOffset}`);
    console.log(`   ✅ Buffer.byteLength: ${imageBuffer.byteLength}`);

    // Initialize service
    console.log('\n🔄 Step 2: Initializing embedding service...');
    const embeddingService = new FashionImageEmbedding();
    console.log('   ✅ Service initialized');

    // Warm up
    console.log('\n🔄 Step 3: Warming up model...');
    const startWarmup = Date.now();
    await embeddingService.warmUp();
    const warmupTime = Date.now() - startWarmup;
    console.log(`   ✅ Model warmed up in ${warmupTime}ms`);

    // Generate embedding
    console.log('\n🔄 Step 4: Generating embedding...');
    const startEmbedding = Date.now();
    
    try {
      const embedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
      const embeddingTime = Date.now() - startEmbedding;
      
      console.log('\n✅ SUCCESS!');
      console.log(`   - Embedding dimension: ${embedding.length}`);
      console.log(`   - Generation time: ${embeddingTime}ms`);
      console.log(`   - Normalized: ${Math.abs(Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) - 1.0) < 0.01 ? 'Yes' : 'No'}`);
    } catch (error: any) {
      const embeddingTime = Date.now() - startEmbedding;
      console.log(`\n❌ FAILED after ${embeddingTime}ms`);
      console.log(`   Error: ${error?.message}`);
      console.log(`   Stack: ${error?.stack?.split('\n').slice(0, 5).join('\n')}`);
      throw error;
    }
  } catch (error: any) {
    console.error(`\n❌ TEST FAILED: ${error?.message}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('🔍 Debug Test: Identifying Root Cause of Memory Corruption');
  console.log('='.repeat(60));

  const testImages = [
    { path: 'test-images/IMG_8298 2.JPG', desc: 'Large image (1.5MB)' },
    // Add more test images if available
  ];

  const results: Array<{ desc: string; success: boolean }> = [];

  for (const test of testImages) {
    if (fs.existsSync(test.path)) {
      const success = await testWithImage(test.path, test.desc);
      results.push({ desc: test.desc, success });
    } else {
      console.log(`\n⚠️  Skipping: ${test.path} (not found)`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.desc}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  });

  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
