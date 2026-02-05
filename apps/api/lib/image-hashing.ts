/**
 * Perceptual Image Hashing (pHash)
 * 
 * ✅ 100% FREE - Pure JavaScript/TypeScript
 * ✅ Fast exact match detection (<100ms)
 * ✅ No external service needed
 * 
 * Use case:
 * - Detect exact/near-exact image matches
 * - Fast duplicate detection
 * - Pre-filter before expensive CLIP embedding
 */

import crypto from 'crypto';

/**
 * Generate perceptual hash (pHash) from image
 * Returns 64-bit hash as hex string
 * 
 * Algorithm:
 * 1. Resize image to 8x8 pixels
 * 2. Convert to grayscale
 * 3. Calculate average pixel value
 * 4. Generate hash: 1 if pixel > average, 0 otherwise
 * 5. Convert binary to hex
 */
export async function generatePerceptualHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import sharp to avoid loading if not needed
    const sharp = (await import('sharp')).default as any;
    
    // Resize to 8x8 (small enough for fast processing)
    const resized = await sharp(imageBuffer)
      .resize(8, 8, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3
      })
      .greyscale()
      .raw()
      .toBuffer();

    // Get pixel values
    const pixels = Array.from(resized);
    
    // Calculate average
    const avg = pixels.reduce((sum, p) => sum + p, 0) / pixels.length;
    
    // Generate hash: 1 if pixel > average, 0 otherwise
    const hash = pixels
      .map(p => p > avg ? '1' : '0')
      .join('');
    
    // Convert binary to hex (64 bits = 16 hex chars)
    return parseInt(hash, 2).toString(16).padStart(16, '0');
  } catch (error) {
    console.error('Error generating perceptual hash:', error);
    // Fallback to MD5 if pHash fails (e.g., sharp not available)
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
  }
}

/**
 * Calculate Hamming distance between two hashes
 * Lower distance = more similar
 * 
 * @param hash1 - First hash (hex string)
 * @param hash2 - Second hash (hex string)
 * @returns Hamming distance (0 = identical, higher = more different)
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  
  return distance;
}

/**
 * Check if two images are similar based on pHash
 * 
 * @param hash1 - First image hash
 * @param hash2 - Second image hash
 * @param threshold - Max Hamming distance for "similar" (default: 5)
 * @returns true if images are similar
 */
export function areImagesSimilar(
  hash1: string,
  hash2: string,
  threshold: number = 5
): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}

/**
 * Generate MD5 hash as fallback
 * Faster than pHash but less accurate for similar images
 */
export function generateMD5Hash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}
