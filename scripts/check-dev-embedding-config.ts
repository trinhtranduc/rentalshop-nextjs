/**
 * Check embedding configuration on dev server
 * Usage: tsx scripts/check-dev-embedding-config.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDevEmbeddingConfig() {
  console.log('================================================================================');
  console.log('🔍 Checking Dev Server Embedding Configuration');
  console.log('================================================================================\n');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Checking Environment Variables...');
  const pythonApiUrl = process.env.PYTHON_EMBEDDING_API_URL;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  console.log(`   USE_PYTHON_EMBEDDING_API: ✅ true (default)`);
  console.log(`   PYTHON_EMBEDDING_API_URL: ${pythonApiUrl ? `✅ ${pythonApiUrl}` : '❌ NOT SET'}`);
  console.log(`   QDRANT_URL: ${qdrantUrl ? `✅ ${qdrantUrl.substring(0, 50)}...` : '❌ NOT SET'}`);
  console.log(`   QDRANT_API_KEY: ${qdrantApiKey ? `✅ ${qdrantApiKey.substring(0, 20)}...` : '❌ NOT SET'}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${awsAccessKeyId ? `✅ ${awsAccessKeyId.substring(0, 20)}...` : '❌ NOT SET'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${awsSecretAccessKey ? `✅ ${awsSecretAccessKey.substring(0, 20)}...` : '❌ NOT SET'}\n`);

  // Step 2: Test Python API health
  if (pythonApiUrl) {
    console.log('🏥 Step 2: Testing Python Embedding API Health...');
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
    }
    console.log('');
  } else {
    console.log('⚠️ Step 2: Skipping Python API health check (PYTHON_EMBEDDING_API_URL not set)\n');
  }

  // Step 3: Check recent products without embeddings
  console.log('📦 Step 3: Checking Recent Products Without Embeddings...');
  try {
    // First check if embeddingGeneratedAt column exists
    const tableInfo = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'embeddingGeneratedAt'
    `;
    
    const hasEmbeddingColumn = tableInfo.length > 0;
    console.log(`   Database schema: embeddingGeneratedAt column ${hasEmbeddingColumn ? '✅ exists' : '❌ does not exist'}`);
    
    if (!hasEmbeddingColumn) {
      console.log('   ⚠️ Migration for embeddingGeneratedAt has not been run yet');
      console.log('   💡 Run: yarn prisma migrate deploy (or migrate dev for local)');
    } else {
      const productsWithoutEmbeddings = await prisma.product.findMany({
        where: {
          embeddingGeneratedAt: null,
          images: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          barcode: true,
          images: true,
          embeddingGeneratedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      console.log(`   Found ${productsWithoutEmbeddings.length} products without embeddings:`);
      productsWithoutEmbeddings.forEach((product, index) => {
        const images = product.images ? (Array.isArray(product.images) ? product.images : [product.images]) : [];
        console.log(`   ${index + 1}. ID: ${product.id}, Name: ${product.name}, Barcode: ${product.barcode || 'N/A'}, Images: ${images.length}, Created: ${product.createdAt.toISOString()}`);
      });
    }
  } catch (error: any) {
    console.error(`   ❌ Error checking products: ${error.message}`);
    if (error.message.includes('embeddingGeneratedAt')) {
      console.error('   💡 This means the migration has not been run yet');
      console.error('   💡 Run: yarn prisma migrate deploy');
    }
  }
  console.log('');

  // Step 4: Summary and recommendations
  console.log('💡 Step 4: Summary and Recommendations...');
  const issues: string[] = [];

  if (!pythonApiUrl) {
    issues.push('PYTHON_EMBEDDING_API_URL is not set - required for embedding generation');
  }

  if (!qdrantUrl) {
    issues.push('QDRANT_URL is not set - required for storing embeddings');
  }

  if (!qdrantApiKey) {
    issues.push('QDRANT_API_KEY is not set - required for Qdrant Cloud');
  }

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    issues.push('AWS credentials not set - needed for downloading images from S3');
  }

  if (issues.length > 0) {
    console.log('   ❌ Issues found:');
    issues.forEach((issue, index) => {
      console.log(`      ${index + 1}. ${issue}`);
    });
    console.log('\n   💡 To fix:');
    console.log('      1. Set environment variables in Railway dashboard (dev environment)');
    console.log('      2. Or set them in .env file for local development');
    console.log('      3. Restart the API server after setting variables');
  } else {
    console.log('   ✅ All required environment variables are set!');
    console.log('   💡 If embeddings are still not generated, check server logs for errors.');
  }

  console.log('\n✅ Check completed');
}

// Set DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('   Please set: export DATABASE_URL="postgresql://..."');
  process.exit(1);
}

checkDevEmbeddingConfig()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
