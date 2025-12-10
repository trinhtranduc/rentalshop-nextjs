/**
 * Server-only image compression utilities for API routes
 * Uses sharp which is a Node.js native module
 */

import { VALIDATION } from '@rentalshop/constants';

const MAX_IMAGE_SIZE = VALIDATION.IMAGE_SIZES.PRODUCT; // 200KB
const MAX_WIDTH = VALIDATION.IMAGE_DIMENSIONS.PRODUCT; // 1920px
const DEFAULT_QUALITY = VALIDATION.IMAGE_QUALITY.PRODUCT; // 75

/**
 * Compress image to ensure it's under the configured size limit
 * Uses VALIDATION.IMAGE_SIZES.PRODUCT (200KB) for optimal web/mobile performance
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
    
    // Progressive compression strategy: quality -> resize -> lower quality
    let quality: number = DEFAULT_QUALITY; // Start at 75
    let currentWidth: number = MAX_WIDTH; // Start at 1920px
    let compressedBuffer: Buffer = bufferData;
    let attempts = 0;
    const MAX_ATTEMPTS = 25; // Prevent infinite loops
    
    console.log(`🔄 Starting compression: ${(originalSize / 1024).toFixed(1)}KB, target: ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB`);
    
    do {
      compressedBuffer = await sharp(bufferData)
        .resize(currentWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      attempts++;
      const currentSize = compressedBuffer.length;
      
      // If still too large, apply progressive compression strategy
      if (currentSize > MAX_IMAGE_SIZE) {
        if (quality > 50) {
          // Strategy 1: Reduce quality first (75 -> 50)
          quality -= 5;
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing quality to ${quality}`);
        } else if (currentWidth > 1200) {
          // Strategy 2: Reduce width if quality already at 50 (1920px -> 1200px)
          currentWidth = Math.max(1200, Math.floor(currentWidth * 0.75));
          quality = 50; // Reset quality when resizing
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing width to ${currentWidth}px`);
        } else if (quality > 40) {
          // Strategy 3: Reduce quality further (50 -> 40)
          quality -= 5;
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing quality to ${quality}`);
        } else if (currentWidth > 800) {
          // Strategy 4: Reduce width more (1200px -> 800px)
          currentWidth = Math.max(800, Math.floor(currentWidth * 0.8));
          quality = 40;
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing width to ${currentWidth}px`);
        } else if (quality > 30) {
          // Strategy 5: Reduce quality to minimum acceptable (40 -> 30)
          quality -= 5;
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing quality to ${quality}`);
        } else {
          // Last resort: Reduce width to minimum (800px -> 600px)
          currentWidth = Math.max(600, Math.floor(currentWidth * 0.85));
          quality = 30;
          console.log(`  ⬇️ Attempt ${attempts}: ${(currentSize / 1024).toFixed(1)}KB > ${(MAX_IMAGE_SIZE / 1024).toFixed(0)}KB, reducing width to ${currentWidth}px (last resort)`);
        }
      } else {
        // Successfully compressed under limit
        break;
      }
    } while (compressedBuffer.length > MAX_IMAGE_SIZE && attempts < MAX_ATTEMPTS);
    
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    const sizeKB = (compressedSize / 1024).toFixed(1);
    const limitKB = (MAX_IMAGE_SIZE / 1024).toFixed(0);
    
    if (compressedSize > MAX_IMAGE_SIZE) {
      console.warn(`⚠️ Image still too large after ${attempts} attempts: ${sizeKB}KB > ${limitKB}KB (quality: ${quality}, width: ${currentWidth}px)`);
    } else {
      console.log(`✅ Image compressed successfully: ${(originalSize / 1024).toFixed(1)}KB -> ${sizeKB}KB (${compressionRatio}% reduction, quality: ${quality}, width: ${currentWidth}px, attempts: ${attempts})`);
    }
    
    return compressedBuffer;
  } catch (error) {
    console.warn('⚠️ Image compression failed, using original:', error);
    return bufferData;
  }
}

