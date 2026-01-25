/**
 * Image Embedding Service
 * Sử dụng CLIP model để tạo embeddings từ hình ảnh
 * 
 * Default Model: Xenova/clip-vit-base-patch32 (tương thích 100% với @xenova/transformers)
 * Alternative: patrickjohncyh/fashion-clip (fashion-specific, cần test compatibility)
 * Vector dimension: 512
 */

// CRITICAL: Set environment variables BEFORE importing @xenova/transformers
// This must happen before the import statement to prevent onnxruntime-node from loading
// onnxruntime-node requires glibc (ld-linux-x86-64.so.2) which Alpine Linux doesn't have
if (typeof process !== 'undefined') {
  // Force pure JavaScript/WebAssembly mode (no native ONNX Runtime)
  // These must be set before @xenova/transformers is imported
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'false';
  process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
  
  // Log environment variables for debugging
  console.log('🔧 @xenova/transformers environment:', {
    USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
    USE_BROWSER: process.env.USE_BROWSER,
    ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  });
}

import sharp from 'sharp';

// LAZY LOAD: Import @xenova/transformers only when needed
// This prevents onnxruntime-node from being loaded at module initialization
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    // Set environment variables again before dynamic import
    if (typeof process !== 'undefined') {
      process.env.USE_ONNXRUNTIME = 'false';
      process.env.USE_BROWSER = 'false';
      process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
    }
    
    // CRITICAL: Install require interceptor BEFORE dynamic import
    // This prevents onnxruntime-node from being loaded even if @xenova/transformers tries to require it
    if (typeof require !== 'undefined') {
      try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        
        // Intercept require calls to block onnxruntime-node
        Module.prototype.require = function(id: string) {
          if (id === 'onnxruntime-node' || id.includes('onnxruntime-node')) {
            console.warn('⚠️ Blocked require of onnxruntime-node, forcing pure JavaScript mode');
            // Throw error to force @xenova/transformers to use WebAssembly fallback
            throw new Error('onnxruntime-node is disabled. Use pure JavaScript mode.');
          }
          return originalRequire.apply(this, arguments as any);
        };
        
        console.log('🔧 onnxruntime-node require interceptor installed');
      } catch (e) {
        console.warn('⚠️ Could not install require interceptor:', e);
      }
    }
    
    console.log('🔄 Lazy loading @xenova/transformers...');
    
    // CRITICAL: Check if onnxruntime-node exists in node_modules
    // This helps verify if Dockerfile removal worked
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const onnxPath = path.join(process.cwd(), 'node_modules', 'onnxruntime-node');
        if (fs.existsSync(onnxPath)) {
          console.warn('⚠️ WARNING: onnxruntime-node still exists in node_modules!');
          console.warn('⚠️ This means Dockerfile removal step may have failed');
        } else {
          console.log('✅ Verified: onnxruntime-node not found in node_modules');
        }
      } catch (e) {
        // Ignore errors checking file system
      }
    }
    
    try {
      transformersModule = await import('@xenova/transformers');
      
      // Configure transformers
      transformersModule.env.allowLocalModels = false;
      transformersModule.env.allowRemoteModels = true;
      
      console.log('✅ @xenova/transformers loaded successfully');
    } catch (error: any) {
      // If import fails due to onnxruntime-node, try to restore require and throw
      if (typeof require !== 'undefined') {
        try {
          const Module = require('module');
          // Restore original require (though it may not help at this point)
          if (Module.prototype.require && typeof Module.prototype.require === 'function') {
            // Already intercepted, error should have been thrown
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Check if it's an onnxruntime-node error
      if (
        error?.code === 'ERR_DLOPEN_FAILED' ||
        error?.message?.includes('ERR_DLOPEN_FAILED') ||
        error?.message?.includes('onnxruntime-node') ||
        error?.message?.includes('ld-linux-x86-64.so.2')
      ) {
        throw new Error(
          `ERR_DLOPEN_FAILED: Cannot load native module (onnxruntime-node). ` +
          `Platform: ${process.platform}-${process.arch}, Node: ${process.version}. ` +
          `Environment variables: USE_ONNXRUNTIME=${process.env.USE_ONNXRUNTIME}, ` +
          `USE_BROWSER=${process.env.USE_BROWSER}, ONNXRUNTIME_NODE_DISABLE=${process.env.ONNXRUNTIME_NODE_DISABLE}. ` +
          `@xenova/transformers is still trying to load onnxruntime-node despite environment variables and require interceptor. ` +
          `This may require removing onnxruntime-node from node_modules in Dockerfile.`
        );
      }
      
      throw error;
    }
  }
  return transformersModule;
}

/**
 * FashionImageEmbedding Service
 * Tạo embeddings từ hình ảnh sử dụng FashionCLIP model
 */
export class FashionImageEmbedding {
  private model: any = null;
  private modelName: string;

  constructor(modelName?: string) {
    // Default model: Xenova CLIP (tương thích 100% với @xenova/transformers)
    // Alternative: 'patrickjohncyh/fashion-clip' (fashion-specific, nhưng có thể không tương thích)
    this.modelName = modelName || process.env.IMAGE_SEARCH_MODEL || 'Xenova/clip-vit-base-patch32';
  }

  /**
   * Initialize model (lazy loading)
   * Model sẽ được download lần đầu sử dụng (~500MB)
   */
  private async getModel() {
    if (!this.model) {
      console.log(`🔄 Loading FashionCLIP model: ${this.modelName}...`);
      console.log('🔧 Environment check before model load:', {
        USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
        USE_BROWSER: process.env.USE_BROWSER,
        ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE,
        platform: process.platform,
        arch: process.arch
      });
      
      try {
        // LAZY LOAD: Load @xenova/transformers only when needed
        const transformers = await loadTransformers();
        const { pipeline } = transformers;
        
        this.model = await pipeline(
          'image-feature-extraction',
          this.modelName
        );
        console.log('✅ Model loaded successfully');
      } catch (error: any) {
        console.error('❌ Failed to load model:', {
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code,
          stack: error?.stack?.substring(0, 500)
        });
        
        // Check if it's an onnxruntime-node error
        if (
          error?.code === 'ERR_DLOPEN_FAILED' ||
          error?.message?.includes('ERR_DLOPEN_FAILED') ||
          error?.message?.includes('onnxruntime-node') ||
          error?.message?.includes('ld-linux-x86-64.so.2')
        ) {
          const errorMessage = `ERR_DLOPEN_FAILED: Cannot load native module (onnxruntime-node). ` +
            `Platform: ${process.platform}-${process.arch}, Node: ${process.version}. ` +
            `Environment variables: USE_ONNXRUNTIME=${process.env.USE_ONNXRUNTIME}, ` +
            `USE_BROWSER=${process.env.USE_BROWSER}, ONNXRUNTIME_NODE_DISABLE=${process.env.ONNXRUNTIME_NODE_DISABLE}. ` +
            `This usually means onnxruntime-node is still being loaded despite environment variables. ` +
            `Please ensure environment variables are set before importing @xenova/transformers.`;
          throw new Error(errorMessage);
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load model ${this.modelName}: ${errorMessage}`);
      }
    }
    return this.model;
  }

  /**
   * Preprocess image cho AI model
   * - Resize về 224x224 (CLIP standard)
   * - Normalize pixel values
   * - Convert to RGB format
   * Returns both buffer and metadata for RawImage creation
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
    try {
      // Resize và normalize
      const processed = await sharp(imageBuffer)
        .resize(224, 224, {
          fit: 'cover',
          position: 'center'
        })
        .raw() // Get raw pixel data for RawImage
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
   * Chia tất cả số trong vector cho "độ dài" của vector
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
   * Generate embedding từ image URL
   * 
   * @param imageUrl - URL của hình ảnh (từ S3, data URL, hoặc file://)
   * @returns Embedding vector (512 dimensions, normalized)
   */
  async generateEmbedding(imageUrl: string): Promise<number[]> {
    try {
      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Use generateEmbeddingFromBuffer which handles RawImage conversion
      return this.generateEmbeddingFromBuffer(imageBuffer);
    } catch (error) {
      console.error('Error generating embedding:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embedding từ image buffer (cách chuẩn cho local files)
   * 
   * @param imageBuffer - Buffer của hình ảnh
   * @returns Embedding vector (512 dimensions, normalized)
   */
  async generateEmbeddingFromBuffer(imageBuffer: Buffer): Promise<number[]> {
    try {
      // Preprocess (resize về 224x224, optimize)
      const { buffer, width, height } = await this.preprocessImage(imageBuffer);

      // Get model
      const model = await this.getModel();

      // Convert buffer to RawImage for @xenova/transformers
      // RawImage constructor: new RawImage(data, width, height, channels)
      // data must be Uint8Array or Uint8ClampedArray
      // channels = 3 for RGB
      const transformers = await loadTransformers();
      const { RawImage } = transformers;
      const uint8Array = new Uint8Array(buffer);
      const rawImage = new RawImage(uint8Array, width, height, 3);

      // Generate embedding
      const output = await model(rawImage);
      
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
        // Truncate or pad if needed
        if (embedding.length > 512) {
          embedding = embedding.slice(0, 512);
        } else {
          embedding = [...embedding, ...new Array(512 - embedding.length).fill(0)];
        }
      }

      // Normalize vector (important for cosine similarity)
      return this.normalizeVector(embedding);
    } catch (error) {
      console.error('Error generating embedding from buffer:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation from buffer failed: ${errorMessage}`);
    }
  }

  /**
   * Batch generate embeddings (hiệu quả hơn)
   * 
   * @param imageUrls - Array các image URLs
   * @returns Array các embedding vectors
   */
  async generateEmbeddingsBatch(imageUrls: string[]): Promise<number[][]> {
    try {
      const model = await this.getModel();
      
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

      // Generate embeddings
      const embeddings = await Promise.all(
        processedImages.map(async (image) => {
          const output = await model(image);
          
          // Extract embedding
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
        })
      );

      return embeddings;
    } catch (error) {
      console.error('Error in batch embedding generation:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch embedding generation failed: ${errorMessage}`);
    }
  }
}

// Singleton instance
let embeddingService: FashionImageEmbedding | null = null;

/**
 * Get singleton instance của embedding service
 */
export function getEmbeddingService(): FashionImageEmbedding {
  if (!embeddingService) {
    embeddingService = new FashionImageEmbedding();
  }
  return embeddingService;
}
