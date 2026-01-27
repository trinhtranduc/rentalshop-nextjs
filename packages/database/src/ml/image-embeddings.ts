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
              console.log('🚫 Blocking onnxruntime-node import - returning mock object for WASM fallback');
              // ROOT CAUSE FIX: Return object with InferenceSession structure
              // Library tries to access onnxruntime.InferenceSession.create()
              // If we return undefined, library throws "Cannot read properties of undefined"
              // Solution: Return object with structure, but create() throws error
              // Library will catch error and immediately fallback to WASM
              return {
                InferenceSession: {
                  create: function() {
                    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                  }
                },
                create: function() {
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
    // CRITICAL: Use Function constructor to ensure true dynamic import
    // TypeScript may convert import() to require() during compilation
    // This delays the import to after compilation, ensuring dynamic import works correctly
    // Official solution from Transformers.js creator
    const TransformersApi = Function('return import("@xenova/transformers")')();
    transformersModule = await TransformersApi;
    console.log('✅ @xenova/transformers loaded successfully');
    
    // CRITICAL: Configure cache directory for transformers.js
    // Based on: https://github.com/huggingface/transformers.js/issues/295
    // The library needs a writable cache directory for model files and WASM files
    if (useWebAssembly && transformersModule && transformersModule.env) {
      try {
        const path = require('path');
        const fs = require('fs');
        
        // Use /tmp for cache in Docker/Railway (writable location)
        // Or use node_modules/@xenova/transformers/.cache if available
        const cacheDir = process.env.TRANSFORMERS_CACHE_DIR || '/tmp/transformers-cache';
        
        // Ensure cache directory exists and is writable
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          console.log(`📁 Created transformers cache directory: ${cacheDir}`);
        }
        
        // Check if WASM files are accessible
        try {
          const transformersPath = require.resolve('@xenova/transformers/package.json');
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
    
    // CRITICAL: Deep patch @xenova/transformers module to force WebAssembly mode
    // This ensures onnxruntime-node is never used, even if it's imported
    if (useWebAssembly && transformersModule) {
      console.log('🔧 Deep patching @xenova/transformers to force WebAssembly mode...');
      
      // Patch environment variables
      if (transformersModule.env) {
        transformersModule.env.useBrowser = true;
        transformersModule.env.useOnnxruntime = false;
        // @ts-ignore
        // Set mock onnxruntime with InferenceSession structure
        const mockOnnxRuntimeForEnv = {
          InferenceSession: {
            create: function() {
              throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
            }
          },
          create: function() {
            throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
          }
        };
        transformersModule.env.onnxruntime = mockOnnxRuntimeForEnv;
      }
      
      // Patch global onnxruntime references
      if (typeof global !== 'undefined') {
        // @ts-ignore
        // Set mock onnxruntime with InferenceSession structure
        const mockOnnxRuntimeForGlobal = {
          InferenceSession: {
            create: function() {
              throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
            }
          },
          create: function() {
            throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
          }
        };
        // @ts-ignore
        (global as any).onnxruntime = mockOnnxRuntimeForGlobal;
        // @ts-ignore
        if ((global as any).window) {
          // @ts-ignore
          (global as any).window.onnxruntime = mockOnnxRuntimeForGlobal;
        }
      }
      
        // CRITICAL: Patch internal onnxruntime references in transformers module
        // ROOT CAUSE FIX: Set to empty object instead of undefined or throwing errors
        // Empty object allows library to check for methods without throwing "Cannot read property" errors
        // Library will detect methods don't work and automatically fallback to WASM
        try {
        
        // Helper function to safely set property (handles non-extensible objects)
        const safeSetProperty = (obj: any, prop: string, value: any) => {
          try {
            // Try direct assignment first
            obj[prop] = value;
          } catch (e) {
            try {
              // If direct assignment fails, try Object.defineProperty
              Object.defineProperty(obj, prop, {
                value: value,
                writable: true,
                enumerable: true,
                configurable: true
              });
            } catch (e2) {
              try {
                // If Object.defineProperty fails, try Reflect.set
                Reflect.set(obj, prop, value);
              } catch (e3: any) {
                // If all methods fail, log and continue
                console.warn(`⚠️ Could not set property ${prop}:`, e3?.message || String(e3));
              }
            }
          }
        };
        
        // Mock onnxruntime object with InferenceSession structure
        // Library tries to access onnxruntime.InferenceSession.create()
        // Must have proper structure to avoid "Cannot read properties of undefined"
        const mockOnnxRuntime = {
          InferenceSession: {
            create: function() {
              throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
            }
          },
          create: function() {
            throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
          }
        };
        
        // Try to patch internal state
        // @ts-ignore
        if (transformersModule.env && transformersModule.env.backends) {
          try {
            // @ts-ignore
            safeSetProperty(transformersModule.env.backends, 'onnxruntime', mockOnnxRuntime);
          } catch (e) {
            console.warn('⚠️ Could not patch env.backends.onnxruntime:', e);
          }
        }
        
        // CRITICAL: Patch internal onnxruntime reference that constructSession uses
        // constructSession may access onnxruntime from env.onnxruntime or a cached reference
        // @ts-ignore
        if (transformersModule.env) {
          try {
            // @ts-ignore
            safeSetProperty(transformersModule.env, 'onnxruntime', mockOnnxRuntime);
          } catch (e) {
            console.warn('⚠️ Could not patch env.onnxruntime:', e);
          }
        }
        
        // Patch module-level onnxruntime if it exists (may be non-extensible)
        try {
          // @ts-ignore
          safeSetProperty(transformersModule, 'onnxruntime', mockOnnxRuntime);
        } catch (e) {
          console.warn('⚠️ Could not patch module-level onnxruntime (object may be non-extensible):', e);
        }
        
        // Patch require cache for onnxruntime-node (if it exists)
        if (typeof require !== 'undefined' && require.cache) {
          // Mark onnxruntime-node as unavailable in require cache
          const onnxCacheKey = Object.keys(require.cache).find(key => 
            key.includes('onnxruntime-node')
          );
          if (onnxCacheKey) {
            try {
              // @ts-ignore - We're intentionally patching the cache
              require.cache[onnxCacheKey] = {
                id: onnxCacheKey,
                exports: {
                  InferenceSession: {
                    create: function() {
                      throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                    }
                  },
                  create: function() {
                    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                  }
                },
                loaded: true
              } as any;
              console.log('🔧 Patched onnxruntime-node in require cache (set to empty object)');
            } catch (e) {
              console.warn('⚠️ Could not patch require cache:', e);
            }
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
      
      // CRITICAL: Re-patch transformers module right before loading model
      // This ensures onnxruntime is blocked even if it was re-imported
      if (typeof process !== 'undefined' && shouldUseWebAssembly()) {
        console.log('🔧 Re-patching transformers before model load...');
        
        // Re-set environment variables
        process.env.USE_ONNXRUNTIME = 'false';
        process.env.USE_BROWSER = 'true';
        process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
        
        // ROOT CAUSE FIX: Set to undefined instead of mock object that throws errors
        // This allows library to gracefully detect unavailability and fallback to WASM
        
        // Helper function to safely set property (handles non-extensible objects)
        const safeSetProperty = (obj: any, prop: string, value: any) => {
          try {
            // Try direct assignment first
            obj[prop] = value;
          } catch (e) {
            try {
              // If direct assignment fails, try Object.defineProperty
              Object.defineProperty(obj, prop, {
                value: value,
                writable: true,
                enumerable: true,
                configurable: true
              });
            } catch (e2) {
              try {
                // If Object.defineProperty fails, try Reflect.set
                Reflect.set(obj, prop, value);
              } catch (e3: any) {
                // If all methods fail, log and continue
                console.warn(`⚠️ Could not set property ${prop}:`, e3?.message || String(e3));
              }
            }
          }
        };
        
        // Re-patch transformers module with mock object
        if (transformers && transformers.env) {
          try {
            transformers.env.useBrowser = true;
            transformers.env.useOnnxruntime = false;
            // @ts-ignore - Set mock object with InferenceSession structure
            const mockOnnxRuntimeForRepatch = {
              InferenceSession: {
                create: function() {
                  throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
                }
              },
              create: function() {
                throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
              }
            };
            safeSetProperty(transformers.env, 'onnxruntime', mockOnnxRuntimeForRepatch);
            // @ts-ignore
            if (transformers.env.backends) {
              // @ts-ignore
              safeSetProperty(transformers.env.backends, 'onnxruntime', mockOnnxRuntimeForRepatch);
            }
          } catch (e) {
            console.warn('⚠️ Could not re-patch transformers.env:', e);
          }
        }
        
        // Re-patch module-level onnxruntime (may be non-extensible)
        try {
          // @ts-ignore
          safeSetProperty(transformers, 'onnxruntime', mockOnnxRuntimeForRepatch);
        } catch (e) {
          console.warn('⚠️ Could not re-patch module-level onnxruntime (object may be non-extensible):', e);
        }
        
        // Re-patch global references
        if (typeof global !== 'undefined') {
          try {
            // @ts-ignore
            safeSetProperty(global, 'onnxruntime', mockOnnxRuntimeForRepatch);
          } catch (e) {
            console.warn('⚠️ Could not re-patch global.onnxruntime:', e);
          }
        }
        
        console.log('✅ Re-patching completed before model load');
      }
      
      const { pipeline } = transformers;
      
      // CRITICAL: Based on GitHub issues #1275 and #17
      // @xenova/transformers may retry with onnxruntime-node even after WASM fallback
      // The library has internal retry logic that tries onnxruntime-node multiple times
      // Solution: Ensure environment variables are set BEFORE pipeline call
      // and let the library's WASM fallback handle it automatically
      
      // Ensure environment variables are set (in case they were reset)
      if (typeof process !== 'undefined' && shouldUseWebAssembly()) {
        process.env.USE_ONNXRUNTIME = 'false';
        process.env.USE_BROWSER = 'true';
        process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
        
        // Ensure transformers module is patched
        if (transformers && transformers.env) {
          transformers.env.useBrowser = true;
          transformers.env.useOnnxruntime = false;
        }
      }
      
      // CRITICAL: The library has internal retry logic that tries onnxruntime-node for EACH component
      // (vision encoder, text encoder, etc.). Each component triggers a retry.
      // The WASM fallback message appears, but the library still retries for other components.
      // 
      // SOLUTION: Let the library complete its internal retry cycle naturally.
      // Don't catch errors too early - the library will handle retries internally.
      // Only catch errors after the library has exhausted all its internal retries.
      
      // Verify WASM files are accessible before calling pipeline
      const useWebAssembly = shouldUseWebAssembly();
      if (useWebAssembly) {
        try {
          const path = require('path');
          const fs = require('fs');
          
          // Check if transformers module is accessible
          const transformersPath = require.resolve('@xenova/transformers/package.json');
          const transformersDir = path.dirname(transformersPath);
          const wasmPath = path.join(transformersDir, 'dist');
          const wasmExists = fs.existsSync(wasmPath);
          
          console.log('🔍 WASM files verification before pipeline call:', {
            transformersPath,
            transformersDir,
            wasmPath,
            wasmExists,
            env: {
              USE_ONNXRUNTIME: process.env.USE_ONNXRUNTIME,
              USE_BROWSER: process.env.USE_BROWSER,
              ONNXRUNTIME_NODE_DISABLE: process.env.ONNXRUNTIME_NODE_DISABLE
            }
          });
          
          if (!wasmExists) {
            console.warn('⚠️ WASM files directory not found at:', wasmPath);
            console.warn('⚠️ This may cause WASM backend initialization to fail');
            console.warn('⚠️ Library will attempt to download WASM files if needed');
          }
        } catch (e) {
          console.warn('⚠️ Could not verify WASM files location:', e);
          // Continue anyway - library may download WASM files if needed
        }
      }
      
      // CRITICAL: Let the library complete its internal retry cycle
      // The library will:
      // 1. Try onnxruntime-node for vision component → fail → WASM fallback
      // 2. Try onnxruntime-node for text component → fail → WASM fallback
      // 3. Eventually use WASM backend for all components
      // 
      // We should NOT catch errors during this process - let it complete naturally.
      // Only catch errors if the library truly fails after all internal retries.
      
            console.log('🔄 Calling pipeline() with timeout protection (issue #1135 fix)...');
            console.log('🔄 Library will handle WASM fallback internally - this may take 30-90 seconds...');
            console.log('🔄 NOTE: You will see "onnxruntime-node is disabled" errors - this is EXPECTED');

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
              // COMMENTED: Error handling - investigating root cause
              // From logs: Library says "Using wasm as a fallback" but still throws error
              // This suggests library's internal WASM fallback is not working properly
              
              const errorMessage = pipelineError?.message || '';
              const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('took longer than');
              const isOnnxError = errorMessage.includes('onnxruntime-node is disabled') || 
                                 errorMessage.includes('onnxruntime');
              
              // CRITICAL: If it's an onnxruntime error, library is trying to fallback to WASM
              // The error "onnxruntime-node is disabled" is EXPECTED during fallback process
              // Library may retry multiple times for different components (vision, text, etc.)
              // We should NOT throw immediately - library needs time to complete fallback
              if (isOnnxError && !isTimeout) {
                console.warn('⚠️ onnxruntime error during model loading (EXPECTED during WASM fallback)');
                console.warn('⚠️ Library is attempting WASM fallback - this may take 30-90 seconds...');
                console.warn('⚠️ Error message:', errorMessage.substring(0, 200));
                
                // CRITICAL: Don't throw error immediately - library needs to complete fallback
                // Instead, retry pipeline call to allow library to complete WASM initialization
                console.log('🔄 Retrying pipeline call to allow library to complete WASM fallback...');
                
                // Wait a bit for library to initialize WASM backend
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Retry pipeline call - library should have initialized WASM by now
                try {
                  console.log('🔄 Retrying pipeline() call after WASM fallback...');
                  const retryPromise = pipeline('image-feature-extraction', this.modelName, {
                    device: 'cpu',
                    dtype: 'fp32'
                  });
                  const retryTimeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Retry timeout after 120 seconds')), 120000)
                  );
                  
                  this.model = await Promise.race([retryPromise, retryTimeout]);
                  console.log('✅ Model loaded successfully after WASM fallback retry');
                } catch (retryError: any) {
                  // If retry also fails, then WASM backend truly cannot initialize
                  console.error('❌ WASM fallback retry also failed:', retryError?.message);
                  throw new Error(`Failed to load model ${this.modelName}: WASM backend cannot initialize. Original error: ${errorMessage}`);
                }
              } else {
                // For timeout or other errors, throw immediately
                console.error('❌ Model loading failed:', {
                  error: errorMessage,
                  isTimeout,
                  isOnnxError,
                  platform: process.platform,
                  arch: process.arch,
                  nodeVersion: process.version,
                });
                
                if (isTimeout) {
                  console.error('❌ Possible causes:');
                  console.error('   1. WASM files missing or not accessible');
                  console.error('   2. WASM backend cannot initialize in this environment');
                  console.error('   3. Insufficient memory/resources');
                  console.error('   4. Pipeline promise hanging (issue #1135)');
                }
                
                throw pipelineError;
              }
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
