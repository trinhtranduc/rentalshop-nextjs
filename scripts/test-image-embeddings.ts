#!/usr/bin/env tsx
/**
 * Test Image Embeddings Service
 * 
 * Test các methods của FashionImageEmbedding service:
 * - generateEmbeddingFromBuffer: Generate embedding từ image buffer
 * - generateEmbedding: Generate embedding từ image URL
 * - generateEmbeddingsBatch: Batch generate embeddings
 * 
 * Usage:
 *   yarn tsx scripts/test-image-embeddings.ts <imagePath> [options]
 * 
 * Options:
 *   --url <url>        Test với image URL thay vì file path
 *   --batch <urls>     Test batch processing (comma-separated URLs)
 *   --method <method>  Test specific method: buffer, url, batch
 * 
 * Examples:
 *   # Test với local image file
 *   yarn tsx scripts/test-image-embeddings.ts './image-test-input/IMG_8298 2.JPG'
 * 
 *   # Test với image URL
 *   yarn tsx scripts/test-image-embeddings.ts --url 'https://example.com/image.jpg'
 * 
 *   # Test batch processing
 *   yarn tsx scripts/test-image-embeddings.ts --batch 'https://example.com/img1.jpg,https://example.com/img2.jpg'
 * 
 *   # Test specific method
 *   yarn tsx scripts/test-image-embeddings.ts './image-test-input/IMG_8298 2.JPG' --method buffer
 */

// Load environment variables
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string, override: boolean = false): void {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            const cleanValue = value.replace(/^["']|["']$/g, '');
            const keyTrimmed = key.trim();
            if (override || !process.env[keyTrimmed]) {
              process.env[keyTrimmed] = cleanValue;
            }
          }
        }
      });
    }
  } catch (error) {
    // Silently ignore permission errors
  }
}

const envLocalPath = resolve(process.cwd(), '.env.local');
const envDevelopmentPath = resolve(process.cwd(), '.env.development');
const envPath = resolve(process.cwd(), '.env');

loadEnvFile(envPath, false);
loadEnvFile(envDevelopmentPath, false);
loadEnvFile(envLocalPath, true);

import { getEmbeddingService } from '../packages/database/src/server';

/**
 * Test generateEmbeddingFromBuffer
 */
