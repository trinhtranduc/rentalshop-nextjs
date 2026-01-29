/**
 * Test Image Search với hình ảnh local
 * 
 * Usage:
 *   tsx scripts/test-image-search.ts <image-path>
 *   tsx scripts/test-image-search.ts test-images/product1.jpg
 *   tsx scripts/test-image-search.ts test-images/  # Test tất cả hình trong folder
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

import * as fs from 'fs';
import * as path from 'path';

// Get API base URL from environment
function getApiBaseUrl(): string {
  // Priority 1: NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.trim();
    // Ensure it doesn't end with /api
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // Priority 2: Environment-based
  const env = process.env.NODE_ENV || process.env.APP_ENV || 'local';
  if (env === 'production' || env === 'prod') {
    return 'https://api.anyrent.shop/api';
  }
  
  // Default: dev API
  return 'https://dev-api.anyrent.shop/api';
}

const API_BASE_URL = getApiBaseUrl();

// Test credentials (có thể override bằng env)
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@rentalshop.com';
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

    // Check if response is HTML (error page)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await response.text();
      console.error('❌ Server returned HTML instead of JSON:');
      console.error('   This usually means:');
      console.error('   1. API server is not running');
      console.error('   2. API_BASE_URL is incorrect');
      console.error('   3. Endpoint does not exist');
      console.error(`\n   Current API_BASE_URL: ${API_BASE_URL}`);
      console.error(`   Try: yarn dev:api (to start API server)`);
      console.error(`   Or set NEXT_PUBLIC_API_URL in .env file`);
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
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check API server is running: yarn dev:api');
    console.error('   2. Check API_BASE_URL:', API_BASE_URL);
    console.error('   3. Check credentials:', TEST_EMAIL);
    console.error('   4. Try setting NEXT_PUBLIC_API_URL in .env file');
    throw error;
  }
}

/**
 * Test search với một hình ảnh
 */
async function testImageSearch(imagePath: string, token: string) {
  console.log(`\n📸 Testing image: ${imagePath}`);
  
  // Check file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ File not found: ${imagePath}`);
    return;
  }

  // Read file
  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  try {
    const startTime = Date.now();
    
    // Create FormData
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: getMimeType(imagePath) });
    formData.append('image', blob, fileName);
    formData.append('limit', '20');
    formData.append('minSimilarity', '0.3'); // Lower threshold for testing

    // Call API directly (updated endpoint)
    const response = await fetch(`${API_BASE_URL}/products/searchByImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ Search failed: ${error.message || response.statusText}`);
      return;
    }

    const data = await response.json();

    if (data.success && data.data) {
      console.log(`✅ Search completed in ${duration}ms`);
      console.log(`   Found ${data.data.total} products`);
      console.log(`   Query image: ${data.data.queryImage}`);
      
      if (data.data.products && data.data.products.length > 0) {
        console.log('\n📊 Top results:');
        data.data.products.slice(0, 5).forEach((product: any, index: number) => {
          console.log(
            `   ${index + 1}. ${product.name} - Similarity: ${((product.similarity || 0) * 100).toFixed(1)}%`
          );
        });
      } else {
        console.log('⚠️  No products found (similarity < 0.7)');
      }
    } else {
      console.error('❌ Search failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Get all image files from directory
 */
function getImageFiles(dirPath: string): string[] {
  const files = fs.readdirSync(dirPath);
  return files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    })
    .map(file => path.join(dirPath, file));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx scripts/test-image-search.ts <image-path>');
    console.error('  Example: tsx scripts/test-image-search.ts test-images/product1.jpg');
    console.error('  Example: tsx scripts/test-image-search.ts test-images/');
    process.exit(1);
  }

  const inputPath = args[0];
  
  // Check if path exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Path not found: ${inputPath}`);
    process.exit(1);
  }

  // Get image files
  let imageFiles: string[] = [];
  const stats = fs.statSync(inputPath);
  
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
    console.log(`📁 Found ${imageFiles.length} image(s) in directory`);
  } else {
    console.error(`❌ Invalid path: ${inputPath}`);
    process.exit(1);
  }

  // Login
  let token: string;
  try {
    token = await login();
  } catch (error) {
    console.error('❌ Failed to login. Please check:');
    console.error('   1. API server is running (yarn dev:api)');
    console.error('   2. Credentials are correct');
    console.error('   3. API_BASE_URL is correct');
    process.exit(1);
  }

  // Test each image
  console.log(`\n🚀 Testing ${imageFiles.length} image(s)...\n`);
  
  for (const imageFile of imageFiles) {
    await testImageSearch(imageFile, token);
  }

  console.log('\n✅ Test completed!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
