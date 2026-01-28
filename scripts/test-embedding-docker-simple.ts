#!/usr/bin/env tsx
/**
 * Simple Docker test - Test embedding generation in Docker environment
 * This simulates Railway environment to identify Docker-specific issues
 * 
 * Usage: Run this inside Docker container or use test-docker-local.sh
 */

import * as fs from 'fs';
import * as path from 'path';
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';

async function main() {
  console.log('🐳 Docker Environment Test');
  console.log('='.repeat(60));
  console.log(`Node version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Arch: ${process.arch}`);
  console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
  console.log('');

  // Find test image
  const testImagePath = path.join(__dirname, '../test-images/IMG_8298 2.JPG');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    process.exit(1);
  }

  console.log('📁 Test image:', testImagePath);
  const stats = fs.statSync(testImagePath);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('');

  try {
    // Read image
    console.log('🔄 Step 1: Reading image...');
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`   ✅ Buffer: ${imageBuffer.length} bytes`);
    console.log(`   ✅ Buffer.buffer: ${imageBuffer.buffer.byteLength} bytes`);
    console.log(`   ✅ Buffer.byteOffset: ${imageBuffer.byteOffset}`);
    console.log('');

    // Initialize service
    console.log('🔄 Step 2: Initializing service...');
    const service = new FashionImageEmbedding();
    console.log('   ✅ Service initialized');
    console.log('');

    // Warm up
    console.log('🔄 Step 3: Warming up model...');
    const warmupStart = Date.now();
    await service.warmUp();
    const warmupTime = Date.now() - warmupStart;
    console.log(`   ✅ Model warmed up in ${warmupTime}ms`);
    console.log('');

    // Generate embedding
    console.log('🔄 Step 4: Generating embedding...');
    const embedStart = Date.now();
    const embedding = await service.generateEmbeddingFromBuffer(imageBuffer);
    const embedTime = Date.now() - embedStart;
    console.log('');

    // Results
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    console.log('✅ SUCCESS!');
    console.log(`   - Dimension: ${embedding.length}`);
    console.log(`   - Time: ${embedTime}ms`);
    console.log(`   - Normalized: ${Math.abs(magnitude - 1.0) < 0.01 ? 'Yes' : 'No'} (magnitude: ${magnitude.toFixed(6)})`);
    console.log(`   - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ ERROR:', error?.message);
    if (error?.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

main();
