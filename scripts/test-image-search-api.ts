#!/usr/bin/env tsx
/**
 * Test Image Search API với actual HTTP request
 * 
 * Usage:
 *   yarn tsx scripts/test-image-search-api.ts <imagePath> [token]
 * 
 * Example:
 *   yarn tsx scripts/test-image-search-api.ts './image-test-input/IMG_8298 2.JPG'
 *   yarn tsx scripts/test-image-search-api.ts './image-test-input/IMG_8298 2.JPG' 'eyJhbGci...'
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

import * as fs from 'fs';
import * as path from 'path';

// Get API base URL from environment
function getApiBaseUrl(): string {
  // Allow override via command line argument or environment variable
  const apiUrlArg = process.argv.find(arg => arg.startsWith('--api-url='));
  if (apiUrlArg) {
    const url = apiUrlArg.split('=')[1].trim();
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.trim();
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // Check for local development
  if (process.env.TEST_LOCAL === 'true' || process.argv.includes('--local')) {
    return 'http://localhost:3002/api';
  }
  
  const env = process.env.NODE_ENV || process.env.APP_ENV || 'local';
  if (env === 'production' || env === 'prod') {
    return 'https://api.anyrent.shop/api';
  }
  
  return 'https://dev-api.anyrent.shop/api';
}

const API_BASE_URL = getApiBaseUrl();

// Test credentials
const TEST_EMAIL = 'admin.outlet1@example.com';
const TEST_PASSWORD = '123456';

/**
 * Login để lấy JWT token
 */
