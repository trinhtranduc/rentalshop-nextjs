// ============================================================================
// SERVER-ONLY EXPORTS - Machine Learning Services
// ============================================================================
// This file contains exports that should ONLY be used in server-side code
// (API routes, server components, background jobs)
// 
// These exports use native dependencies (sharp, @xenova/transformers) that
// cannot be bundled for client-side code.
//
// Usage:
//   import { getEmbeddingService } from '@rentalshop/database/server';
//
// DO NOT import this file in client-side code!

// Image embedding service
export { getEmbeddingService, FashionImageEmbedding } from './ml/image-embeddings';

// Vector store service
export { getVectorStore, ProductVectorStore } from './ml/vector-store';
export type { ProductEmbeddingMetadata } from './ml/vector-store';

// Background jobs for generating embeddings
export { 
  generateProductEmbedding, 
  generateAllProductEmbeddings 
} from './jobs/generate-product-embeddings';
