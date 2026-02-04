/**
 * Image Embedding Service
 * Python-first implementation:
 * - ONLY uses external Python FastAPI service to generate embeddings
 * - Avoids Node.js native memory corruption issues on Railway (free(): invalid size)
 *
 * Required env:
 * - PYTHON_EMBEDDING_API_URL=https://python-embedding-service-*.up.railway.app
 * 
 * Note: USE_PYTHON_EMBEDDING_API defaults to true (Python embedding service is the default)
 */

function shouldUsePythonEmbeddingApi(): boolean {
  // Default to true (Python embedding service is the default and only supported method)
  // Only return false if explicitly set to 'false'
  const envValue = process.env.USE_PYTHON_EMBEDDING_API;
  if (envValue === 'false') {
    return false;
  }
  return true; // Default to true
}

function getPythonEmbeddingApiUrl(): string {
  const url = process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';
  
  // Ensure URL has a protocol (https:// or http://)
  // This fixes issues where env var might be set without protocol (e.g., Railway public domain)
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    // Default to https:// for production URLs (Railway, etc.)
    return `https://${url}`;
  }
  
  return url;
}

/**
 * OPTIMIZATION: Connection pooling via global fetch with keepAlive
 * Node.js 18+ fetch API automatically uses connection pooling when available
 * For better performance, we can set keepAlive via environment variable or use undici
 * 
 * Note: Native fetch in Node.js 18+ already has connection pooling built-in,
 * but we can optimize further by ensuring proper configuration
 */

