#!/usr/bin/env tsx
/**
 * Test Image Search Direct - Test với Qdrant trực tiếp (không cần API server)
 * 
 * Usage:
 *   yarn tsx scripts/test-image-search-direct.ts <imagePath> [productId]
 * 
 * Example:
 *   yarn tsx scripts/test-image-search-direct.ts './image-test-input/IMG_8298 2.JPG'
 *   yarn tsx scripts/test-image-search-direct.ts './image-test-input/IMG_8298 2.JPG' 5331
 */

// Load environment variables
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string, override: boolean = false): void {
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
}

const envLocalPath = resolve(process.cwd(), '.env.local');
const envDevelopmentPath = resolve(process.cwd(), '.env.development');
const envPath = resolve(process.cwd(), '.env');

loadEnvFile(envPath, false);
loadEnvFile(envDevelopmentPath, false);
loadEnvFile(envLocalPath, true);

import { getEmbeddingService, getVectorStore } from '../packages/database/src/server';
import { db } from '../packages/database/src';

async function testImageSearchDirect(imagePath: string, expectedProductId?: number) {
  console.log(`\n🔍 Testing Image Search Direct`);
  console.log(`   Image: ${imagePath}`);
  if (expectedProductId) {
    console.log(`   Expected Product ID: ${expectedProductId}`);
  }

  // Step 1: Check image file
  if (!existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    process.exit(1);
  }

  // Step 2: Generate embedding from image
  console.log('\n🔄 Step 1: Generate embedding from image...');
  const embeddingService = getEmbeddingService();
  const imageBuffer = readFileSync(imagePath);
  const queryEmbedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
  console.log(`✅ Embedding generated (dimension: ${queryEmbedding.length})`);

  // Step 3: Search in Qdrant with different thresholds
  console.log('\n🔍 Step 2: Search in Qdrant...');
  const vectorStore = getVectorStore();
  const collectionName = vectorStore.getCollectionName();
  console.log(`   Collection: ${collectionName}`);

  const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7];
  
  for (const threshold of thresholds) {
    console.log(`\n   Testing threshold: ${threshold}`);
    try {
      const searchResults = await vectorStore.search(queryEmbedding, {
        minSimilarity: threshold,
        limit: 20
      });

      console.log(`   ✅ Found ${searchResults.length} products (similarity >= ${threshold})`);

      if (searchResults.length > 0) {
        console.log(`   Top 5 results:`);
        searchResults.slice(0, 5).forEach((result, index) => {
          const similarity = (result.similarity * 100).toFixed(2);
          const isExpected = expectedProductId && parseInt(result.productId) === expectedProductId;
          console.log(`      ${index + 1}. Product ${result.productId}: ${similarity}% ${isExpected ? '✅ (EXPECTED)' : ''}`);
        });

        // Check if expected product is in results
        if (expectedProductId) {
          const found = searchResults.find(r => parseInt(r.productId) === expectedProductId);
          if (found) {
            console.log(`   ✅ Expected product ${expectedProductId} FOUND with ${(found.similarity * 100).toFixed(2)}% similarity`);
          } else {
            console.log(`   ❌ Expected product ${expectedProductId} NOT FOUND in top ${searchResults.length} results`);
          }
        }
      } else {
        console.log(`   ⚠️  No products found with threshold ${threshold}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Step 4: If expected product ID provided, check with filters
  if (expectedProductId) {
    console.log('\n🔍 Step 3: Test with product filters...');
    const product = await db.products.findById(expectedProductId);
    if (product) {
      console.log(`   Product: ${product.name}`);
      console.log(`   Merchant ID: ${product.merchantId}`);
      console.log(`   Category ID: ${product.categoryId || 'N/A'}`);

      // Test with merchantId filter
      console.log(`\n   Testing with merchantId filter (${product.merchantId})...`);
      const resultsWithMerchant = await vectorStore.search(queryEmbedding, {
        merchantId: product.merchantId,
        minSimilarity: 0.5,
        limit: 20
      });

      const foundWithMerchant = resultsWithMerchant.find(r => parseInt(r.productId) === expectedProductId);
      if (foundWithMerchant) {
        console.log(`   ✅ Found with merchantId filter: ${(foundWithMerchant.similarity * 100).toFixed(2)}%`);
      } else {
        console.log(`   ❌ NOT found with merchantId filter`);
        console.log(`   Found ${resultsWithMerchant.length} other products instead`);
      }

      // Test with categoryId filter if available
      if (product.categoryId) {
        console.log(`\n   Testing with categoryId filter (${product.categoryId})...`);
        const resultsWithCategory = await vectorStore.search(queryEmbedding, {
          merchantId: product.merchantId,
          categoryId: product.categoryId,
          minSimilarity: 0.5,
          limit: 20
        });

        const foundWithCategory = resultsWithCategory.find(r => parseInt(r.productId) === expectedProductId);
        if (foundWithCategory) {
          console.log(`   ✅ Found with categoryId filter: ${(foundWithCategory.similarity * 100).toFixed(2)}%`);
        } else {
          console.log(`   ❌ NOT found with categoryId filter`);
          console.log(`   Found ${resultsWithCategory.length} other products instead`);
        }
      }
    }
  }

  console.log('\n✅ Test completed!\n');
}

async function main() {
  const imagePath = process.argv[2];
  const expectedProductId = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!imagePath) {
    console.error('❌ Please provide image path');
    console.log('\nUsage:');
    console.log('  yarn tsx scripts/test-image-search-direct.ts <imagePath> [productId]');
    console.log('\nExample:');
    console.log('  yarn tsx scripts/test-image-search-direct.ts "./image-test-input/IMG_8298 2.JPG"');
    console.log('  yarn tsx scripts/test-image-search-direct.ts "./image-test-input/IMG_8298 2.JPG" 5331');
    process.exit(1);
  }

  await testImageSearchDirect(imagePath, expectedProductId);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
