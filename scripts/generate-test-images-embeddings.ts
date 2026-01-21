/**
 * Generate embeddings cho test images trong folder test-images/
 * 
 * MỤC ĐÍCH:
 * - Generate embeddings cho tất cả images trong test-images/
 * - Lưu embeddings vào Qdrant với metadata riêng
 * - Sau này có thể dùng để test search với hình khác
 * 
 * Usage:
 *   tsx scripts/generate-test-images-embeddings.ts
 */

// Load environment variables
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

// Import ML services
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';
import { ProductVectorStore } from '../packages/database/src/ml/vector-store';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

/**
 * Generate embedding từ local file buffer
 * Sử dụng method generateEmbeddingFromBuffer của embedding service (cách chuẩn)
 */
async function generateEmbeddingFromBuffer(
  imageBuffer: Buffer,
  embeddingService: FashionImageEmbedding
): Promise<number[]> {
  try {
    // Dùng method generateEmbeddingFromBuffer trực tiếp (không cần convert qua data URL)
    // Cách này hiệu quả hơn và là cách chuẩn
    const embedding = await embeddingService.generateEmbeddingFromBuffer(imageBuffer);
    return embedding;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Get all image files from directory
 */
function getImageFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath);
  return files
    .filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
    })
    .map(file => resolve(dirPath, file))
    .filter(filePath => {
      const stats = statSync(filePath);
      return stats.isFile();
    });
}

/**
 * Convert local file to data URL or serve via local server
 * For now, we'll use file:// protocol (Qdrant embedding service will handle it)
 */
function getImageUrl(filePath: string): string {
  // Return file path - embedding service will read it directly
  return filePath;
}

async function main() {
  console.log('🎨 Generating embeddings for test images...\n');
  console.log('📋 Purpose: Create embeddings for test images to enable search\n');

  const testImagesDir = resolve(process.cwd(), 'test-images');
  
  // Check if test-images folder exists
  if (!existsSync(testImagesDir)) {
    console.error(`❌ Test images folder not found: ${testImagesDir}`);
    console.error('💡 Please create test-images/ folder and add test images');
    process.exit(1);
  }

  // Get all image files
  const imageFiles = getImageFiles(testImagesDir);
  
  if (imageFiles.length === 0) {
    console.error(`❌ No image files found in: ${testImagesDir}`);
    console.error('💡 Please add JPG, PNG, or WebP images to test-images/ folder');
    process.exit(1);
  }

  console.log(`✅ Found ${imageFiles.length} test image(s)\n`);

  // Sanitize QDRANT environment variables to avoid Unicode issues
  const qdrantUrl = (process.env.QDRANT_URL || 'http://localhost:6333')
    .replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII
  const qdrantApiKey = process.env.QDRANT_API_KEY
    ? process.env.QDRANT_API_KEY.replace(/[^\x00-\x7F]/g, '')
    : undefined;

  // Set sanitized values
  if (qdrantUrl !== process.env.QDRANT_URL) {
    process.env.QDRANT_URL = qdrantUrl;
  }
  if (qdrantApiKey && qdrantApiKey !== process.env.QDRANT_API_KEY) {
    process.env.QDRANT_API_KEY = qdrantApiKey;
  }

  // Initialize services
  const modelName = process.env.IMAGE_SEARCH_MODEL || 'Xenova/clip-vit-base-patch32';
  console.log(`🤖 Using AI Model: ${modelName}`);
  console.log('   (Model sẽ được download lần đầu, ~500MB)');
  console.log('   💡 Tip: Có thể dùng "patrickjohncyh/fashion-clip" cho fashion-specific\n');
  
  const embeddingService = new FashionImageEmbedding(modelName);
  const vectorStore = new ProductVectorStore();
  
  console.log('✅ Services initialized\n');

  // Process in batches
  const batchSize = 5; // Smaller batch for local files
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(imageFiles.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} images)...`);

    // Generate embeddings
    const embeddings = await Promise.all(
      batch.map(async (filePath) => {
        try {
          const rawFileName = filePath.split('/').pop() || 'unknown';
          // Sanitize fileName immediately to avoid Unicode issues
          const fileName = rawFileName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
            .trim();
          console.log(`  📸 Processing: ${rawFileName} → ${fileName}`);

          // Read file buffer
          const fileBuffer = readFileSync(filePath);
          
          // Generate embedding from buffer using embedding service (cách chuẩn)
          const embedding = await generateEmbeddingFromBuffer(fileBuffer, embeddingService);
          
          // Sanitize fileName to avoid Unicode issues
          const sanitizedFileName = fileName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
            .replace(/[^a-zA-Z0-9.-]/g, '-') // Replace special chars with dash
            .trim();

          // Sanitize filePath (remove Unicode, keep only ASCII-safe path)
          const sanitizedPath = filePath
            .split('/')
            .map(part => part
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^\x00-\x7F]/g, '')
            )
            .join('/');

          return {
            imageId: randomUUID(), // Qdrant requires UUID or integer, not string
            embedding,
            metadata: {
              productId: `test-${sanitizedFileName}`,
              imageUrl: sanitizedPath, // Sanitized path
              merchantId: 'test',
              productName: sanitizedFileName.replace(/\.[^/.]+$/, '').trim(),
              isTestImage: true,
              fileName: sanitizedFileName
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Error processing ${filePath}:`, errorMessage);
          errors++;
          return null;
        }
      })
    );

    // Filter out nulls
    const validEmbeddings = embeddings.filter(e => e !== null) as Array<{
      imageId: string;
      embedding: number[];
      metadata: any;
    }>;

    // Store in batch
    if (validEmbeddings.length > 0) {
      // Convert to format expected by vectorStore
      // Sanitize all strings to avoid Unicode issues with Qdrant
      const points = validEmbeddings.map(({ imageId, embedding, metadata }) => ({
        id: imageId, // UUID is already ASCII-safe
        vector: embedding,
        payload: {
          productId: String(metadata.productId).replace(/[^\x00-\x7F]/g, ''),
          imageUrl: String(metadata.imageUrl).replace(/[^\x00-\x7F]/g, ''),
          merchantId: String(metadata.merchantId),
          productName: metadata.productName ? String(metadata.productName).replace(/[^\x00-\x7F]/g, '') : undefined,
          isTestImage: true,
          fileName: metadata.fileName ? String(metadata.fileName).replace(/[^\x00-\x7F]/g, '') : undefined,
          updatedAt: new Date().toISOString()
        }
      }));

      try {
        await vectorStore['client'].upsert('product-images', {
          points
        });
        processed += validEmbeddings.length;
        console.log(`✅ Stored ${validEmbeddings.length} embeddings (${processed}/${imageFiles.length} total)`);
      } catch (error) {
        console.error(`❌ Error storing embeddings:`, error);
        errors += validEmbeddings.length;
      }
    }
  }

  console.log('\n✅ Test images embeddings generated successfully!');
  console.log(`📊 Summary: ${processed} processed, ${errors} errors`);
  console.log('🎯 Test images are now searchable!');
  console.log('\n💡 You can now test search with other images using:');
  console.log('   yarn test:image-search <other-image-path>');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
