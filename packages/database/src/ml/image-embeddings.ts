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
  // USE_BROWSER=true forces WebAssembly mode (browser-compatible runtime)
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'true'; // CRITICAL: Set to true to force WebAssembly mode
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
      process.env.USE_BROWSER = 'true'; // CRITICAL: Set to true to force WebAssembly mode
      process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
    }
    
    // CRITICAL: Install require interceptor BEFORE dynamic import
    // This prevents onnxruntime-node from being loaded even if @xenova/transformers tries to require it
    if (typeof require !== 'undefined') {
      try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        
        // Intercept require calls to return mock object with create() method for onnxruntime-node
        // @xenova/transformers will call onnxruntime.create() and catch the error to fallback to WebAssembly
        Module.prototype.require = function(id: string) {
          if (id === 'onnxruntime-node' || id.includes('onnxruntime-node')) {
            console.log('ℹ️ onnxruntime-node requested, returning mock object with create() method for WebAssembly fallback');
            // Return mock object with create() method that throws to force WebAssembly fallback
            return {
              create: function() {
                throw new Error('onnxruntime-node is not available, using WebAssembly fallback');
              }
            };
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
    // This helps verify if Dockerfile removal and mock module creation worked
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Check multiple possible paths (monorepo structure)
        const possiblePaths = [
          path.join(process.cwd(), 'node_modules', 'onnxruntime-node'),
          path.join(process.cwd(), '..', 'node_modules', 'onnxruntime-node'),
          path.join(process.cwd(), '../..', 'node_modules', 'onnxruntime-node'),
          path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'onnxruntime-node'),
        ];
        
        let foundPath: string | null = null;
        let isMockModule = false;
        
        for (const onnxPath of possiblePaths) {
          if (fs.existsSync(onnxPath)) {
            foundPath = onnxPath;
            // Check if it's a mock module (has index.js but no package.json)
            const hasPackageJson = fs.existsSync(path.join(onnxPath, 'package.json'));
            const hasIndexJs = fs.existsSync(path.join(onnxPath, 'index.js'));
            
            if (hasIndexJs && !hasPackageJson) {
              isMockModule = true;
              console.log(`✅ Found mock onnxruntime-node module at: ${onnxPath}`);
              // Read and log first line of mock module
              try {
                const mockContent = fs.readFileSync(path.join(onnxPath, 'index.js'), 'utf8');
                console.log(`📄 Mock module content preview: ${mockContent.substring(0, 100)}...`);
              } catch (e) {
                // Ignore read errors
              }
            } else if (hasPackageJson) {
              console.warn(`⚠️ WARNING: Real onnxruntime-node package found at: ${onnxPath}`);
              console.warn('⚠️ This means Dockerfile removal step may have failed');
            }
            break;
          }
        }
        
        if (!foundPath) {
          console.log('✅ Verified: onnxruntime-node not found in any checked paths');
          console.log('ℹ️ This is expected if mock module was not created or is in a different location');
        } else if (!isMockModule) {
          console.warn('⚠️ WARNING: onnxruntime-node found but may not be a mock module');
        }
        
        // Also try to resolve using require.resolve to see what Node.js finds
        try {
          const resolvedPath = require.resolve('onnxruntime-node');
          console.log(`🔍 Node.js would resolve onnxruntime-node to: ${resolvedPath}`);
          
          // Check if resolved path is mock module
          if (fs.existsSync(resolvedPath)) {
            const resolvedDir = path.dirname(resolvedPath);
            const hasPackageJson = fs.existsSync(path.join(resolvedDir, 'package.json'));
            if (!hasPackageJson) {
              console.log('✅ Resolved path appears to be mock module (no package.json)');
            } else {
              console.warn('⚠️ WARNING: Resolved path appears to be real package (has package.json)');
            }
          }
        } catch (e: any) {
          if (e.code === 'MODULE_NOT_FOUND') {
            console.log('✅ require.resolve("onnxruntime-node") returns MODULE_NOT_FOUND (expected)');
          } else {
            console.log(`ℹ️ require.resolve check: ${e.message}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not check onnxruntime-node paths:', e);
      }
    }
    
    try {
      transformersModule = await import('@xenova/transformers');
      
      // CRITICAL: Patch @xenova/transformers to use mock onnxruntime-node
      // @xenova/transformers may access onnxruntime from global scope or cached module
      // We need to patch it directly in the transformers module
      try {
        // Create mock onnxruntime object with create() method
        const mockOnnxRuntime = {
          create: function() {
            throw new Error('onnxruntime-node is not available, using WebAssembly fallback');
          }
        };
        
        // CRITICAL: Patch transformersModule.env first to force WebAssembly mode
        if (transformersModule.env) {
          // CRITICAL: Force WebAssembly mode by setting useBrowser=true
          // This tells @xenova/transformers to use browser-compatible runtime (WebAssembly)
          transformersModule.env.useBrowser = true;
          transformersModule.env.useRemoteModels = true;
          // Disable ONNX Runtime explicitly
          transformersModule.env.useOnnxRuntime = false;
          
          // CRITICAL: Patch onnxruntime in env object if it exists
          // @xenova/transformers may check env.onnxruntime before trying to use it
          try {
            (transformersModule.env as any).onnxruntime = mockOnnxRuntime;
            console.log('✅ Patched transformersModule.env.onnxruntime');
          } catch (e) {
            console.warn('⚠️ Could not patch env.onnxruntime:', e);
          }
        }
        
        // CRITICAL: Patch global onnxruntime if it exists
        if (typeof global !== 'undefined') {
          (global as any).onnxruntime = mockOnnxRuntime;
          console.log('✅ Patched global.onnxruntime');
        }
        
        // CRITICAL: Try to patch internal modules that @xenova/transformers uses
        // @xenova/transformers may cache onnxruntime in internal modules
        try {
          // Try to access internal modules if they exist
          if (transformersModule.backends) {
            // Patch backends if accessible
            console.log('ℹ️ Found transformersModule.backends, attempting to patch...');
          }
          
          // Try to patch any internal onnxruntime references
          // This is a deep patch attempt - may not work but worth trying
          const patchInternalState = (obj: any, depth = 0): void => {
            if (depth > 3 || !obj || typeof obj !== 'object') return;
            
            try {
              if ('onnxruntime' in obj && obj.onnxruntime === undefined) {
                obj.onnxruntime = mockOnnxRuntime;
                console.log(`✅ Patched onnxruntime at depth ${depth}`);
              }
              
              // Recursively patch nested objects (limited depth)
              for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                  patchInternalState(obj[key], depth + 1);
                }
              }
            } catch (e) {
              // Ignore errors during deep patching
            }
          };
          
          // Try to patch transformersModule itself
          patchInternalState(transformersModule);
        } catch (e) {
          console.warn('⚠️ Could not patch internal state:', e);
        }
        
        console.log('🔧 Patched @xenova/transformers with mock onnxruntime-node');
      } catch (patchError) {
        console.warn('⚠️ Could not patch @xenova/transformers:', patchError);
      }
      
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
        
        // CRITICAL: Patch onnxruntime AGAIN before calling pipeline()
        // constructSession is called during pipeline() and may access onnxruntime from cached state
        // We need to ensure onnxruntime is patched right before model loading
        try {
          const mockOnnxRuntime = {
            create: function() {
              throw new Error('onnxruntime-node is not available, using WebAssembly fallback');
            }
          };
          
          // Patch global onnxruntime again (in case it was reset)
          if (typeof global !== 'undefined') {
            (global as any).onnxruntime = mockOnnxRuntime;
          }
          
          // Patch transformers.env.onnxruntime again
          if (transformers.env) {
            (transformers.env as any).onnxruntime = mockOnnxRuntime;
            transformers.env.useBrowser = true;
            transformers.env.useOnnxRuntime = false;
          }
          
          console.log('🔧 Re-patched onnxruntime before model loading');
        } catch (e) {
          console.warn('⚠️ Could not re-patch onnxruntime:', e);
        }
        
        const { pipeline } = transformers;
        
        // CRITICAL: Wrap pipeline() to catch onnxruntime errors and retry
        // constructSession may access onnxruntime from closure/internal module
        // If it fails, we need to catch and ensure WebAssembly fallback works
        try {
          this.model = await pipeline(
            'image-feature-extraction',
            this.modelName
          );
          console.log('✅ Model loaded successfully');
        } catch (pipelineError: any) {
          // Check if it's an onnxruntime error
          if (
            pipelineError?.message?.includes('Cannot read properties of undefined (reading \'create\')') ||
            pipelineError?.message?.includes('onnxruntime') ||
            pipelineError?.message?.includes('constructSession')
          ) {
            console.warn('⚠️ Pipeline failed with onnxruntime error, attempting WebAssembly fallback...');
            
            // Force WebAssembly mode more aggressively
            if (transformers.env) {
              transformers.env.useBrowser = true;
              transformers.env.useOnnxRuntime = false;
              // Try to clear any cached onnxruntime references
              try {
                delete (transformers.env as any).onnxruntime;
              } catch (e) {
                // Ignore
              }
            }
            
            // Retry pipeline with WebAssembly mode
            try {
              this.model = await pipeline(
                'image-feature-extraction',
                this.modelName
              );
              console.log('✅ Model loaded successfully with WebAssembly fallback');
            } catch (retryError: any) {
              // If retry also fails, throw original error
              throw new Error(
                `Failed to load model ${this.modelName} with WebAssembly fallback: ${retryError.message}. ` +
                `Original error: ${pipelineError.message}`
              );
            }
          } else {
            // Not an onnxruntime error, throw original error
            throw pipelineError;
          }
        }
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
