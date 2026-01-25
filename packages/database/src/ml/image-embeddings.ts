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
  // Local development (darwin/win32): Let @xenova/transformers choose backend automatically
  // Native onnxruntime-node will work and RawImage will function properly
  console.log('🔧 Local development - using native onnxruntime-node');
}

// LAZY LOAD: Import @xenova/transformers only when needed
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    // CRITICAL: Re-check detection every time (runtime, not compile-time)
    // This ensures environment variables set in start.sh are detected
    const useWebAssembly = shouldUseWebAssembly();
    
    // Set environment variables again before dynamic import (if WebAssembly needed)
    if (typeof process !== 'undefined' && useWebAssembly) {
      process.env.USE_ONNXRUNTIME = 'false';
      process.env.USE_BROWSER = 'true';
      process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
      
      console.log('🔧 Setting WebAssembly environment variables before import:', {
        USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
        USE_BROWSER: process.env.USE_BROWSER,
        ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE
      });
      
      // CRITICAL: Block onnxruntime-node import BEFORE importing @xenova/transformers
      // This prevents @xenova/transformers from trying to use native onnxruntime-node
      // which fails on Alpine Linux (musl libc) with ERR_DLOPEN_FAILED
      try {
        // Method 1: Try CommonJS require interceptor (for Node.js)
        if (typeof require !== 'undefined') {
          const Module = require('module');
          const originalRequire = Module.prototype.require;
          
          // Intercept require calls for onnxruntime-node
          Module.prototype.require = function(id: string) {
            if (id === 'onnxruntime-node' || id.includes('onnxruntime-node')) {
              console.log('🚫 Blocking onnxruntime-node import - forcing WebAssembly mode');
              // Return mock module that signals WebAssembly should be used
              return {
                InferenceSession: {
                  create: () => {
                    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                  }
                },
                create: () => {
                  throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                }
              };
            }
            return originalRequire.apply(this, arguments);
          };
          
          console.log('🔒 Require interceptor installed to block onnxruntime-node');
        }
      } catch (e) {
        console.warn('⚠️ Could not install require interceptor (may be ESM context):', e);
      }
    }
    
    console.log('🔄 Loading @xenova/transformers...');
    transformersModule = await import('@xenova/transformers');
    console.log('✅ @xenova/transformers loaded successfully');
    
    // CRITICAL: Deep patch @xenova/transformers module to force WebAssembly mode
    // This ensures onnxruntime-node is never used, even if it's imported
    if (useWebAssembly && transformersModule) {
      console.log('🔧 Deep patching @xenova/transformers to force WebAssembly mode...');
      
      // Patch environment variables
      if (transformersModule.env) {
        transformersModule.env.useBrowser = true;
        transformersModule.env.useOnnxruntime = false;
        // @ts-ignore
        transformersModule.env.onnxruntime = undefined;
      }
      
      // Patch global onnxruntime references
      if (typeof global !== 'undefined') {
        // @ts-ignore
        global.onnxruntime = undefined;
        // @ts-ignore
        if (global.window) {
          // @ts-ignore
          global.window.onnxruntime = undefined;
        }
      }
      
      // CRITICAL: Patch internal onnxruntime references in transformers module
      // @xenova/transformers may cache onnxruntime in various places
      try {
        // Patch any cached onnxruntime references
        const mockOnnxRuntime = {
          InferenceSession: {
            create: () => {
              throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
            }
          },
          create: () => {
            throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
          }
        };
        
        // Try to patch internal state
        // @ts-ignore
        if (transformersModule.env && transformersModule.env.backends) {
          // @ts-ignore
          transformersModule.env.backends.onnxruntime = undefined;
        }
        
        // Patch any direct onnxruntime property
        // @ts-ignore
        if (transformersModule.onnxruntime !== undefined) {
          // @ts-ignore
          transformersModule.onnxruntime = undefined;
        }
        
        // Patch require cache for onnxruntime-node (if it exists)
        if (typeof require !== 'undefined' && require.cache) {
          // Mark onnxruntime-node as unavailable in require cache
          const onnxCacheKey = Object.keys(require.cache).find(key => 
            key.includes('onnxruntime-node')
          );
          if (onnxCacheKey) {
            // @ts-ignore - We're intentionally patching the cache
            require.cache[onnxCacheKey] = {
              id: onnxCacheKey,
              exports: mockOnnxRuntime,
              loaded: true
            } as any;
            console.log('🔧 Patched onnxruntime-node in require cache');
          }
        }
        
        console.log('✅ Deep patching completed');
      } catch (e) {
        console.warn('⚠️ Could not complete deep patching:', e);
      }
      
      console.log('✅ @xenova/transformers patched for WebAssembly mode');
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
   * Get or load the model (singleton pattern)
   */
  private async getModel(): Promise<any> {
    if (!this.model) {
      console.log(`🔄 Loading FashionCLIP model: ${this.modelName}...`);
      
      const transformers = await loadTransformers();
      
      // CRITICAL: Re-patch transformers module right before loading model
      // This ensures onnxruntime is blocked even if it was re-imported
      if (typeof process !== 'undefined' && shouldUseWebAssembly()) {
        console.log('🔧 Re-patching transformers before model load...');
        
        // Re-set environment variables
        process.env.USE_ONNXRUNTIME = 'false';
        process.env.USE_BROWSER = 'true';
        process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
        
        // Re-patch transformers module
        if (transformers && transformers.env) {
          transformers.env.useBrowser = true;
          transformers.env.useOnnxruntime = false;
          // @ts-ignore
          transformers.env.onnxruntime = undefined;
        }
        
        // Re-patch global references
        if (typeof global !== 'undefined') {
          // @ts-ignore
          global.onnxruntime = undefined;
        }
        
        console.log('✅ Re-patching completed before model load');
      }
      
      const { pipeline } = transformers;
      
      this.model = await pipeline(
        'image-feature-extraction',
        this.modelName
      );
      
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
