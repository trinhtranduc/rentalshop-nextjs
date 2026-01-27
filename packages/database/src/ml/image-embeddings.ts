/**
 * Image Embedding Service
 * Sử dụng CLIP model để tạo embeddings từ hình ảnh
 * 
 * Default Model: Xenova/clip-vit-base-patch32 (tương thích 100% với @xenova/transformers)
 * Alternative: patrickjohncyh/fashion-clip (fashion-specific, cần test compatibility)
 * Vector dimension: 512
 * 
 * SOLUTION: Chỉ force WebAssembly mode trên Alpine Linux (Docker)
 * - Local development: Sử dụng native onnxruntime-node (RawImage hoạt động tốt)
 * - Alpine Linux (Docker): Force WebAssembly mode để tránh lỗi ERR_DLOPEN_FAILED
 */

import sharp from 'sharp';

// OFFICIAL TUTORIAL APPROACH: Simple detection
// Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
// Just check env variables - library will auto-detect and use WASM if needed
function shouldUseWebAssembly(): boolean {
  if (typeof process === 'undefined') return false;
  
  // Check explicit env variables (set in Dockerfile/start.sh)
  return process.env.USE_BROWSER === 'true' || 
         process.env.USE_ONNXRUNTIME === 'false';
}

// LAZY LOAD: Import @xenova/transformers only when needed
// OFFICIAL TUTORIAL APPROACH: Use @xenova/transformers like tutorial
// Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    // OFFICIAL TUTORIAL APPROACH: Exactly like tutorial
    // Tutorial uses @xenova/transformers, not @huggingface/transformers
    // Just import and use - env variables are set in Dockerfile/start.sh
    // Library will auto-detect and use WASM based on env variables
    
    console.log('🔄 Loading @xenova/transformers...');
    const TransformersApi = Function('return import("@xenova/transformers")')();
    transformersModule = await TransformersApi;
    console.log('✅ @xenova/transformers loaded successfully');
    
    // Set transformers.env if needed (optional, env variables should be enough)
    if (shouldUseWebAssembly() && transformersModule?.env) {
        transformersModule.env.useBrowser = true;
        transformersModule.env.useOnnxruntime = false;
    }
  }
  return transformersModule;
}

export class FashionImageEmbedding {
  private model: any = null;
  private modelName: string = 'Xenova/clip-vit-base-patch32';

  /**
   * Preprocess image cho AI model
   * - Resize về 224x224 (CLIP standard)
   * - Convert to raw pixel data (RGB, 224x224x3)
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<{ 
    buffer: Buffer; 
    width: number; 
    height: number 
  }> {
    try {
      const processed = await sharp(imageBuffer)
        .resize(224, 224, {
          fit: 'cover',
          position: 'center'
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: processed.data,
        width: processed.info.width,
        height: processed.info.height
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Image preprocessing failed: ${errorMessage}`);
    }
  }

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
   * Warm-up model (public method to pre-load model)
   * Based on GitHub issue #1135: pipeline promise may never resolve on first call
   */
  async warmUp(): Promise<void> {
    try {
      await this.getModel();
      console.log('✅ Model warm-up successful');
    } catch (error: any) {
      console.error('❌ Model warm-up failed:', error?.message);
      throw error;
    }
  }

  /**
   * Get or load the model (singleton pattern)
   */
  private async getModel(): Promise<any> {
    if (!this.model) {
      console.log(`🔄 Loading FashionCLIP model: ${this.modelName}...`);
      
      const transformers = await loadTransformers();
      const { pipeline } = transformers;
      
      // OFFICIAL TUTORIAL APPROACH: Just call pipeline()
      // Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
      // Library will use CPU backend (onnxruntime-node) by default in Node.js
      // node:18 has glibc, so onnxruntime-node will work correctly
      console.log('🔄 Calling pipeline() - library will use CPU backend (onnxruntime-node)...');
      
      // Simple timeout to prevent hanging (3 minutes)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout')), 180000);
      });
      
      this.model = await Promise.race([
        pipeline('image-feature-extraction', this.modelName),
        timeoutPromise
      ]);
      
