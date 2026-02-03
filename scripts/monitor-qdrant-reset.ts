/**
 * Monitor Qdrant Collection Reset Progress
 * 
 * Script để theo dõi tiến trình reset và regenerate embeddings
 * 
 * Usage:
 *   QDRANT_COLLECTION_ENV=product-images-pro yarn tsx scripts/monitor-qdrant-reset.ts
 * 
 * Or with auto-refresh:
 *   QDRANT_COLLECTION_ENV=product-images-pro yarn tsx scripts/monitor-qdrant-reset.ts --watch
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getVectorStore } from '../packages/database/src/ml/vector-store';
import { db } from '../packages/database/src';
import { parseProductImages } from '../packages/utils/src/utils/product-image-helpers';

// Load environment variables
function loadEnvFile(filePath: string): void {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();
          
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Load .env files
const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), nodeEnv === 'production' ? '.env.production' : '.env.development'),
  resolve(process.cwd(), '.env.production'),
  resolve(process.cwd(), '.env.development'),
  resolve(process.cwd(), '.env')
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
    break;
  }
}

/**
 * Get collection info from Qdrant
 */
async function getCollectionInfo(collectionName: string) {
  try {
    const vectorStore = getVectorStore();
    const info = await vectorStore.getCollectionInfo();
    return {
      exists: true,
      pointsCount: info.points_count || 0,
      vectorsCount: info.vectors_count || 0,
      status: info.status || 'unknown'
    };
  } catch (error: any) {
    if (error.message?.includes("doesn't exist")) {
      return {
        exists: false,
        pointsCount: 0,
        vectorsCount: 0,
        status: 'not_found'
      };
    }
    throw error;
  }
}

/**
 * Get total products with images from database
 */
async function getTotalProductsWithImages(): Promise<number> {
  try {
    const products = await db.products.search({
      limit: 999999,
      isActive: true,
    });

    let count = 0;
    for (const product of products.data || []) {
      const images = parseProductImages(product.images);
      if (images.length > 0) {
        const imageUrl = images[0];
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error('Error fetching products:', error);
    return 0;
  }
}

/**
 * Display progress
 */
async function displayProgress(collectionName: string, watch: boolean = false) {
  const startTime = Date.now();
  
  while (true) {
    try {
      // Clear screen if watching
      if (watch) {
        console.clear();
      }

      console.log('📊 Qdrant Collection Reset Progress Monitor');
      console.log('═══════════════════════════════════════════\n');
      
      // Get collection info
      const collectionInfo = await getCollectionInfo(collectionName);
      
      // Get total products with images
      console.log('📦 Fetching total products from database...');
      const totalProducts = await getTotalProductsWithImages();
      
      const currentPoints = collectionInfo.pointsCount;
      const progress = totalProducts > 0 
        ? ((currentPoints / totalProducts) * 100).toFixed(2)
        : '0.00';
      
      const remaining = Math.max(0, totalProducts - currentPoints);
      
      // Calculate estimated time remaining
      // Assume ~2-3 seconds per product on average
      const avgTimePerProduct = 2.5; // seconds
      const estimatedSecondsRemaining = remaining * avgTimePerProduct;
      const estimatedMinutes = Math.floor(estimatedSecondsRemaining / 60);
      const estimatedHours = Math.floor(estimatedMinutes / 60);
      const estimatedMins = estimatedMinutes % 60;
      
      // Display info
      console.log(`📋 Collection: ${collectionName}`);
      console.log(`   Status: ${collectionInfo.status === 'green' ? '✅ Active' : collectionInfo.status}`);
      console.log(`\n📊 Progress:`);
      console.log(`   Current points: ${currentPoints.toLocaleString()}`);
      console.log(`   Total products: ${totalProducts.toLocaleString()}`);
      console.log(`   Remaining: ${remaining.toLocaleString()}`);
      console.log(`   Progress: ${progress}%`);
      
      // Progress bar
      const barWidth = 50;
      const filled = Math.floor((currentPoints / totalProducts) * barWidth);
      const empty = barWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      console.log(`   [${bar}] ${progress}%`);
      
      if (remaining > 0) {
        console.log(`\n⏱️  Estimated time remaining:`);
        if (estimatedHours > 0) {
          console.log(`   ${estimatedHours}h ${estimatedMins}m`);
        } else {
          console.log(`   ${estimatedMins}m`);
        }
      } else {
        console.log(`\n✅ Regeneration completed!`);
      }
      
      // Display timestamp
      const now = new Date();
      console.log(`\n🕐 Last updated: ${now.toLocaleString()}`);
      
      if (!watch) {
        break;
      }
      
      // Wait 10 seconds before next update
      console.log(`\n⏳ Refreshing in 10 seconds... (Press Ctrl+C to stop)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error: any) {
      console.error('\n❌ Error monitoring progress:', error.message);
      if (!watch) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

/**
 * Main function
 */
async function main() {
  const collectionName = process.env.QDRANT_COLLECTION_ENV || 'product-images-dev';
  const watch = process.argv.includes('--watch') || process.argv.includes('-w');
  
  console.log(`🔍 Monitoring collection: ${collectionName}`);
  if (watch) {
    console.log(`👀 Watch mode: Auto-refresh every 10 seconds\n`);
  }
  
  await displayProgress(collectionName, watch);
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
