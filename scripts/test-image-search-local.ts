/**
 * Test Image Search trực tiếp với embedding service (không cần API server)
 * 
 * Usage:
 *   tsx scripts/test-image-search-local.ts <image-path>
 *   tsx scripts/test-image-search-local.ts image-test-input/IMG_8302\ 2.JPG
 */

// Load environment variables
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
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

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

// Import ML services
import { FashionImageEmbedding } from '../packages/database/src/ml/image-embeddings';
import { ProductVectorStore } from '../packages/database/src/ml/vector-store';

/**
 * Test image search với một hình
 */
async function testImageSearch(imagePath: string) {
  console.log(`\n🔍 Testing image search with: ${imagePath}\n`);

  try {
    // Initialize services
    const embeddingService = new FashionImageEmbedding();
    const vectorStore = new ProductVectorStore();

    console.log('📸 Loading image...');
    const fileBuffer = readFileSync(imagePath);
    console.log(`   Image size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Generate embedding
    console.log('🔄 Generating embedding...');
    const startTime = Date.now();
    const queryEmbedding = await embeddingService.generateEmbeddingFromBuffer(fileBuffer);
    const embeddingTime = Date.now() - startTime;
    console.log(`✅ Embedding generated (${embeddingTime}ms, dimension: ${queryEmbedding.length})`);

    // Search in Qdrant
    console.log('🔍 Searching in Qdrant...');
    const searchStartTime = Date.now();
    const results = await vectorStore.search(queryEmbedding, {
      limit: 10,
      minSimilarity: 0.7
    });
    const searchTime = Date.now() - searchStartTime;
    console.log(`✅ Search completed (${searchTime}ms)`);

    // Display results
    console.log(`\n📊 Found ${results.length} similar images:\n`);
    
    if (results.length === 0) {
      console.log('⚠️  No similar images found (similarity < 0.7)');
      console.log('💡 Try lowering minSimilarity or check if test images are indexed');
    } else {
      results.forEach((result, index) => {
        const similarity = (result.similarity * 100).toFixed(1);
        const metadata = result.metadata as any;
        const fileName = metadata?.fileName || metadata?.imageUrl || 'Unknown';
        const productName = metadata?.productName || metadata?.productId || 'Unknown';
        const isTestImage = metadata?.isTestImage ? '🧪 TEST' : '📦 PRODUCT';
        
        console.log(`   ${index + 1}. ${isTestImage} ${productName}`);
        console.log(`      Similarity: ${similarity}%`);
        console.log(`      File: ${fileName}`);
        if (metadata?.imageUrl && metadata.imageUrl !== fileName) {
          console.log(`      URL: ${metadata.imageUrl}`);
        }
        if (metadata?.productId) {
          console.log(`      Product ID: ${metadata.productId}`);
        }
        console.log('');
      });
    }

    console.log(`\n⏱️  Total time: ${Date.now() - startTime}ms`);
    console.log(`   - Embedding: ${embeddingTime}ms`);
    console.log(`   - Search: ${searchTime}ms`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Get all image files from directory
 */
function getImageFiles(dirPath: string): string[] {
  const files = readdirSync(dirPath);
  return files
    .filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
    })
    .map(file => resolve(dirPath, file));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx scripts/test-image-search-local.ts <image-path>');
    console.error('  Example: tsx scripts/test-image-search-local.ts image-test-input/IMG_8302\\ 2.JPG');
    console.error('  Example: tsx scripts/test-image-search-local.ts image-test-input/');
    process.exit(1);
  }

  const inputPath = resolve(process.cwd(), args[0]);
  
  // Check if path exists
  if (!existsSync(inputPath)) {
    console.error(`❌ Path not found: ${inputPath}`);
    process.exit(1);
  }

  // Get image files
  let imageFiles: string[] = [];
  const stats = statSync(inputPath);
  
  if (stats.isFile()) {
    // Single file
    imageFiles = [inputPath];
  } else if (stats.isDirectory()) {
    // Directory - get all images
    imageFiles = getImageFiles(inputPath);
    if (imageFiles.length === 0) {
      console.error(`❌ No image files found in: ${inputPath}`);
      process.exit(1);
    }
    console.log(`📁 Found ${imageFiles.length} image(s) in directory\n`);
  } else {
    console.error(`❌ Invalid path: ${inputPath}`);
    process.exit(1);
  }

  // Test each image
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    if (i > 0) {
      console.log('\n' + '='.repeat(60) + '\n');
    }
    await testImageSearch(imagePath);
  }

  console.log('\n✅ All tests completed!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
