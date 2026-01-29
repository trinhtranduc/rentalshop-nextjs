#!/usr/bin/env tsx
/**
 * Test embedding generation when creating/updating products
 * 
 * Usage:
 *   yarn tsx scripts/test-product-embedding-generation.ts [productId]
 * 
 * If productId provided, will test update flow
 * If no productId, will create a new test product
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

import { db } from '../packages/database/src';
import { getVectorStore } from '../packages/database/src/server';
import { generateProductEmbedding } from '../packages/database/src/jobs/generate-product-embeddings';

// Get API base URL
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.trim();
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  const env = process.env.NODE_ENV || process.env.APP_ENV || 'local';
  if (env === 'production' || env === 'prod') {
    return 'https://api.anyrent.shop/api';
  }
  
  return 'https://dev-api.anyrent.shop/api';
}

const API_BASE_URL = getApiBaseUrl();
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin.outlet1@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.message || response.statusText}`);
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
 * Check Qdrant collection point count
 */
async function checkQdrantPoints(): Promise<number> {
  try {
    const vectorStore = getVectorStore();
    const collectionInfo = await vectorStore.getCollectionInfo();
    return collectionInfo.points_count || 0;
  } catch (error: any) {
    console.error('❌ Error checking Qdrant:', error.message);
    return 0;
  }
}

/**
 * Test embedding generation for a product
 */