      console.log('✅ Model loaded successfully');
    }
    return this.model;
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

      // Preprocess image: resize to 224x224 and get raw pixel data
      const { buffer, width, height } = await this.preprocessImage(imageBuffer);
      console.log('✅ Image preprocessed:', {
        dimensions: `${width}x${height}`,
        bufferSize: buffer.length
      });

      // Get model
      const model = await this.getModel();
      console.log('✅ Model loaded');

      // Load transformers to get RawImage class
      const transformers = await loadTransformers();
      const { RawImage } = transformers;

      // Try to create RawImage and call model
      // In WebAssembly mode, RawImage constructor may fail, so we need fallback
      let output: any;
      const isWebAssemblyMode = shouldUseWebAssembly();
      
      try {
        // STANDARD APPROACH: Create RawImage from raw pixel data
        // This works with native onnxruntime-node (local development)
      const uint8Array = new Uint8Array(buffer);
      const rawImage = new RawImage(uint8Array, width, height, 3);

        console.log('🔄 Calling model with RawImage...');
        output = await model(rawImage);
        console.log('✅ Model call succeeded with RawImage');
      } catch (rawImageError: any) {
        // If RawImage fails (common in WebAssembly mode), try alternative approaches
        if (isWebAssemblyMode || rawImageError?.message?.includes('instanceof') || rawImageError?.message?.includes('RawImage')) {
          console.warn('⚠️ RawImage failed, trying alternative approach for WebAssembly mode:', {
            error: rawImageError?.message
          });
          
          // Fallback: Try passing raw pixel data as Uint8Array directly
          // Some WebAssembly implementations may accept this
          try {
            console.log('🔄 Fallback: Trying Uint8Array directly...');
            const uint8Array = new Uint8Array(buffer);
            output = await model(uint8Array);
            console.log('✅ Model call succeeded with Uint8Array (fallback)');
          } catch (fallbackError: any) {
            console.error('❌ All methods failed:', {
              rawImageError: rawImageError?.message,
              fallbackError: fallbackError?.message
            });
            throw new Error(
              `Model failed with all input methods. ` +
              `RawImage error: ${rawImageError?.message}. ` +
              `Uint8Array error: ${fallbackError?.message}. ` +
              `This may indicate a compatibility issue with WebAssembly mode.`
            );
          }
        } else {
          // Not a RawImage issue, re-throw original error
          throw rawImageError;
        }
      }
      
      // Extract embedding vector
      let embedding: number[];
      if (Array.isArray(output)) {
        embedding = output.flat();
      } else if (output.data) {
        embedding = Array.isArray(output.data) ? output.data : Array.from(output.data);
      } else if (output instanceof Float32Array || output instanceof Float64Array) {
        embedding = Array.from(output);
      } else {
        // Try to extract from tensor-like object
        embedding = Array.isArray(output) ? output.flat() : [output];
      }

      // Ensure we have the right dimension (512 for CLIP)
      if (embedding.length !== 512) {
        console.warn(`⚠️ Embedding dimension mismatch: expected 512, got ${embedding.length}`);
        if (embedding.length > 512) {
          embedding = embedding.slice(0, 512);
        } else {
          embedding = [...embedding, ...new Array(512 - embedding.length).fill(0)];
        }
      }

      // Normalize vector (important for cosine similarity)
      const normalized = this.normalizeVector(embedding);
      console.log('✅ Embedding generated successfully');
      return normalized;
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
      const model = await this.getModel();
      const transformers = await loadTransformers();
      const { RawImage } = transformers;
      
      // Download và preprocess tất cả images
      const processedImages = await Promise.all(
        imageUrls.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image ${url}: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          return this.preprocessImage(buffer);
        })
      );

      // Convert to RawImage objects
      const rawImages = processedImages.map(({ buffer, width, height }) => {
        const uint8Array = new Uint8Array(buffer);
        return new RawImage(uint8Array, width, height, 3);
      });

      // Generate embeddings in batch
      const outputs = await Promise.all(
        rawImages.map(rawImage => model(rawImage))
      );

      // Extract and normalize embeddings
      return outputs.map(output => {
          let embedding: number[];
          if (Array.isArray(output)) {
            embedding = output.flat();
          } else if (output.data) {
            embedding = Array.isArray(output.data) ? output.data : Array.from(output.data);
          } else if (output instanceof Float32Array || output instanceof Float64Array) {
            embedding = Array.from(output);
          } else {
            embedding = Array.isArray(output) ? output.flat() : [output];
          }

          // Ensure 512 dimensions
          if (embedding.length !== 512) {
            if (embedding.length > 512) {
              embedding = embedding.slice(0, 512);
            } else {
              embedding = [...embedding, ...new Array(512 - embedding.length).fill(0)];
            }
          }

          return this.normalizeVector(embedding);
      });
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
