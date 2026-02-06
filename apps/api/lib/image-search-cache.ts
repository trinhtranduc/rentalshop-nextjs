/**
 * In-Memory Cache for Image Search
 * 
 * ✅ 100% FREE - Uses Node.js memory
 * ✅ Fast access (<1ms)
 * ✅ No external service needed
 * 
 * Strategy:
 * - Cache embeddings (24h TTL)
 * - Cache search results (1h TTL)
 * - Automatic cleanup of expired entries
 */

import crypto from 'crypto';
import { cacheStats } from './image-search-cache-stats';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ImageSearchCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000; // Max 1000 entries
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, ttl: number = 3600000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const imageSearchCache = new ImageSearchCache();

/**
 * Generate normalized image hash for caching
 * 
 * ✅ Works with both web and mobile
 * ✅ Normalizes image to ensure consistent hashing
 * ✅ Removes metadata differences (EXIF, etc.)
 * 
 * Strategy:
 * 1. Normalize image (resize, convert format, remove metadata)
 * 2. Generate hash from normalized image
 * 3. This ensures same image from web/mobile produces same hash
 */
export async function generateImageHash(buffer: Buffer): Promise<string> {
  try {
    // Normalize image before hashing to ensure consistency across clients
    // This handles cases where mobile/web compress differently
    const sharp = (await import('sharp')).default as any;
    
    // Normalize: resize to fixed size, convert to JPEG, remove metadata
    const normalized = await sharp(buffer)
      .resize(224, 224, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: false,
        mozjpeg: true
      })
      .removeAlpha()
      .toBuffer();
    
    // Generate hash from normalized image
    return crypto.createHash('md5').update(normalized).digest('hex');
  } catch (error) {
    // Fallback: hash original buffer if normalization fails
    console.warn('Image normalization failed, using original buffer for hash:', error);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }
}

/**
 * Generate image hash synchronously (fallback)
 * Uses MD5 hash of image buffer directly
 * 
 * ⚠️ Less reliable: Different compression from mobile/web will produce different hashes
 */
export function generateImageHashSync(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Get cached embedding
 */
export function getCachedEmbedding(imageHash: string): number[] | null {
  return imageSearchCache.get<number[]>(`embedding:${imageHash}`);
}

/**
 * Cache embedding
 * TTL: 24 hours
 */
export function cacheEmbedding(imageHash: string, embedding: number[]): void {
  imageSearchCache.set(`embedding:${imageHash}`, embedding, 24 * 60 * 60 * 1000);
}

/**
 * Get cached search results
 */
export function getCachedSearchResults(
  imageHash: string,
  filters: any
): any[] | null {
  const cacheKey = `search:${imageHash}:${JSON.stringify(filters)}`;
  const startTime = Date.now();
  const result = imageSearchCache.get<any[]>(cacheKey);
  const duration = Date.now() - startTime;
  
  if (result) {
    cacheStats.recordHit(duration);
  } else {
    cacheStats.recordMiss(0); // Miss doesn't have duration yet
  }
  
  return result;
}

/**
 * Cache search results
 * TTL: 1 hour
 */
export function cacheSearchResults(
  imageHash: string,
  filters: any,
  results: any[]
): void {
  const cacheKey = `search:${imageHash}:${JSON.stringify(filters)}`;
  imageSearchCache.set(cacheKey, results, 60 * 60 * 1000);
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    size: imageSearchCache.size(),
    maxSize: 1000,
  };
}

/**
 * Export cache statistics from stats module
 */
export { getCacheStatistics, resetCacheStatistics } from './image-search-cache-stats';
