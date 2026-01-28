/**
 * Image Embedding Service
 * Python-first implementation:
 * - ONLY uses external Python FastAPI service to generate embeddings
 * - Avoids Node.js native memory corruption issues on Railway (free(): invalid size)
 *
 * Required env:
 * - USE_PYTHON_EMBEDDING_API=true
 * - PYTHON_EMBEDDING_API_URL=https://python-embedding-service-*.up.railway.app
 */

function shouldUsePythonEmbeddingApi(): boolean {
  return process.env.USE_PYTHON_EMBEDDING_API === 'true';
}

function getPythonEmbeddingApiUrl(): string {
  return process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';
}

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
    if (!shouldUsePythonEmbeddingApi()) {
      throw new Error('USE_PYTHON_EMBEDDING_API must be true (Python embedding service is required).');
    }

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
   * - USE_PYTHON_EMBEDDING_API=true
   * - PYTHON_EMBEDDING_API_URL=https://<your-service>.up.railway.app
   */
  private async generateEmbeddingViaPythonApi(imageBuffer: Buffer): Promise<number[]> {
    const baseUrl = getPythonEmbeddingApiUrl();
    console.log(`🔄 Using Python Embedding API: ${baseUrl}`);

    const formData = new FormData();
    // Convert Buffer -> Uint8Array for Blob (avoids TS/SharedArrayBuffer issues)
    const uint8Array = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: 'image/png' });
    formData.append('file', blob, 'image.png');

    const response = await fetch(`${baseUrl}/embed`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Python Embedding API error (${response.status}): ${text}`);
    }

    const data: any = await response.json();
    const embedding: unknown = data?.embedding;
    if (!data?.success || !Array.isArray(embedding)) {
      throw new Error('Invalid response from Python Embedding API');
    }

    // Ensure number[] and normalize defensively
    const vector: number[] = (embedding as unknown[]).map((v) => Number(v));
    return this.normalizeVector(vector);
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

      if (!shouldUsePythonEmbeddingApi()) {
        throw new Error('USE_PYTHON_EMBEDDING_API must be true (only Python embedding service is supported).');
      }

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
   * Batch generate embeddings
   */
  async generateEmbeddingsBatch(imageUrls: string[]): Promise<number[][]> {
    try {
      if (!shouldUsePythonEmbeddingApi()) {
        throw new Error('USE_PYTHON_EMBEDDING_API must be true (only Python embedding service is supported).');
      }

      // Python service currently supports single image per request.
      // Batch = parallel calls (kept simple; can be optimized later).
      return await Promise.all(imageUrls.map((url) => this.generateEmbedding(url)));
    } catch (error) {
      console.error('Error generating embeddings in batch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch embedding generation failed: ${errorMessage}`);
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
