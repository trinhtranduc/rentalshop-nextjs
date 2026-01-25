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

// Detect if running on Alpine Linux (Docker)
function isAlpineLinux(): boolean {
  if (typeof process === 'undefined') return false;
  
  // Check for Alpine-specific indicators
  if (process.env.ALPINE === 'true') return true;
  
  // Check if running in Docker (common indicators)
  if (process.env.DOCKER === 'true') return true;
  
  // Check platform and try to detect Alpine
  if (process.platform === 'linux') {
    try {
      // Alpine uses musl libc, not glibc
      // If dlopen is not available or fails, likely Alpine
      if (typeof process.dlopen === 'undefined') return true;
    } catch (e) {
      // If we can't check, assume not Alpine for safety
    }
  }
  
  return false;
}

// Set environment variables ONLY on Alpine Linux
if (typeof process !== 'undefined' && isAlpineLinux()) {
  // Force WebAssembly mode on Alpine Linux (Docker)
  // This prevents ERR_DLOPEN_FAILED error
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'true';
  process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
  
  console.log('🔧 Alpine Linux detected - forcing WebAssembly mode');
} else {
  // Local development: Let @xenova/transformers choose backend automatically
  // Native onnxruntime-node will work and RawImage will function properly
  console.log('🔧 Local development - using native onnxruntime-node');
}

// LAZY LOAD: Import @xenova/transformers only when needed
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    // Set environment variables again before dynamic import (only on Alpine)
    if (typeof process !== 'undefined' && isAlpineLinux()) {
      process.env.USE_ONNXRUNTIME = 'false';
      process.env.USE_BROWSER = 'true';
      process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
    }
    
    console.log('🔄 Loading @xenova/transformers...');
    transformersModule = await import('@xenova/transformers');
    console.log('✅ @xenova/transformers loaded successfully');
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

      // STANDARD APPROACH: Create RawImage from raw pixel data
      // This is the approach that worked before (commit 10e15756e)
      const uint8Array = new Uint8Array(buffer);
      const rawImage = new RawImage(uint8Array, width, height, 3);
      
      console.log('🔄 Calling model with RawImage...');
      const output = await model(rawImage);
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
