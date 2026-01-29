#!/usr/bin/env tsx
/**
 * Test image embedding generation locally with a real image
 * 
 * Usage:
 *   tsx scripts/test-embedding-local.ts <image-path>
 * 
 * Example:
 *   tsx scripts/test-embedding-local.ts test-images/IMG_8298\ 2.JPG
 */

import * as fs from 'fs';
import * as path from 'path';
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';

async function main() {
  // Get image path from command line args
  const imagePath = process.argv[2];
  
  if (!imagePath) {
    console.error('❌ Error: Please provide an image path');
    console.log('Usage: tsx scripts/test-embedding-local.ts <image-path>');
    console.log('Example: tsx scripts/test-embedding-local.ts test-images/IMG_8298\\ 2.JPG');
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: File not found: ${imagePath}`);
    process.exit(1);
  }

  console.log('🧪 Testing Image Embedding Generation Locally');
  console.log('=' .repeat(60));
  console.log(`📁 Image path: ${imagePath}`);
  
  // Get file stats
  const stats = fs.statSync(imagePath);
  console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('');

  try {
    // Read image file
    console.log('🔄 Step 1: Reading image file...');
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`   ✅ Image read: ${imageBuffer.length} bytes`);
    console.log('');

    // Initialize embedding service
    console.log('🔄 Step 2: Initializing FashionImageEmbedding service...');
    const embeddingService = new FashionImageEmbedding();
    console.log('   ✅ Service initialized');
    console.log('');

    // Warm up model (optional, but recommended for first call)
    console.log('🔄 Step 3: Warming up model (first call may be slow)...');
    const startWarmup = Date.now();
    await embeddingService.warmUp();
    const warmupTime = Date.now() - startWarmup;
    console.log(`   ✅ Model warmed up in ${warmupTime}ms`);
    console.log('');

    // Generate embedding
    console.log('🔄 Step 4: Generating embedding from image buffer...');
    const startEmbedding = Date.now();
    const embedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
    const embeddingTime = Date.now() - startEmbedding;
    console.log('');

    // Display results
    console.log('✅ SUCCESS! Embedding generated successfully');
    console.log('=' .repeat(60));
    console.log(`📊 Embedding dimension: ${embedding.length}`);
    console.log(`⏱️  Generation time: ${embeddingTime}ms`);
    console.log(`📈 First 10 values: [${embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`📈 Last 10 values: [${embedding.slice(-10).map(v => v.toFixed(4)).join(', ')}]`);
    
    // Check if normalized (magnitude should be ~1.0)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`📐 Vector magnitude: ${magnitude.toFixed(6)} (should be ~1.0 if normalized)`);
    console.log('');

    // Summary
    console.log('📋 Summary:');
    console.log(`   - Image: ${path.basename(imagePath)}`);
    console.log(`   - Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Embedding dimension: ${embedding.length}`);
    console.log(`   - Total time: ${warmupTime + embeddingTime}ms`);
    console.log(`   - Normalized: ${Math.abs(magnitude - 1.0) < 0.01 ? '✅ Yes' : '❌ No'}`);
    console.log('');

    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ ERROR: Test failed');
    console.error('=' .repeat(60));
    console.error(`Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
