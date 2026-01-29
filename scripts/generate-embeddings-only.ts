/**
 * Generate embeddings only (skip health check and initialization)
 * 
 * MỤC ĐÍCH:
 * - Tạo embeddings (vector 512 chiều) cho tất cả products có ảnh
 * - Lưu embeddings vào Qdrant vector database
 * - Cho phép tìm kiếm sản phẩm bằng hình ảnh (image search)
 * 
 * Use this if:
 * - Collection already exists (created via dashboard)
 * - Qdrant is running but health check fails
 * - You want to regenerate embeddings only
 * 
 * Usage:
 *   tsx scripts/generate-embeddings-only.ts
 */

// Load environment variables from .env.local or .env
// Using Node.js built-in fs to read and parse .env files
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Try to load .env.local first, then .env
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

loadEnvFile(envLocalPath);
loadEnvFile(envPath);

// Import directly from ML files to avoid auth package dependencies
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';
import { ProductVectorStore } from '../packages/database/src/ml/vector-store';
// Use PrismaClient directly to avoid auth package dependencies
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Parse product images from database (handles JSON string, array, or comma-separated string)
 */
function parseProductImages(images: any): string[] {
  if (!images) return [];
  
  if (typeof images === 'string') {
    // Try parsing as JSON first (if starts with [ or {)
    if (images.trim().startsWith('[') || images.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Fall through to comma-separated handling
      }
    }
    // Handle comma-separated string or single URL
    return images.split(',').filter(Boolean).map((url: string) => url.trim());
  }
  
  if (Array.isArray(images)) {
    return images.map(String).filter(Boolean);
  }
  
  return [];
}

async function main() {
  console.log('🎨 Generating product embeddings...\n');
  console.log('📋 Purpose: Create vector embeddings for image search\n');

  // Create Prisma client instance
  const prisma = new PrismaClient();

  // Check if products with images exist
  console.log('🔍 Checking products with images in database...');
  try {
    // Get all products with images using Prisma directly
    const productsWithImages = await prisma.product.findMany({
      where: {
        images: {
          not: Prisma.JsonNull
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        images: true,
        merchantId: true,
        categoryId: true
      },
      take: 10 // Just check first 10
    });

    if (productsWithImages.length === 0) {
      console.error('\n❌ No products with images found in database!');
      console.error('\n💡 To add products with images:');
      console.error('   1. Create products via API or admin dashboard');
      console.error('   2. Upload images when creating/updating products');
      console.error('   3. Images should be stored in S3 or accessible URLs');
      process.exit(1);
    }

    // Count total products with images
    const totalCount = await prisma.product.count({
      where: {
        images: {
          not: Prisma.JsonNull
        },
        isActive: true
      }
    });

    console.log(`✅ Found ${totalCount} product(s) with images`);
    console.log(`📋 Sample products: ${productsWithImages.slice(0, 3).map(p => p.name).join(', ')}${totalCount > 3 ? '...' : ''}`);
    
    // Check if images are from AWS S3
    const sampleImages = productsWithImages
      .filter(p => p.images)
      .map(p => {
        const imgs = parseProductImages(p.images);
        return imgs[0];
      })
      .filter(Boolean);
    
    if (sampleImages.length > 0) {
      const s3Count = sampleImages.filter((url: string) => 
        url.includes('s3.amazonaws.com') || url.includes('amazonaws.com') || url.includes('.s3.')
      ).length;
      
      if (s3Count > 0) {
        console.log(`☁️  Detected AWS S3 images: ${s3Count}/${sampleImages.length} sample images are from S3`);
        console.log(`   ✅ Script supports S3 URLs - images will be downloaded automatically\n`);
      }
    } else {
      console.log('');
    }

    // Get all products with images for processing
    console.log('📦 Fetching all products with images...');
    const allProducts = await prisma.product.findMany({
      where: {
        images: {
          not: Prisma.JsonNull
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        images: true,
        merchantId: true,
        categoryId: true
      }
    });

    console.log(`📊 Processing ${allProducts.length} products...\n`);

    // Initialize services (create instances directly to avoid auth dependencies)
    const embeddingService = new FashionImageEmbedding();
    const vectorStore = new ProductVectorStore();

    // Process in batches
    const batchSize = 10;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allProducts.length / batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

      // Generate embeddings
      const embeddings = await Promise.all(
        batch.map(async (product) => {
          try {
            // Parse images using helper function
            const images = parseProductImages(product.images);

            if (images.length === 0) {
              return null;
            }

            const imageUrl = images[0];
            if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
              return null;
            }

            // Log image URL (AWS S3 URLs are supported)
            const isS3Url = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('amazonaws.com') || imageUrl.includes('.s3.');
            if (isS3Url) {
              console.log(`  📸 Processing S3 image: ${product.name} (${imageUrl.substring(0, 60)}...)`);
            }

            // Generate embedding (downloads from S3 URL automatically)
            const embedding = await embeddingService.generateEmbedding(imageUrl);
            
            return {
              productId: product.id,
              embedding,
              metadata: {
                productId: String(product.id),
                imageUrl,
                merchantId: String(product.merchantId),
                categoryId: product.categoryId ? String(product.categoryId) : undefined,
                // Sanitize productName to avoid Unicode issues with Qdrant
                // Remove diacritics and keep only ASCII-safe characters
                productName: product.name 
                  ? product.name
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
                      .trim()
                  : undefined
              }
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Error processing product ${product.id} (${product.name}):`, errorMessage);
            
            // Check if it's an S3 access issue
            if (errorMessage.includes('403') || errorMessage.includes('Access Denied')) {
              console.error(`   ⚠️ S3 access denied - check bucket permissions or use signed URLs`);
            } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
              console.error(`   ⚠️ Image not found - check if URL is correct`);
            }
            
            errors++;
            return null;
          }
        })
      );

      // Filter out nulls (errors or no images)
      const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
        productId: number;
        embedding: number[];
        metadata: any;
      }>;

      // Store in batch
      if (validEmbeddings.length > 0) {
        await vectorStore.storeEmbeddingsBatch(validEmbeddings);
        processed += validEmbeddings.length;
      }

      console.log(`✅ Processed ${validEmbeddings.length} products (${processed}/${allProducts.length} total)`);
    }

    console.log('\n✅ Embeddings generated successfully!');
    console.log(`📊 Summary: ${processed} processed, ${errors} errors`);
    console.log('🎯 Ready to use image search!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Failed to generate embeddings:', errorMessage);
    console.error('\n💡 Make sure:');
    console.error('   1. Qdrant is running (http://localhost:6333/dashboard)');
    console.error('   2. Collection "product-images" exists');
    console.error('   3. Products have images in database');
    console.error('   4. AWS credentials are set (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    console.error('   5. Database connection is working');
    process.exit(1);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
