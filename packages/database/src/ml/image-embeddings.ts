/**
 * Image Embedding Service
 * Sử dụng CLIP model để tạo embeddings từ hình ảnh
 * 
 * Default Model: Xenova/clip-vit-base-patch32 (tương thích 100% với @huggingface/transformers)
 * Alternative: patrickjohncyh/fashion-clip (fashion-specific, cần test compatibility)
 * Vector dimension: 512
 * 
 * SOLUTION: Chỉ force WebAssembly mode trên Alpine Linux (Docker)
 * - Local development: Sử dụng native onnxruntime-node (RawImage hoạt động tốt)
 * - Alpine Linux (Docker): Force WebAssembly mode để tránh lỗi ERR_DLOPEN_FAILED
 */

import sharp from 'sharp';

// Detect if we should use WebAssembly mode (Alpine Linux, Docker, Railway, or when onnxruntime-node unavailable)
function shouldUseWebAssembly(): boolean {
  if (typeof process === 'undefined') return false;
  
  // Log detection details for debugging
  const detectionInfo = {
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    USE_BROWSER: process.env.USE_BROWSER,
    USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
    ALPINE: process.env.ALPINE,
    DOCKER: process.env.DOCKER
  };
  
  // Check for explicit flags (highest priority)
  if (process.env.USE_BROWSER === 'true') {
    console.log('🔧 WebAssembly mode: USE_BROWSER=true detected');
    return true;
  }
  if (process.env.USE_ONNXRUNTIME === 'false') {
    console.log('🔧 WebAssembly mode: USE_ONNXRUNTIME=false detected');
    return true;
  }
  if (process.env.ALPINE === 'true') {
    console.log('🔧 WebAssembly mode: ALPINE=true detected');
    return true;
  }
  if (process.env.DOCKER === 'true') {
    console.log('🔧 WebAssembly mode: DOCKER=true detected');
    return true;
  }
  
  // Check for Railway environment (Railway uses containers that may not have full glibc)
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🔧 WebAssembly mode: Railway environment detected');
    return true;
  }
  if (process.env.RAILWAY_ENVIRONMENT_NAME) {
    console.log('🔧 WebAssembly mode: Railway environment name detected');
    return true;
  }
  if (process.env.RAILWAY_SERVICE_NAME) {
    console.log('🔧 WebAssembly mode: Railway service name detected');
    return true;
  }
  
  // Check platform - if Linux and not darwin/win32, likely containerized
  if (process.platform === 'linux') {
    // Check if we're in a container (common indicators)
    try {
      const fs = require('fs');
      // Docker containers often have /.dockerenv
      if (fs.existsSync('/.dockerenv')) {
        console.log('🔧 WebAssembly mode: /.dockerenv detected (Docker container)');
        return true;
      }
      // Check if running in Railway (has specific paths)
      if (fs.existsSync('/app') && process.cwd().includes('/app')) {
        console.log('🔧 WebAssembly mode: /app path detected (likely Railway/Docker)');
        return true;
      }
    } catch (e) {
      // If we can't check filesystem, continue with other checks
      console.log('ℹ️ Could not check filesystem for container detection:', e);
    }
    
    // If dlopen is not available, likely musl libc (Alpine)
    if (typeof process.dlopen === 'undefined') {
      console.log('🔧 WebAssembly mode: process.dlopen undefined (likely Alpine/musl)');
      return true;
    }
    
    // CRITICAL: On Linux, if USE_ONNXRUNTIME is not explicitly 'true', use WebAssembly
    // This is the safest default for Railway/Docker deployments
    // Railway/Docker containers often don't have full glibc support for onnxruntime-node
    if (!process.env.USE_ONNXRUNTIME || process.env.USE_ONNXRUNTIME !== 'true') {
      console.log('🔧 WebAssembly mode: Linux platform without explicit USE_ONNXRUNTIME=true (defaulting to WebAssembly for safety)');
      return true;
    }
  }
  
  console.log('ℹ️ Native mode: Platform detection details:', detectionInfo);
  return false;
}

// Set environment variables based on platform detection
if (typeof process !== 'undefined' && shouldUseWebAssembly()) {
  // Force WebAssembly mode on Alpine Linux, Docker, Railway, or when onnxruntime-node unavailable
  // This prevents ERR_DLOPEN_FAILED error
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'true';
  process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
  
  console.log('🔧 WebAssembly mode forced (Alpine/Docker/Railway detected)');
} else {
  // Local development (darwin/win32): Let @huggingface/transformers choose backend automatically
  // Native onnxruntime-node will work and RawImage will function properly
  console.log('🔧 Local development - using native onnxruntime-node');
}

