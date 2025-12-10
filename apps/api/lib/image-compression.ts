/**
 * Server-only image compression utilities for API routes
 * Uses sharp which is a Node.js native module
 */

import { VALIDATION } from '@rentalshop/constants';

const MAX_IMAGE_SIZE = VALIDATION.IMAGE_SIZES.PRODUCT; // 400KB
const MAX_WIDTH = VALIDATION.IMAGE_DIMENSIONS.PRODUCT; // 1920px
const DEFAULT_QUALITY = VALIDATION.IMAGE_QUALITY.PRODUCT; // 75

/**
 * Compress image to ensure it's under the configured size limit
 * Uses VALIDATION.IMAGE_SIZES.PRODUCT (400KB) for optimal web/mobile performance
 * 
 * NOTE: This function uses sharp which is a Node.js native module.
 * Only use this in server-side code (API routes).
 */
export async function compressImageTo1MB(buffer: Buffer | Uint8Array): Promise<Buffer> {
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
      if (compressedBuffer.length > MAX_IMAGE_SIZE && quality > 60) {
        quality -= 5; // Smaller steps for finer control
      } else {
        break;
      }
    } while (compressedBuffer.length > MAX_IMAGE_SIZE && quality > 60);
    
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    const sizeKB = (compressedSize / 1024).toFixed(1);
    const limitKB = (MAX_IMAGE_SIZE / 1024).toFixed(0);
    console.log(`📦 Image compressed: ${(originalSize / 1024).toFixed(1)}KB -> ${sizeKB}KB (${compressionRatio}% reduction, quality: ${quality}, limit: ${limitKB}KB)`);
    
    return compressedBuffer;
  } catch (error) {
    console.warn('⚠️ Image compression failed, using original:', error);
    return bufferData;
  }
}