async function login(): Promise<string> {
  console.log('🔐 Logging in...');
  console.log(`   API URL: ${API_BASE_URL}/auth/login`);
  console.log(`   Email: ${TEST_EMAIL}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await response.text();
      console.error('❌ Server returned HTML instead of JSON');
      console.error(`   Current API_BASE_URL: ${API_BASE_URL}`);
      console.error(`   Try: yarn dev:api (to start API server)`);
      throw new Error('Server returned HTML instead of JSON');
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // If can't parse JSON, use status text
      }
      throw new Error(`Login failed: ${errorMessage}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.token) {
      throw new Error('Invalid login response: missing token');
    }

    console.log('✅ Login successful');
    return data.data.token;
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

/**
 * Test image search API
 */
async function testImageSearchAPI(imagePath: string, token: string) {
  console.log(`\n🔍 Testing Image Search API`);
  console.log(`   Image: ${imagePath}`);
  console.log(`   API: ${API_BASE_URL}/products/searchByImage`);
  
  if (!existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    process.exit(1);
  }

  // Read image file
  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Determine MIME type
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[fileExtension] || 'image/jpeg';

  console.log(`   File size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`   MIME type: ${mimeType}`);

  // Create FormData
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('image', blob, fileName);
  formData.append('limit', '20');
  formData.append('minSimilarity', '0.5');

  try {
    console.log('\n📤 Sending request...');
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/products/searchByImage`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'x-app-version': '1.0.0',
        'x-client-platform': 'web',
        'x-device-type': 'browser',
      },
      body: formData,
    });

    const duration = Date.now() - startTime;
    console.log(`   Response time: ${duration}ms`);
    console.log(`   HTTP Status: ${response.status} ${response.statusText}`);

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await response.text();
      console.error('\n❌ Server returned HTML instead of JSON:');
      console.error('   This usually means the endpoint does not exist or server error');
      console.error(`   Response preview: ${html.substring(0, 200)}...`);
      return;
    }

    const data = await response.json();
    
    if (!response.ok) {
      console.error('\n❌ API Error:');
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log('\n✅ API Response:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Code: ${data.code || 'N/A'}`);
    console.log(`   Message: ${data.message || 'N/A'}`);
    
    // Show full response structure (for debugging)
    if (process.argv.includes('--verbose') || process.env.VERBOSE === 'true') {
      console.log('\n📋 Full Response JSON:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    if (data.data) {
      const products = data.data.products || [];
      const total = data.data.total || 0;
      
      console.log(`\n📊 Search Results:`);
      console.log(`   Total products found: ${total}`);
      console.log(`   Products returned: ${products.length}`);
      
      if (products.length > 0) {
        console.log(`\n   Top 5 results:`);
        products.slice(0, 5).forEach((product: any, index: number) => {
          const similarity = product.similarity 
            ? `${(product.similarity * 100).toFixed(2)}%` 
            : 'N/A';
          const similarityPercent = product.similarityPercent 
            ? `${product.similarityPercent}%` 
            : similarity;
          console.log(`\n      ${index + 1}. Product Details:`);
          console.log(`         ID: ${product.id || product.productId || 'N/A'}`);
          console.log(`         Name: ${product.name || 'N/A'}`);
          console.log(`         Barcode: ${product.barcode || 'N/A'}`);
          console.log(`         Similarity: ${similarityPercent}`);
          if (product.merchantId) {
            console.log(`         Merchant ID: ${product.merchantId}`);
          }
          if (product.merchant) {
            console.log(`         Merchant: ${product.merchant.name || product.merchant.id || 'N/A'} (ID: ${product.merchant.id || product.merchantId || 'N/A'})`);
          } else if (product.merchantId) {
            console.log(`         Merchant ID: ${product.merchantId}`);
          }
          if (product.rentPrice) {
            console.log(`         Rent Price: ${product.rentPrice}`);
          }
          if (product.salePrice) {
            console.log(`         Sale Price: ${product.salePrice}`);
          }
          if (product.category) {
            console.log(`         Category: ${product.category.name || product.category.id || 'N/A'} (ID: ${product.category.id || 'N/A'})`);
          }
          if (product.categoryId) {
            console.log(`         Category ID: ${product.categoryId}`);
          }
          if (product.images && product.images.length > 0) {
            const firstImage = Array.isArray(product.images) ? product.images[0] : product.images;
            console.log(`         Image: ${firstImage?.substring(0, 80)}${firstImage?.length > 80 ? '...' : ''}`);
          }
        });
        
        // Show debug info if available
        if (data.data?.debug) {
          console.log(`\n   📊 Debug Info:`);
          const debug = data.data.debug;
          if (debug.timing) {
            console.log(`      Total request: ${debug.timing.totalRequest || debug.timing.totalDuration || 'N/A'}ms`);
            if (debug.timing.pythonTiming) {
              console.log(`      Python embedding: ${debug.timing.pythonTiming.embedding || 'N/A'}ms`);
              console.log(`      Python search: ${debug.timing.pythonTiming.search || 'N/A'}ms`);
              console.log(`      Python fetch: ${debug.timing.pythonTiming.fetch || 'N/A'}ms`);
              console.log(`      Python total: ${debug.timing.pythonTiming.total || 'N/A'}ms`);
            } else {
              console.log(`      Image compression: ${debug.timing.imageCompression || 'N/A'}ms`);
              console.log(`      Embedding generation: ${debug.timing.embeddingGeneration || 'N/A'}ms`);
              console.log(`      Vector search: ${debug.timing.vectorSearch || 'N/A'}ms`);
              console.log(`      Product fetch: ${debug.timing.productDetailsFetch || 'N/A'}ms`);
            }
          }
          if (debug.compressionRatio) {
            console.log(`      Compression: ${debug.compressionRatio}% reduction`);
          }
        }
      } else {
        console.log(`\n   ⚠️  No products found`);
        console.log(`   Possible reasons:`);
        console.log(`   1. Similarity threshold too high (current: 0.5)`);
        console.log(`   2. No embeddings in Qdrant for this merchant/outlet`);
        console.log(`   3. Filters too strict`);
        console.log(`   4. Query image is too different from product images`);
      }
    } else {
      console.log(`\n   ⚠️  No data in response`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

async function main() {
  const imagePath = process.argv[2];
  const providedToken = process.argv[3];

  if (!imagePath) {
    console.error('❌ Please provide image path');
    console.log('\nUsage:');
    console.log('  yarn tsx scripts/test-image-search-api.ts <imagePath> [token] [--local] [--api-url=<url>]');
    console.log('\nExample:');
    console.log('  # Test with local dev server');
    console.log('  yarn tsx scripts/test-image-search-api.ts "./image-test-input/IMG_8298 2.JPG" --local');
    console.log('  # Test with dev server');
    console.log('  yarn tsx scripts/test-image-search-api.ts "./image-test-input/IMG_8298 2.JPG"');
    console.log('  # Test with custom API URL');
    console.log('  yarn tsx scripts/test-image-search-api.ts "./image-test-input/IMG_8298 2.JPG" --api-url=http://localhost:3002');
    console.log('  # Test with provided token');
    console.log('  yarn tsx scripts/test-image-search-api.ts "./image-test-input/IMG_8298 2.JPG" "eyJhbGci..."');
    process.exit(1);
  }

  let token = providedToken;
  if (!token) {
    token = await login();
  }

  await testImageSearchAPI(imagePath, token);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