// LAZY LOAD: Import @huggingface/transformers only when needed
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    // CRITICAL: Re-check detection every time (runtime, not compile-time)
    // This ensures environment variables set in start.sh are detected
    const useWebAssembly = shouldUseWebAssembly();
    
    // OFFICIAL TUTORIAL APPROACH: Set environment variables before import
    // Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
    // Just set env variables, library will auto-detect and use WASM
    if (typeof process !== 'undefined' && useWebAssembly) {
      process.env.USE_ONNXRUNTIME = 'false';
      process.env.USE_BROWSER = 'true';
      process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
      
      console.log('🔧 Setting WebAssembly environment variables (official tutorial approach):', {
        USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
        USE_BROWSER: process.env.USE_BROWSER,
        ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE
      });
    }
    
    console.log('🔄 Loading @huggingface/transformers...');
    // CRITICAL: Use Function constructor to ensure true dynamic import
    // TypeScript may convert import() to require() during compilation
    // This delays the import to after compilation, ensuring dynamic import works correctly
    // Official solution from Transformers.js creator
    const TransformersApi = Function('return import("@huggingface/transformers")')();
    transformersModule = await TransformersApi;
    console.log('✅ @huggingface/transformers loaded successfully');
    
    // OFFICIAL TUTORIAL APPROACH: Set transformers.env properties
    // Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
    // Just set env variables and transformers.env, library will auto-detect and use WASM
    if (useWebAssembly && transformersModule && transformersModule.env) {
      transformersModule.env.useBrowser = true;
      transformersModule.env.useOnnxruntime = false;
      console.log('✅ Set transformers.env.useBrowser=true and useOnnxruntime=false (official tutorial approach)');
    }
    
    // Configure cache directory for transformers.js (official tutorial approach)
    // Based on: https://github.com/huggingface/transformers.js/issues/295
    // The library needs a writable cache directory for model files and WASM files
    if (useWebAssembly && transformersModule && transformersModule.env) {
      try {
        const path = require('path');
        const fs = require('fs');
        
        // Use /tmp for cache in Docker/Railway (writable location)
        // Or use node_modules/@huggingface/transformers/.cache if available
        const cacheDir = process.env.TRANSFORMERS_CACHE_DIR || '/tmp/transformers-cache';
        
        // Ensure cache directory exists and is writable
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          console.log(`📁 Created transformers cache directory: ${cacheDir}`);
        }
        
        // Check if WASM files are accessible
        try {
          const transformersPath = require.resolve('@huggingface/transformers/package.json');
          const transformersDir = path.dirname(transformersPath);
          const wasmPath = path.join(transformersDir, 'dist');
          const wasmExists = fs.existsSync(wasmPath);
          console.log(`🔍 WASM files check:`, {
            transformersPath,
            transformersDir,
            wasmPath,
            wasmExists,
            cacheDir
          });
        } catch (e) {
          console.warn('⚠️ Could not check WASM files location:', e);
        }
        
        // Configure transformers.js to use this cache directory
        transformersModule.env.cacheDir = cacheDir;
        transformersModule.env.useFSCache = true;
        transformersModule.env.useBrowserCache = false; // Disable browser cache in Node.js
        
        console.log(`📁 Configured transformers cache directory: ${cacheDir}`);
      } catch (cacheError: any) {
        console.warn('⚠️ Could not configure transformers cache directory:', cacheError?.message);
        // Continue anyway - library will use default cache location
      }
    }
    
    // NOTE: Official tutorial recommends ONLY setting env variables and transformers.env
    // Deep patching should NOT be needed if env variables are set correctly
    // Removed deep patching section to align with official tutorial approach
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
      
      // OFFICIAL TUTORIAL APPROACH: Just ensure env variables are set, then call pipeline()
      // Tutorial: https://huggingface.co/docs/transformers.js/tutorials/next
      // Library will auto-detect env variables and use WASM automatically
      if (typeof process !== 'undefined' && shouldUseWebAssembly()) {
        // Re-set environment variables
        process.env.USE_ONNXRUNTIME = 'false';
        process.env.USE_BROWSER = 'true';
        process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
        
        // Ensure transformers.env is set (official tutorial approach)
        if (transformers && transformers.env) {
          transformers.env.useBrowser = true;
          transformers.env.useOnnxruntime = false;
        }
        
        console.log('✅ Environment variables and transformers.env set (official tutorial approach)');
      }
      
      const { pipeline } = transformers;
      
      console.log('🔄 Calling pipeline() - library will auto-detect WASM mode...');
      
      // SIMPLIFIED: Based on GitHub issue #1135 - pipeline promise may never resolve
      // SOLUTION: Use Promise.race with a single long timeout
      // Let the library handle its internal retry logic naturally
      // Don't interfere with multiple retry loops
      
      const PIPELINE_TIMEOUT = 180000; // 180 seconds (3 minutes) - enough for WASM initialization
      
      try {
        const pipelinePromise = pipeline(
          'image-feature-extraction',
          this.modelName
        ) as Promise<any>;
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(
              `Model loading timeout: Pipeline took longer than ${PIPELINE_TIMEOUT/1000}s. ` +
              `This may indicate the promise is hanging (issue #1135) or WASM backend cannot initialize.`
            ));
          }, PIPELINE_TIMEOUT);
        });
        
        // Race between pipeline and timeout - let library handle internal retries
        this.model = await Promise.race([pipelinePromise, timeoutPromise]);
        
        console.log('✅ Model loaded successfully with WASM backend');
      } catch (pipelineError: any) {
        const errorMessage = pipelineError?.message || '';
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('took longer than');
        
        if (isTimeout) {
          console.error('❌ Model loading timeout:', {
            error: errorMessage,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
          });
          
          console.error('❌ Possible causes:');
          console.error('   1. WASM files missing or not accessible');
          console.error('   2. WASM backend cannot initialize in this environment');
          console.error('   3. Insufficient memory/resources');
          console.error('   4. Pipeline promise hanging (issue #1135)');
        }
        
        throw pipelineError;
      }
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