async function testEmbeddingGeneration(productId: number) {
  console.log(`\n🔍 Testing embedding generation for product ${productId}...\n`);
  
  // Step 1: Check initial Qdrant points
  console.log('📊 Step 1: Checking initial Qdrant points...');
  const initialPoints = await checkQdrantPoints();
  console.log(`   Initial points in Qdrant: ${initialPoints}\n`);
  
  // Step 2: Get product info
  console.log('📦 Step 2: Fetching product info...');
  const product = await db.products.findById(productId);
  if (!product) {
    console.error(`❌ Product ${productId} not found!`);
    process.exit(1);
  }
  
  console.log(`   Product ID: ${product.id}`);
  console.log(`   Name: ${product.name}`);
  console.log(`   Merchant ID: ${product.merchantId}`);
  console.log(`   Images: ${product.images || 'None'}\n`);
  
  // Parse images
  let imageUrls: string[] = [];
  if (product.images) {
    if (Array.isArray(product.images)) {
      imageUrls = product.images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) {
          imageUrls = parsed.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
        } else {
          imageUrls = product.images.split(',').map((url: string) => url.trim()).filter(Boolean);
        }
      } catch {
        imageUrls = product.images.split(',').map((url: string) => url.trim()).filter(Boolean);
      }
    }
  }
  
  console.log(`   Parsed ${imageUrls.length} image URL(s)`);
  if (imageUrls.length > 0) {
    imageUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url.substring(0, 80)}...`);
    });
  } else {
    console.log(`   ⚠️ No images found, cannot generate embeddings`);
    process.exit(1);
  }
  
  // Step 3: Check Python API config
  console.log('\n🐍 Step 3: Checking Python API configuration...');
  const usePythonApi = process.env.USE_PYTHON_EMBEDDING_API === 'true';
  const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;
  console.log(`   USE_PYTHON_EMBEDDING_API: ${usePythonApi} (${process.env.USE_PYTHON_EMBEDDING_API || 'undefined'})`);
  console.log(`   PYTHON_EMBEDDING_API_URL: ${pythonApiUrl || 'NOT SET'}`);
  
  if (!usePythonApi) {
    console.error(`\n❌ USE_PYTHON_EMBEDDING_API is not set to 'true'!`);
    console.error(`   Please set USE_PYTHON_EMBEDDING_API=true in environment variables`);
    process.exit(1);
  }
  
  if (!pythonApiUrl) {
    console.error(`\n❌ PYTHON_EMBEDDING_API_URL is not set!`);
    console.error(`   Please set PYTHON_EMBEDDING_API_URL in environment variables`);
    process.exit(1);
  }
  
  // Step 4: Test Python API health
  console.log('\n🏥 Step 4: Testing Python API health...');
  try {
    const healthUrl = pythonApiUrl.startsWith('http') 
      ? pythonApiUrl 
      : `https://${pythonApiUrl}`;
    const healthResponse = await fetch(`${healthUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   ✅ Python API is healthy`);
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Model loaded: ${healthData.model_loaded || false}`);
    } else {
      console.warn(`   ⚠️ Python API health check failed: ${healthResponse.status}`);
    }
  } catch (error: any) {
    console.warn(`   ⚠️ Could not reach Python API: ${error.message}`);
  }
  
  // Step 5: Generate embeddings
  console.log('\n🔄 Step 5: Generating embeddings...');
  const startTime = Date.now();
  
  try {
    await generateProductEmbedding(productId);
    const duration = Date.now() - startTime;
    console.log(`\n✅ Embedding generation completed in ${duration}ms`);
  } catch (error: any) {
    console.error(`\n❌ Embedding generation failed:`, error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
  
  // Step 6: Verify Qdrant points increased
  console.log('\n📊 Step 6: Verifying Qdrant points...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for async operations
  const finalPoints = await checkQdrantPoints();
  const pointsAdded = finalPoints - initialPoints;
  
  console.log(`   Initial points: ${initialPoints}`);
  console.log(`   Final points: ${finalPoints}`);
  console.log(`   Points added: ${pointsAdded}`);
  
  if (pointsAdded > 0) {
    console.log(`\n✅ SUCCESS: ${pointsAdded} new point(s) added to Qdrant!`);
  } else if (pointsAdded === 0) {
    console.log(`\n⚠️ WARNING: No new points added. Possible reasons:`);
    console.log(`   1. Embeddings already exist for this product`);
    console.log(`   2. Embedding generation failed silently`);
    console.log(`   3. Qdrant storage failed`);
  } else {
    console.log(`\n⚠️ WARNING: Points decreased (${pointsAdded}). Possible data cleanup.`);
  }
  
  // Step 7: Check embeddings for this product
  console.log('\n🔍 Step 7: Checking embeddings for this product...');
  try {
    const vectorStore = getVectorStore();
    const qdrantClient = (vectorStore as any).client;
    const collectionName = (vectorStore as any).collectionName;
    
    // Scroll to find points with matching productId
    let foundPoints = 0;
    let offset: string | undefined = undefined;
    
    do {
      const scrollResult = await qdrantClient.scroll(collectionName, {
        limit: 100,
        offset,
        with_payload: true,
        with_vector: false
      });
      
      const points = scrollResult.points || [];
      const matchingPoints = points.filter((point: any) => {
        const payload = point.payload || {};
        return String(payload.productId) === String(productId);
      });
      
      foundPoints += matchingPoints.length;
      offset = scrollResult.next_page_offset;
    } while (offset);
    
    console.log(`   Found ${foundPoints} embedding(s) for product ${productId}`);
    
    if (foundPoints > 0) {
      console.log(`\n✅ Product has embeddings in Qdrant!`);
    } else {
      console.log(`\n❌ Product has NO embeddings in Qdrant!`);
    }
  } catch (error: any) {
    console.error(`   ⚠️ Error checking embeddings:`, error.message);
  }
}

/**
 * Create a test product
 */
async function createTestProduct(token: string): Promise<number> {
  console.log('\n📦 Creating test product...');
  
  // Get merchant ID from user
  const merchantId = 1; // Default to merchant 1
  
  // Create product with test image
  const productData = {
    name: `Test Product Embedding ${Date.now()}`,
    description: 'Test product for embedding generation',
    rentPrice: 100000,
    salePrice: 200000,
    deposit: 50000,
    images: ['https://dev-images.anyrent.shop/products/merchant-1/test-image.jpg'], // Use existing image URL
    outletStock: [
      {
        outletId: 1,
        stock: 10
      }
    ]
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-app-version': '1.0.0',
        'x-client-platform': 'web',
      },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create product: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    const productId = data.data?.id;
    
    if (!productId) {
      throw new Error('Product created but no ID returned');
    }
    
    console.log(`✅ Test product created: ID ${productId}`);
    return productId;
  } catch (error: any) {
    console.error(`❌ Failed to create test product:`, error.message);
    throw error;
  }
}

async function main() {
  const productIdArg = process.argv[2];
  
  if (productIdArg) {
    // Test with existing product
    const productId = parseInt(productIdArg);
    if (isNaN(productId)) {
      console.error('❌ Invalid product ID');
      process.exit(1);
    }
    await testEmbeddingGeneration(productId);
  } else {
    // Create test product and test
    console.log('🔍 No product ID provided, will create test product...\n');
    const token = await login();
    const productId = await createTestProduct(token);
    
    // Wait a bit for product creation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test embedding generation
    await testEmbeddingGeneration(productId);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
