/**
 * Test embedding generation for a specific product
 * Usage: tsx scripts/test-embedding-generation.ts <productId>
 */

import { PrismaClient } from '@prisma/client';
import { generateProductEmbedding } from '../packages/database/src/jobs/generate-product-embeddings';

const prisma = new PrismaClient();

async function testEmbeddingGeneration(productId: number) {
  console.log('================================================================================');
  console.log(`🧪 Testing Embedding Generation for Product ID: ${productId}`);
  console.log('================================================================================\n');

  try {
    // Step 1: Check environment variables
    console.log('📋 Step 1: Checking Environment Variables...');
    // Note: USE_PYTHON_EMBEDDING_API defaults to true (Python embedding service is the default)
    const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    console.log(`   USE_PYTHON_EMBEDDING_API: ✅ true (default, Python embedding service is the default)`);
    console.log(`   PYTHON_EMBEDDING_API_URL: ${pythonApiUrl ? `✅ ${pythonApiUrl}` : '❌ NOT SET'}`);
    console.log(`   QDRANT_URL: ${qdrantUrl ? `✅ ${qdrantUrl.substring(0, 50)}...` : '❌ NOT SET'}`);
    console.log(`   QDRANT_API_KEY: ${qdrantApiKey ? `✅ ${qdrantApiKey.substring(0, 20)}...` : '❌ NOT SET'}\n`);

    if (!pythonApiUrl) {
      console.error('❌ ERROR: PYTHON_EMBEDDING_API_URL is not set');
      console.error('   Fix: Set PYTHON_EMBEDDING_API_URL=https://your-python-service.up.railway.app');
      return;
    }

    if (!qdrantUrl) {
      console.error('❌ ERROR: QDRANT_URL is not set');
      console.error('   Fix: Set QDRANT_URL=https://your-qdrant-cluster.qdrant.io');
      return;
    }

    if (!qdrantApiKey) {
      console.error('❌ ERROR: QDRANT_API_KEY is not set');
      console.error('   Fix: Set QDRANT_API_KEY=your-api-key');
      return;
    }

    // Step 2: Check product exists
    console.log('📦 Step 2: Checking Product...');
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        barcode: true,
        images: true,
        embeddingGeneratedAt: true,
      },
    });

    if (!product) {
      console.error(`❌ Product ${productId} not found`);
      return;
    }

    console.log(`   ✅ Product found: ${product.name} (Barcode: ${product.barcode})`);
    console.log(`   Images: ${product.images ? JSON.stringify(product.images).substring(0, 100) + '...' : 'None'}`);
    console.log(`   Embedding Generated At: ${product.embeddingGeneratedAt ? product.embeddingGeneratedAt.toISOString() : '❌ NOT SET'}\n`);

    // Step 3: Test Python API health
    console.log('🏥 Step 3: Testing Python Embedding API Health...');
    try {
      const healthResponse = await fetch(`${pythonApiUrl}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log(`   ✅ Python API is healthy:`, healthData);
      } else {
        console.error(`   ❌ Python API health check failed: ${healthResponse.status}`);
        const text = await healthResponse.text();
        console.error(`   Response: ${text}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to connect to Python API: ${error.message}`);
      console.error(`   URL: ${pythonApiUrl}`);
      return;
    }
    console.log('');

    // Step 4: Generate embedding
    console.log('🔄 Step 4: Generating Embedding...');
    try {
      await generateProductEmbedding(productId);
      console.log('   ✅ Embedding generation completed successfully!\n');

      // Step 5: Verify embedding was saved
      console.log('✅ Step 5: Verifying Embedding...');
      const updatedProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          embeddingGeneratedAt: true,
        },
      });

      if (updatedProduct?.embeddingGeneratedAt) {
        console.log(`   ✅ embeddingGeneratedAt is now set: ${updatedProduct.embeddingGeneratedAt.toISOString()}`);
      } else {
        console.warn(`   ⚠️ embeddingGeneratedAt is still not set (may need to check Qdrant)`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error generating embedding: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      throw error;
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Get product ID from command line
const productId = parseInt(process.argv[2]);
if (!productId || isNaN(productId)) {
  console.error('Usage: tsx scripts/test-embedding-generation.ts <productId>');
  console.error('Example: tsx scripts/test-embedding-generation.ts 5334');
  process.exit(1);
}

// Set DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('   Please set: export DATABASE_URL="postgresql://..."');
  process.exit(1);
}

testEmbeddingGeneration(productId);