export class FashionImageEmbedding {
  /**
   * Normalize vector để dùng cosine similarity
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitude === 0) {
      return vector; // Zero vector
    }
    
    return vector.map(val => val / magnitude);
  }

  /**
   * Warm-up (Python API)
   * - Checks /health and ensures model is loaded on the Python service
   */
  async warmUp(): Promise<void> {
    // Python embedding service is the default (shouldUsePythonEmbeddingApi() defaults to true)
    const baseUrl = getPythonEmbeddingApiUrl();
    const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Python Embedding API health check failed (${response.status}): ${text}`);
    }
    const data: any = await response.json();
    if (data?.status !== 'healthy' || data?.model_loaded !== true) {
      throw new Error(`Python Embedding API not ready: ${JSON.stringify(data)}`);
    }
    console.log('✅ Python Embedding API warm-up successful');
  }

  /**
   * Generate embedding via Python FastAPI service
   *
   * Why:
   * - Avoids Node.js native memory corruption issues seen on Railway with transformers.js/sharp/onnxruntime
   * - Python (transformers + torch) is more stable for this workload
   *
   * Env:
   * - PYTHON_EMBEDDING_API_URL=https://<your-service>.up.railway.app (required)
   * 
   * Note: Python embedding service is the default (USE_PYTHON_EMBEDDING_API defaults to true)
   */
  private async generateEmbeddingViaPythonApi(imageBuffer: Buffer): Promise<number[]> {
    const baseUrl = getPythonEmbeddingApiUrl();
    const imageSizeKB = (imageBuffer.length / 1024).toFixed(1);
    const imageSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
    
    // Skip very large images (>10MB) to avoid timeout
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxImageSize) {
      throw new Error(`Image too large (${imageSizeMB}MB). Maximum size is 10MB. Skipping to avoid timeout.`);
    }
    
    console.log(`🔄 Using Python Embedding API: ${baseUrl} (image: ${imageSizeKB}KB)`);

    const formData = new FormData();
    // Convert Buffer -> Uint8Array for Blob (avoids TS/SharedArrayBuffer issues)
    const uint8Array = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    // OPTIMIZATION: Node.js 18+ fetch API automatically uses connection pooling
    // For additional optimization, we can set keepAlive headers
    // Connection pooling is handled automatically by the runtime
    // Add timeout to prevent hanging
    // Production may need more time due to larger images, higher load, or network latency
    // Auto-detect production environment and use longer timeout
    const controller = new AbortController();
    const isProduction = process.env.QDRANT_COLLECTION_ENV === 'production' || 
                         process.env.QDRANT_COLLECTION_ENV === 'prod' ||
                         process.env.NODE_ENV === 'production';
    
    // Production: 5 minutes (300s) - Python API may be slow under load
    // Development: 90 seconds
    const defaultTimeout = isProduction ? 300000 : 90000; // 300s (5min) for production, 90s for dev
    const timeoutMs = process.env.PYTHON_EMBEDDING_TIMEOUT 
      ? parseInt(process.env.PYTHON_EMBEDDING_TIMEOUT, 10) 
      : defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Measure network + processing time
    const apiCallStartTime = Date.now();
    
    try {
      const networkStartTime = Date.now();
      const response = await fetch(`${baseUrl}/embed`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Keep connection alive for better performance (Node.js handles this automatically)
        headers: {
          'Connection': 'keep-alive',
        },
      });
      
      const networkDuration = Date.now() - networkStartTime;
      clearTimeout(timeoutId);
      
      console.log(`  📡 Network time (request sent): ${networkDuration}ms`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Python Embedding API error (${response.status}): ${text}`);
      }

      const parseStartTime = Date.now();
      const data: any = await response.json();
      const parseDuration = Date.now() - parseStartTime;
      
      const embedding: unknown = data?.embedding;
      if (!data?.success || !Array.isArray(embedding)) {
        throw new Error('Invalid response from Python Embedding API');
      }

      // Ensure number[] and normalize defensively
      const vector: number[] = (embedding as unknown[]).map((v) => Number(v));
      const normalized = this.normalizeVector(vector);
      
      const totalApiDuration = Date.now() - apiCallStartTime;
      const processingTime = totalApiDuration - networkDuration - parseDuration;
      
      console.log(`  ⏱️ Python API timing breakdown:`);
      console.log(`     - Network (request): ${networkDuration}ms`);
      console.log(`     - Processing (Python): ~${processingTime}ms`);
      console.log(`     - Parse response: ${parseDuration}ms`);
      console.log(`     - Total API call: ${totalApiDuration}ms`);
      
      return normalized;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const failedDuration = Date.now() - apiCallStartTime;
      console.error(`  ❌ Python API failed after ${failedDuration}ms`);
      
      if (error.name === 'AbortError') {
        throw new Error(`Python Embedding API timeout: Request took longer than ${timeoutMs/1000} seconds`);
      }
      throw error;
    }
  }

  /**
   * Generate embedding từ image buffer
   * 
   * STANDARD APPROACH: Sử dụng RawImage constructor như code trước đây
   * - Works với native onnxruntime-node (local development)
   * - May need adjustment for WebAssembly mode (Alpine Linux)
   * 
   * @param imageBuffer - Buffer của hình ảnh
   * @returns Embedding vector (512 dimensions, normalized)
   */
  async generateEmbeddingFromBuffer(imageBuffer: Buffer): Promise<number[]> {
    try {
      console.log('🔄 generateEmbeddingFromBuffer: Starting...', {
        inputBufferSize: imageBuffer.length
      });

      // Python embedding service is the default (shouldUsePythonEmbeddingApi() defaults to true)
      const embedding = await this.generateEmbeddingViaPythonApi(imageBuffer);
      console.log('✅ Embedding generated successfully (Python API)');
      return embedding;
    } catch (error) {
      console.error('Error generating embedding from buffer:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation from buffer failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embedding từ image URL
   */
  async generateEmbedding(imageUrl: string): Promise<number[]> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return this.generateEmbeddingFromBuffer(buffer);
    } catch (error) {
      console.error('Error generating embedding:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }
  }

  /**
   * Batch generate embeddings (OPTIMIZED - uses batch API endpoint)
   * 
   * This method uses the /embed/batch endpoint which processes multiple images
   * in a single request, much faster than individual requests.
   * 
   * @param imageUrls - Array of image URLs
   * @param batchSize - Number of images per batch request (default: 20)
   * @returns Array of embedding vectors
   */
  async generateEmbeddingsBatch(
    imageUrls: string[], 
    batchSize: number = 20
  ): Promise<number[][]> {
    try {
      if (!shouldUsePythonEmbeddingApi()) {
        // Fallback to individual calls if not using Python API
      return await Promise.all(imageUrls.map((url) => this.generateEmbedding(url)));
      }

      const apiUrl = getPythonEmbeddingApiUrl();
      const results: number[][] = [];

      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        
        // Download all images in batch
        const imageBuffers = await Promise.all(
          batch.map(async (url) => {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`Failed to download image: ${response.statusText}`);
              }
              return Buffer.from(await response.arrayBuffer());
            } catch (error) {
              console.error(`Error downloading image ${url}:`, error);
              throw error;
            }
          })
        );

        // Create FormData with all images
        const formData = new FormData();
        imageBuffers.forEach((buffer, index) => {
          const blob = new Blob([buffer], { type: 'image/jpeg' });
          formData.append('files', blob, `image-${i + index}.jpg`);
        });

        // Call batch endpoint
        const controller = new AbortController();
        const isProduction = process.env.QDRANT_COLLECTION_ENV === 'production' ||
                             process.env.QDRANT_COLLECTION_ENV === 'prod' ||
                             process.env.NODE_ENV === 'production';
        
        const defaultTimeout = isProduction ? 300000 : 90000; // 5min for production, 90s for dev
        const timeoutMs = process.env.PYTHON_EMBEDDING_TIMEOUT
          ? parseInt(process.env.PYTHON_EMBEDDING_TIMEOUT, 10)
          : defaultTimeout;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(`${apiUrl}/embed/batch`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // If batch endpoint doesn't exist (404), fallback to individual calls
            if (response.status === 404) {
              console.warn(`⚠️  Batch endpoint /embed/batch not found (404). Falling back to individual API calls.`);
              console.warn(`   💡 Deploy Python service with batch endpoint for 5-10x speed improvement.`);
              // Fallback to individual calls
              const individualResults = await Promise.all(
                batch.map(async (url) => {
                  try {
                    return await this.generateEmbedding(url);
                  } catch (error) {
                    console.error(`Error generating embedding for ${url}:`, error);
                    throw error;
                  }
                })
              );
              results.push(...individualResults);
              continue; // Skip to next batch
            }
            
            const errorText = await response.text();
            throw new Error(
              `Python Embedding API batch failed: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          const data = await response.json();
          
          if (!data.success || !data.embeddings) {
            throw new Error(`Invalid batch response: ${JSON.stringify(data)}`);
          }

          results.push(...data.embeddings);
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error(
              `Python Embedding API batch timeout: Request took longer than ${timeoutMs/1000} seconds`
            );
          }
          throw error;
        }
      }

      return results;
    } catch (error) {
      console.error('Error generating embeddings in batch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch embedding generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings from S3 keys (FASTEST METHOD - Direct S3 access)
   * 
   * This method sends S3 keys to Python API, which downloads images directly from S3.
   * Much faster because:
   * - No need to download images in Node.js
   * - No need to upload images to Python API
   * - Python API and S3 are in same AWS network (faster transfer)
   * 
   * @param s3Keys - Array of S3 keys (e.g., ['products/merchant-1/image.jpg'])
   * @param bucketName - S3 bucket name (e.g., 'anyrent-images-dev')
   * @param region - AWS region (default: 'ap-southeast-1')
   * @returns Array of embedding vectors
   */
  async generateEmbeddingsFromS3Keys(
    s3Keys: string[],
    bucketName: string,
    region: string = 'ap-southeast-1'
  ): Promise<number[][]> {
    try {
      if (!shouldUsePythonEmbeddingApi()) {
        throw new Error('S3 key method requires Python embedding API');
      }

      const apiUrl = getPythonEmbeddingApiUrl();

      // Get AWS credentials from environment (REQUIRED - NO FALLBACK)
      const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
      const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
      
      // AWS credentials are REQUIRED - Python API does NOT fallback to env vars
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        throw new Error(
          'AWS credentials are REQUIRED. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables. ' +
          'Python API does NOT use Railway env vars (no fallback for security).'
        );
      }

      // Create form data with S3 keys and AWS credentials (REQUIRED)
      const formData = new FormData();
      formData.append('bucket_name', bucketName);
      formData.append('region', region);
      formData.append('aws_access_key_id', awsAccessKeyId);
      formData.append('aws_secret_access_key', awsSecretAccessKey);
      
      console.log(`🔑 Sending AWS credentials to Python API (REQUIRED - no fallback):`);
      console.log(`   Access Key: ${awsAccessKeyId.substring(0, 8)}...`);
      console.log(`   Secret Key: ${awsSecretAccessKey.substring(0, 8)}...`);
      console.log(`   Bucket: ${bucketName}, Region: ${region}`);
      console.log(`   S3 Keys: ${s3Keys.length} keys`);
      
      // Send S3 keys as JSON array
      formData.append('s3_keys', JSON.stringify(s3Keys));

      // Call S3 batch endpoint
      const controller = new AbortController();
      const isProduction = process.env.QDRANT_COLLECTION_ENV === 'production' ||
                           process.env.QDRANT_COLLECTION_ENV === 'prod' ||
                           process.env.NODE_ENV === 'production';
      
      const defaultTimeout = isProduction ? 300000 : 90000; // 5min for production, 90s for dev
      const timeoutMs = process.env.PYTHON_EMBEDDING_TIMEOUT
        ? parseInt(process.env.PYTHON_EMBEDDING_TIMEOUT, 10)
        : defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${apiUrl}/embed/s3-batch`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          
          // If S3 endpoint doesn't exist (404), fail with clear error
          if (response.status === 404) {
            throw new Error(
              `S3 batch endpoint /embed/s3-batch not found (404). ` +
              `Please deploy Python service with S3 batch endpoint support. ` +
              `Error: ${errorText}`
            );
          }
          
          throw new Error(
            `Python Embedding API S3 batch failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const data = await response.json();
        
        if (!data.success || !data.embeddings) {
          throw new Error(`Invalid S3 batch response: ${JSON.stringify(data)}`);
        }

        return data.embeddings;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(
            `Python Embedding API S3 batch timeout: Request took longer than ${timeoutMs/1000} seconds`
          );
        }
        throw error;
      }
    } catch (error) {
      console.error('Error generating embeddings from S3 keys:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`S3 embedding generation failed: ${errorMessage}`);
    }
  }
}

// Singleton instance
let embeddingServiceInstance: FashionImageEmbedding | null = null;

export function getEmbeddingService(): FashionImageEmbedding {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new FashionImageEmbedding();
  }
  return embeddingServiceInstance;
}

/**
 * Warm-up function to pre-load model when server starts
 * Based on GitHub issue #1135: pipeline promise may never resolve on first call
 * 
 * SOLUTION: Pre-load model during server startup to avoid promise hanging on first request
 * 
 * @param timeout - Maximum time to wait for model loading (default: 120 seconds)
 * @returns Promise that resolves when model is loaded, or rejects on timeout
 */
/**
 * Warm-up function to pre-load model when server starts
 * Based on GitHub issue #1135: pipeline promise may never resolve on first call
 * 
 * SOLUTION: Pre-load model during server startup to avoid promise hanging on first request
 * 
 * @param timeout - Maximum time to wait for model loading (default: 120 seconds)
 * @returns Promise that resolves when model is loaded, or rejects on timeout
 */
export async function warmUpModel(timeout: number = 120000): Promise<void> {
  console.log('🔥 Starting model warm-up (pre-loading model to avoid issue #1135)...');
  const startTime = Date.now();
  
  try {
    const service = getEmbeddingService();
    
    // Use Promise.race to ensure we don't wait forever
    const warmUpPromise = service.warmUp();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model warm-up timeout: Model loading took longer than ${timeout/1000}s. This may indicate the promise is hanging (issue #1135).`));
      }, timeout);
    });
    
    await Promise.race([warmUpPromise, timeoutPromise]);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Model warm-up completed in ${(elapsed/1000).toFixed(2)}s`);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Model warm-up failed after ${(elapsed/1000).toFixed(2)}s:`, error?.message);
    console.error('⚠️  Server will continue, but first image search request may be slow or fail');
    // Don't throw - allow server to start even if warm-up fails
    // The model will be loaded on first request (with retry logic)
  }
}
