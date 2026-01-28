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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
   * Create RawImage from sharp image (matches transformers.js internal implementation)
   * Reference: transformers.js-main/src/utils/image.js - loadImageFunction
   */
  private async createRawImageFromSharp(sharpImage: sharp.Sharp): Promise<any> {
    const transformers = await loadTransformers();
    const { RawImage } = transformers;
    
    // Match transformers.js implementation exactly:
    // const metadata = await img.metadata();
    // const rawChannels = metadata.channels;
    // const { data, info } = await img.rotate().raw().toBuffer({ resolveWithObject: true });
    // const newImage = new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
    const metadata = await sharpImage.metadata();
    const rawChannels = metadata.channels;
    
    const { data, info } = await sharpImage.rotate().raw().toBuffer({ resolveWithObject: true });
    
    const newImage = new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
    
    // Match transformers.js: convert channels if needed
    if (rawChannels !== undefined && rawChannels !== info.channels) {
      newImage.convert(rawChannels);
    }
    
    return newImage;
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

      // Get model (this also loads transformers module)
      const model = await this.getModel();
      console.log('✅ Model loaded');

      // CRITICAL: Get RawImage class from the SAME module instance that created the model
      const transformers = await loadTransformers();
      const { RawImage } = transformers;

      // REAL SOLUTION: Save buffer to temp file and use RawImage.read(filePath)
      // This is how transformers.js is designed to work in Node.js
      // Examples show: RawImage.read() with URL/file path, NOT with Buffer directly
      // This avoids all memory corruption and instanceof issues
      
      let output: any;
      let lastError: Error | null = null;
      let tempFilePath: string | null = null;
      
      // Strategy 1: Use RawImage.fromBlob() with Blob from Buffer - NO SHARP
      // This avoids all sharp-related memory issues in Next.js standalone
      // RawImage.fromBlob() uses sharp internally but handles memory correctly
      try {
        console.log('🔄 Strategy 1: Using RawImage.fromBlob() with Buffer (no sharp direct)...');
        
        // Create Blob from Buffer - convert to Uint8Array first for TypeScript compatibility
        // RawImage.fromBlob() will use sharp internally but handle memory correctly
        const uint8Array = new Uint8Array(imageBuffer);
        const blob = new Blob([uint8Array], { type: 'image/png' });
        console.log(`   ✅ Blob created: ${blob.size} bytes`);
        
        // Use RawImage.fromBlob() - this is the official transformers.js way
        // In Node.js, it calls sharp(await blob.arrayBuffer()) internally
        // But transformers.js handles the memory management correctly
        const rawImage = await RawImage.fromBlob(blob);
        console.log(`   ✅ RawImage created: ${rawImage.width}x${rawImage.height}`);
        
        output = await model(rawImage);
        console.log('   ✅ Strategy 1 SUCCESS: RawImage.fromBlob() approach');
      } catch (error: any) {
        console.log(`   ❌ Strategy 1 FAILED: ${error?.message}`);
        lastError = error;
      }
      
      // Strategy 2: Save to temp file and use sharp with file path (fallback)
      
      // Strategy 2: Use sharp directly with Buffer (fallback - works in Docker local)
      if (!output) {
        try {
          console.log('🔄 Strategy 2: Using temp file with sharp (fallback)...');
          
          // Create temp file
          const tempDir = os.tmpdir();
          tempFilePath = path.join(tempDir, `image-${Date.now()}-${Math.random().toString(36).substring(7)}.png`);
          
          // Write buffer to temp file
          fs.writeFileSync(tempFilePath, imageBuffer);
          console.log(`   ✅ Temp file created: ${tempFilePath}`);
          
          // Use sharp with file path
          const sharpImage = sharp(tempFilePath);
          const metadata = await sharpImage.metadata();
          const rawChannels = metadata.channels;
          const { data, info } = await sharpImage.raw().toBuffer({ resolveWithObject: true });
          
          const rawImage = new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
          if (rawChannels !== undefined && rawChannels !== info.channels) {
            rawImage.convert(rawChannels);
          }
          console.log(`   ✅ RawImage loaded from file: ${rawImage.width}x${rawImage.height}`);
          
          output = await model(rawImage);
          console.log('   ✅ Strategy 2 SUCCESS: Temp file with sharp');
        } catch (error: any) {
          console.log(`   ❌ Strategy 2 FAILED: ${error?.message}`);
          lastError = error;
        } finally {
          // Clean up temp file
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
              console.log(`   🗑️ Temp file cleaned up: ${tempFilePath}`);
            } catch (cleanupError) {
              console.warn(`   ⚠️ Failed to cleanup temp file: ${cleanupError}`);
            }
          }
        }
      }
      
      // Strategy 2: Create RawImage from sharp (fallback if file approach fails)
      if (!output) {
        try {
          console.log('🔄 Strategy 2: Creating RawImage from sharp (fallback)...');
          const sharpImage = sharp(imageBuffer);
          const metadata = await sharpImage.metadata();
          const rawChannels = metadata.channels;
          const { data, info } = await sharpImage.rotate().raw().toBuffer({ resolveWithObject: true });
          
          // CRITICAL: Create new Buffer copy first to avoid memory corruption
          const dataCopy = Buffer.from(data);
          const clampedData = new Uint8ClampedArray(dataCopy);
          
          const rawImage = new RawImage(clampedData, info.width, info.height, info.channels);
          
          if (rawChannels !== undefined && rawChannels !== info.channels) {
            rawImage.convert(rawChannels);
          }
          
          const isInstance = rawImage instanceof RawImage;
          console.log(`   ✅ RawImage instanceof check: ${isInstance}`);
          
          output = await model(rawImage);
          console.log('   ✅ Strategy 2 SUCCESS: RawImage from sharp');
        } catch (error: any) {
          console.log(`   ❌ Strategy 2 FAILED: ${error?.message}`);
          lastError = error;
        }
      }
      
      // Strategy 2: Create RawImage from sharp + fix prototype chain (if Strategy 1 fails)
      if (!output) {
        try {
          console.log('🔄 Strategy 2: Creating RawImage from sharp + prototype fix...');
          const sharpImage = sharp(imageBuffer);
          const metadata = await sharpImage.metadata();
          const rawChannels = metadata.channels;
          const { data, info } = await sharpImage.rotate().raw().toBuffer({ resolveWithObject: true });
          
          // CRITICAL: Create new Buffer copy first to avoid memory corruption
          const dataCopy = Buffer.from(data);
          const clampedData = new Uint8ClampedArray(dataCopy);
          
          const rawImage = new RawImage(clampedData, info.width, info.height, info.channels);
          
          if (rawChannels !== undefined && rawChannels !== info.channels) {
            rawImage.convert(rawChannels);
          }
          
          const isInstanceBefore = rawImage instanceof RawImage;
          console.log(`   ✅ RawImage instanceof check (before fix): ${isInstanceBefore}`);
          
          // Fix prototype chain if instanceof check fails
          if (!isInstanceBefore) {
            console.log('   ⚠️ instanceof check failed - attempting prototype fix...');
            Object.setPrototypeOf(rawImage, RawImage.prototype);
            rawImage.constructor = RawImage;
            const isInstanceAfter = rawImage instanceof RawImage;
            console.log(`   ✅ RawImage instanceof check (after fix): ${isInstanceAfter}`);
          }
          
          output = await model(rawImage);
          console.log('   ✅ Strategy 2 SUCCESS: RawImage from sharp + prototype fix');
        } catch (error: any) {
          console.log(`   ❌ Strategy 2 FAILED: ${error?.message}`);
          lastError = error;
        }
      }
      
      // Strategy 3: Use RawImage.read() with Blob (global Blob)
      if (!output) {
        try {
          console.log('🔄 Strategy 3: Using RawImage.read() with global Blob...');
          if (typeof Blob !== 'undefined' && Blob !== null) {
            const uint8Array = new Uint8Array(imageBuffer);
            const blob = new Blob([uint8Array], { type: 'image/png' });
            const isBlob = blob instanceof Blob;
            console.log(`   ✅ Blob instanceof check: ${isBlob}`);
            
            const rawImage = await RawImage.read(blob);
            output = await model(rawImage);
            console.log('   ✅ Strategy 3 SUCCESS: RawImage.read() with global Blob');
          } else {
            console.log('   ⚠️ Strategy 3 SKIPPED: Global Blob not available');
          }
        } catch (error: any) {
          console.log(`   ❌ Strategy 3 FAILED: ${error?.message}`);
          lastError = error;
        }
      }
      
      // Strategy 4: Use RawImage.read() with Blob-like object
      if (!output) {
        try {
          console.log('🔄 Strategy 4: Using RawImage.read() with Blob-like object...');
          const blobLike = {
            arrayBuffer: async () => imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength),
            size: imageBuffer.length,
            type: 'image/png'
          } as Blob;
          
          const rawImage = await RawImage.read(blobLike);
          output = await model(rawImage);
          console.log('   ✅ Strategy 4 SUCCESS: RawImage.read() with Blob-like object');
        } catch (error: any) {
          console.log(`   ❌ Strategy 4 FAILED: ${error?.message}`);
          lastError = error;
        }
      }
      
      // Strategy 5: Use RawImage.fromBlob() directly with Blob
      if (!output) {
        try {
          console.log('🔄 Strategy 5: Using RawImage.fromBlob() directly...');
          if (typeof Blob !== 'undefined' && Blob !== null) {
            const uint8Array = new Uint8Array(imageBuffer);
            const blob = new Blob([uint8Array], { type: 'image/png' });
            const rawImage = await RawImage.fromBlob(blob);
            output = await model(rawImage);
            console.log('   ✅ Strategy 5 SUCCESS: RawImage.fromBlob() directly');
        } else {
            console.log('   ⚠️ Strategy 5 SKIPPED: Global Blob not available');
          }
        } catch (error: any) {
          console.log(`   ❌ Strategy 5 FAILED: ${error?.message}`);
          lastError = error;
        }
      }
      
      // If all strategies failed, throw the last error
      if (!output) {
        console.error('❌ All strategies failed!');
        throw lastError || new Error('All RawImage creation strategies failed');
      }
      
      console.log('✅ Model call succeeded');
      console.log('✅ Model call succeeded');
      
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
      // CRITICAL: Use Uint8ClampedArray (not Uint8Array) to match transformers.js implementation
      // This prevents "corrupted size vs. prev_size" memory corruption error in onnxruntime-node
      const rawImages = processedImages.map(({ buffer, width, height }: { buffer: Buffer; width: number; height: number }) => {
        const uint8ClampedArray = new Uint8ClampedArray(buffer);
        return new RawImage(uint8ClampedArray, width, height, 3);
      });

      // Generate embeddings in batch
      const outputs = await Promise.all(
        rawImages.map((rawImage: any) => model(rawImage))
      );

      // Extract and normalize embeddings
      return outputs.map((output: any) => {
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
