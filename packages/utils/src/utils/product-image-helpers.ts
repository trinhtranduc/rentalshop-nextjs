/**
 * Product Image Helper Functions
 * Utilities for parsing, normalizing, and processing product images
 */

import { VALIDATION } from '@rentalshop/constants';

// Use optimized size limit from constants (400KB for product images)
const MAX_IMAGE_SIZE = VALIDATION.IMAGE_SIZES.PRODUCT; // 400KB (optimized for web/mobile)

/**
 * Parse images from database (handles JSON string, array, or comma-separated string)
 */
export function parseProductImages(images: any): string[] {
  if (!images) return [];
  
  if (typeof images === 'string') {
    // Try parsing as JSON first
    if (images.trim().startsWith('[') || images.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Fall through to comma-separated handling
      }
    }
    // Handle comma-separated string
    return images.split(',').filter(Boolean).map((url: string) => url.trim());
  }
  
  if (Array.isArray(images)) {
    return images.map(String).filter(Boolean);
  }
  
  return [];
}

/**
 * Normalize images input to array format
 */
export function normalizeImagesInput(images: any): string[] {
  if (images === undefined || images === null) return [];
  
  if (Array.isArray(images)) {
    return images.filter(Boolean).map((img: any) => {
      // Handle nested arrays
      if (Array.isArray(img)) {
        return img[0];
      }
      // Handle JSON string arrays
      if (typeof img === 'string' && img.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(img);
          return Array.isArray(parsed) ? parsed[0] : img;
        } catch {
          return img;
        }
      }
      return String(img).trim();
    }).flat().filter(Boolean);
  }
  
  if (typeof images === 'string') {
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Split comma-separated string
      return images.split(',').filter(Boolean).map((url: string) => url.trim());
    }
  }
  
  return [];
}

/**
 * Combine existing images with new uploaded images
 */
export function combineProductImages(
  existingImages: any,
  newImages: string[]
): string[] {
  const normalizedExisting = normalizeImagesInput(existingImages);
  const normalizedNew = normalizeImagesInput(newImages);
  
  return [...normalizedExisting, ...normalizedNew].filter(Boolean);
}

/**
 * Compress image to ensure it's under the configured size limit
 * Uses VALIDATION.IMAGE_SIZES.PRODUCT (400KB) for optimal web/mobile performance
 */
export async function compressImageTo1MB(buffer: Buffer | Uint8Array): Promise<Buffer> {
  const MAX_SIZE = MAX_IMAGE_SIZE;
  const MAX_WIDTH = VALIDATION.IMAGE_DIMENSIONS.PRODUCT; // 1920px
  const DEFAULT_QUALITY = VALIDATION.IMAGE_QUALITY.PRODUCT; // 75
  
  // Ensure buffer is a proper Buffer instance
  const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  
  try {
    const sharp = (await import('sharp')).default as any;
    const originalSize = bufferData.length;
    
    // Start with quality 75 (balanced for web), reduce if needed
    let quality = DEFAULT_QUALITY;
    let compressedBuffer: Buffer = bufferData;
    
    do {
      compressedBuffer = await sharp(bufferData)
        .resize(MAX_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      // If still too large and quality > 60, reduce quality and retry
      if (compressedBuffer.length > MAX_SIZE && quality > 60) {
        quality -= 5; // Smaller steps for finer control
      } else {
        break;
      }
    } while (compressedBuffer.length > MAX_SIZE && quality > 60);
    
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    const sizeKB = (compressedSize / 1024).toFixed(1);
    const limitKB = (MAX_SIZE / 1024).toFixed(0);
    console.log(`📦 Image compressed: ${(originalSize / 1024).toFixed(1)}KB -> ${sizeKB}KB (${compressionRatio}% reduction, quality: ${quality}, limit: ${limitKB}KB)`);
    
    return compressedBuffer;
  } catch (error) {
    console.warn('⚠️ Image compression failed, using original:', error);
    return bufferData;
  }
}

