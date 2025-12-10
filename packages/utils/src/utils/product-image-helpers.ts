/**
 * Product Image Helper Functions
 * Utilities for parsing, normalizing, and processing product images
 * 
 * NOTE: These functions are client-safe and don't use Node.js-only modules
 */

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
 * Extract S3 key from URL (handles S3, CloudFront, and direct paths)
 * Server-only function - uses extractS3KeyFromUrl from aws-s3
 */
export function extractKeyFromImageUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Try to extract from S3 URL (amazonaws.com)
    if (url.includes('amazonaws.com/')) {
      const urlParts = url.split('amazonaws.com/');
      if (urlParts.length > 1) {
        return urlParts[1].split('?')[0] || null;
      }
    }
    
    // Try to extract from CloudFront or direct path
    if (url.includes('/')) {
      const urlParts = url.split('/');
      const stagingIndex = urlParts.findIndex((part: string) => part.includes('staging'));
      if (stagingIndex >= 0) {
        return urlParts.slice(stagingIndex).join('/');
      }
      // Fallback: extract from pathname if it's a valid URL
      try {
        const urlObj = new URL(url);
        return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
      } catch {
        // Not a valid URL, return null
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract staging keys from array of image URLs
 * Server-only function - uses isStagingKey from s3-path-helper
 */
export function extractStagingKeysFromUrls(urls: string[]): string[] {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  
  return urls
    .map(url => extractKeyFromImageUrl(url))
    .filter((key): key is string => {
      if (!key) return false;
      // Check if key contains staging (supports both old and new structure)
      return key.includes('/staging/') || key.startsWith('staging/');
    });
}

/**
 * Map staging URLs to production URLs after commit
 * Helper function to replace staging URLs with production URLs
 */
export function mapStagingUrlsToProductionUrls(
  stagingUrls: string[],
  committedKeys: string[],
  productionUrls: string[]
): string[] {
  if (stagingUrls.length !== committedKeys.length || committedKeys.length !== productionUrls.length) {
    console.warn('⚠️ URL mapping mismatch:', {
      stagingCount: stagingUrls.length,
      committedCount: committedKeys.length,
      productionCount: productionUrls.length
    });
    return stagingUrls; // Return original URLs if mismatch
  }
  
  return stagingUrls.map((stagingUrl, index) => {
    // Extract filename from staging URL and match with committed key
    const stagingKey = extractKeyFromImageUrl(stagingUrl);
    if (!stagingKey) return stagingUrl;
    
    // Find matching committed key by filename
    const fileName = stagingKey.split('/').pop();
    const committedIndex = committedKeys.findIndex(ck => ck.endsWith(`/${fileName}`));
    
    if (committedIndex >= 0 && committedIndex < productionUrls.length) {
      return productionUrls[committedIndex];
    }
    
    // Fallback: return original URL if no match found
    return stagingUrl;
  });
}

