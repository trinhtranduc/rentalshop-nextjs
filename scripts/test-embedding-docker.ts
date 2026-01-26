/**
 * Test embedding generation trong Docker container
 * Script này test trực tiếp embedding service, không cần database
 * Usage: docker exec <container> node -r tsx/register /app/scripts/test-embedding-docker.ts
 */

// Set environment variables BEFORE any imports
process.env.USE_ONNXRUNTIME = 'false';
process.env.USE_BROWSER = 'true';
process.env.ONNXRUNTIME_NODE_DISABLE = 'true';

import fs from 'fs';
import path from 'path';

async function testEmbedding() {
  console.log('🧪 Testing Embedding Generation in Docker');
  console.log('==========================================\n');
  
  console.log('🔧 Environment variables:', {
    USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
    USE_BROWSER: process.env.USE_BROWSER,
    ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE,
    NODE_ENV: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch
  });
  console.log('');

  try {
    // Import embedding service - use direct path in Docker
    console.log('🔄 Loading embedding service...');
    
    // Try package import first, fallback to direct path
    let embeddingService;
    try {
      const { getEmbeddingService } = await import('@rentalshop/database/server');
      embeddingService = getEmbeddingService();
      console.log('✅ Loaded via package import');
    } catch (e) {
      console.log('⚠️  Package import failed, trying direct path...');
      // Use direct path to built file
      const serverPath = path.join(process.cwd(), 'packages/database/dist/server.js');
      if (fs.existsSync(serverPath)) {
        const { getEmbeddingService } = await import(serverPath);
        embeddingService = getEmbeddingService();
        console.log('✅ Loaded via direct path');
      } else {
        throw new Error(`Server file not found at ${serverPath}`);
      }
    }
    console.log('✅ Embedding service loaded\n');

    // Find test image
    const testImagePaths = [
      '/app/image-test-input/IMG_8298 2.JPG',
      '/tmp/test-image.jpg',
      '/tmp/test-image.JPG',
      '/tmp/test-image.png',
      '/tmp/test-image.PNG'
    ];

    let imagePath: string | null = null;
    for (const p of testImagePaths) {
      if (fs.existsSync(p)) {
        imagePath = p;
        break;
      }
    }

    if (!imagePath) {
      throw new Error('No test image found. Please provide an image file.');
    }

    console.log(`📸 Reading test image: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`✅ Image loaded: ${imageBuffer.length} bytes\n`);

    // Generate embedding
    console.log('🔄 Generating embedding...');
    console.log('   This will test WASM backend initialization');
    console.log('   Expected: Model loads with WASM, embedding generated successfully\n');

    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
    const duration = Date.now() - startTime;

    console.log('✅ Embedding generated successfully!');
    console.log(`   Dimension: ${embedding.length}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`   Last 5 values: [${embedding.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);

    // Check normalization
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`   Magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized vector)`);

    // Validation
    if (Math.abs(magnitude - 1.0) > 0.01) {
      throw new Error(`Vector not normalized: magnitude = ${magnitude}`);
    }

    if (embedding.length !== 512) {
      throw new Error(`Wrong dimension: expected 512, got ${embedding.length}`);
    }

    console.log('\n✅ All checks passed!');
    console.log('✅ WASM backend is working correctly!');
    console.log('✅ Ready to commit and push to Railway!');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
    console.error('\n❌ Please fix issues before committing to Railway');
    process.exit(1);
  }
}

testEmbedding();