async function testGenerateEmbeddingFromBuffer(imagePath: string) {
  console.log('\n📸 Testing generateEmbeddingFromBuffer');
  console.log(`   Image: ${imagePath}`);

  // Check file exists
  if (!existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    process.exit(1);
  }

  try {
    // Read image file
    console.log('\n🔄 Step 1: Reading image file...');
    const imageBuffer = readFileSync(imagePath);
    console.log(`✅ Image loaded: ${imageBuffer.length} bytes`);

    // Generate embedding
    console.log('\n🔄 Step 2: Generating embedding from buffer...');
    const embeddingService = getEmbeddingService();
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
    const duration = Date.now() - startTime;

    // Validate embedding
    console.log('\n✅ Embedding generated successfully!');
    console.log(`   Dimension: ${embedding.length}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`   Last 5 values: [${embedding.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);

    // Check normalization
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    console.log(`   Magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized vector)`);

    if (Math.abs(magnitude - 1.0) > 0.01) {
      console.warn(`⚠️  Warning: Vector is not properly normalized (magnitude: ${magnitude})`);
    } else {
      console.log(`✅ Vector is properly normalized`);
    }

    // Check dimension
    if (embedding.length !== 512) {
      console.error(`❌ Error: Expected 512 dimensions, got ${embedding.length}`);
      process.exit(1);
    } else {
      console.log(`✅ Embedding dimension correct: 512`);
    }

    return embedding;
  } catch (error: any) {
    console.error('\n❌ Error generating embedding from buffer:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack?.substring(0, 500)}`);
    process.exit(1);
  }
}

/**
 * Test generateEmbedding (from URL)
 */
async function testGenerateEmbedding(imageUrl: string) {
  console.log('\n📸 Testing generateEmbedding (from URL)');
  console.log(`   URL: ${imageUrl}`);

  try {
    // Generate embedding
    console.log('\n🔄 Step 1: Generating embedding from URL...');
    const embeddingService = getEmbeddingService();
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(imageUrl);
    const duration = Date.now() - startTime;

    // Validate embedding
    console.log('\n✅ Embedding generated successfully!');
    console.log(`   Dimension: ${embedding.length}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`   Last 5 values: [${embedding.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);

    // Check normalization
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    console.log(`   Magnitude: ${magnitude.toFixed(6)} (should be ~1.0 for normalized vector)`);

    if (Math.abs(magnitude - 1.0) > 0.01) {
      console.warn(`⚠️  Warning: Vector is not properly normalized (magnitude: ${magnitude})`);
    } else {
      console.log(`✅ Vector is properly normalized`);
    }

    // Check dimension
    if (embedding.length !== 512) {
      console.error(`❌ Error: Expected 512 dimensions, got ${embedding.length}`);
      process.exit(1);
    } else {
      console.log(`✅ Embedding dimension correct: 512`);
    }

    return embedding;
  } catch (error: any) {
    console.error('\n❌ Error generating embedding from URL:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack?.substring(0, 500)}`);
    process.exit(1);
  }
}

/**
 * Test generateEmbeddingsBatch
 */
async function testGenerateEmbeddingsBatch(imageUrls: string[]) {
  console.log('\n📸 Testing generateEmbeddingsBatch');
  console.log(`   URLs: ${imageUrls.length} images`);

  try {
    // Generate embeddings
    console.log('\n🔄 Step 1: Generating embeddings in batch...');
    const embeddingService = getEmbeddingService();
    const startTime = Date.now();
    const embeddings = await embeddingService.generateEmbeddingsBatch(imageUrls);
    const duration = Date.now() - startTime;

    // Validate embeddings
    console.log('\n✅ Embeddings generated successfully!');
    console.log(`   Count: ${embeddings.length}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Average per image: ${(duration / embeddings.length).toFixed(2)}ms`);

    // Validate each embedding
    embeddings.forEach((embedding, index) => {
      console.log(`\n   Embedding ${index + 1}:`);
      console.log(`     Dimension: ${embedding.length}`);
      
      // Check normalization
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      console.log(`     Magnitude: ${magnitude.toFixed(6)}`);

      if (embedding.length !== 512) {
        console.error(`     ❌ Error: Expected 512 dimensions, got ${embedding.length}`);
      } else {
        console.log(`     ✅ Dimension correct`);
      }

      if (Math.abs(magnitude - 1.0) > 0.01) {
        console.warn(`     ⚠️  Warning: Vector is not properly normalized`);
      } else {
        console.log(`     ✅ Vector normalized`);
      }
    });

    return embeddings;
  } catch (error: any) {
    console.error('\n❌ Error generating embeddings in batch:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack?.substring(0, 500)}`);
    process.exit(1);
  }
}

/**
 * Test singleton pattern
 */
async function testSingleton() {
  console.log('\n🔄 Testing singleton pattern...');
  
  const service1 = getEmbeddingService();
  const service2 = getEmbeddingService();
  
  if (service1 === service2) {
    console.log('✅ Singleton pattern works correctly');
  } else {
    console.error('❌ Singleton pattern failed - services are different instances');
    process.exit(1);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Image Embeddings Service Test');
  console.log('================================\n');

  // Parse arguments
  const args = process.argv.slice(2);
  const urlIndex = args.findIndex(arg => arg === '--url');
  const batchIndex = args.findIndex(arg => arg === '--batch');
  const methodIndex = args.findIndex(arg => arg === '--method');
  const method = methodIndex >= 0 ? args[methodIndex + 1] : null;

  // Test singleton
  await testSingleton();

  // Test based on arguments
  if (batchIndex >= 0) {
    // Batch test
    const urlsArg = args[batchIndex + 1];
    if (!urlsArg) {
      console.error('❌ Error: --batch requires comma-separated URLs');
      process.exit(1);
    }
    const imageUrls = urlsArg.split(',').map(url => url.trim());
    await testGenerateEmbeddingsBatch(imageUrls);
  } else if (urlIndex >= 0) {
    // URL test
    const imageUrl = args[urlIndex + 1];
    if (!imageUrl) {
      console.error('❌ Error: --url requires image URL');
      process.exit(1);
    }
    await testGenerateEmbedding(imageUrl);
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // File path test
    const imagePath = args[0];
    
    if (method === 'buffer' || !method) {
      await testGenerateEmbeddingFromBuffer(imagePath);
    } else if (method === 'url') {
      // Convert file path to data URL for testing
      const imageBuffer = readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      await testGenerateEmbedding(dataUrl);
    } else {
      console.error(`❌ Error: Unknown method: ${method}`);
      console.error('   Available methods: buffer, url');
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  yarn tsx scripts/test-image-embeddings.ts <imagePath>');
    console.log('  yarn tsx scripts/test-image-embeddings.ts --url <imageUrl>');
    console.log('  yarn tsx scripts/test-image-embeddings.ts --batch <url1,url2,url3>');
    console.log('  yarn tsx scripts/test-image-embeddings.ts <imagePath> --method buffer|url');
    console.log('\nExamples:');
    console.log('  yarn tsx scripts/test-image-embeddings.ts ./image-test-input/IMG_8298\\ 2.JPG');
    console.log('  yarn tsx scripts/test-image-embeddings.ts --url https://example.com/image.jpg');
    console.log('  yarn tsx scripts/test-image-embeddings.ts --batch https://example.com/img1.jpg,https://example.com/img2.jpg');
    process.exit(0);
  }

  console.log('\n✅ All tests completed successfully!');
}

// Run tests
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
