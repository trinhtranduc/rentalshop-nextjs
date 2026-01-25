/**
 * Image Embedding Service
 * Sử dụng CLIP model để tạo embeddings từ hình ảnh
 * 
 * Default Model: Xenova/clip-vit-base-patch32 (tương thích 100% với @xenova/transformers)
 * Alternative: patrickjohncyh/fashion-clip (fashion-specific, cần test compatibility)
 * Vector dimension: 512
 */

import { pipeline, env, RawImage } from '@xenova/transformers';
import sharp from 'sharp';

// Disable local model files (use remote models)
env.allowLocalModels = false;
env.allowRemoteModels = true;

// CRITICAL: Force pure JavaScript mode to avoid onnxruntime-node dependency
// onnxruntime-node requires glibc (ld-linux-x86-64.so.2) which Alpine Linux doesn't have
// @xenova/transformers can work in pure JavaScript mode without native binaries
// Set environment variables BEFORE importing to prevent onnxruntime-node from being loaded
if (typeof process !== 'undefined') {
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'false';
  // Disable onnxruntime-node explicitly
  process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
}
env.useBrowser = false; // Don't use browser APIs
env.useCustomBackend = false; // Don't use custom backend
// Disable ONNX Runtime backend (force WebAssembly/JavaScript)
if (env.backends) {
  env.backends.onnx = null; // Disable ONNX Runtime backend
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
      try {
        this.model = await pipeline(
          'image-feature-extraction',
          this.modelName
        );
        console.log('✅ Model loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load model:', error);
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
