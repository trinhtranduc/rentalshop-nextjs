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
 * Extract S3 key from URL (handles S3, CloudFront, custom domains, and direct paths)
 * Server-only function - supports multiple URL formats
 * 
 * Supported URL formats:
 * - S3: https://bucket.s3.region.amazonaws.com/staging/file.jpg
 * - CloudFront: https://d1234567890.cloudfront.net/staging/file.jpg
 * - Custom domain: https://images.anyrent.shop/staging/file.jpg
 * - Custom domain (dev): https://dev-images.anyrent.shop/staging/file.jpg
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
    
    // Try to extract from CloudFront, custom domain, or direct path
    // Parse as URL to get pathname (handles custom domains)
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash and extract key
      const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      // Return key if it's not empty
      if (key) {
        return key.split('?')[0]; // Remove query params if any
      }
    } catch {
      // Not a valid URL, try manual parsing
    }
    
    // Fallback: manual extraction from path segments
    if (url.includes('/')) {
      const urlParts = url.split('/');
      const stagingIndex = urlParts.findIndex((part: string) => part.includes('staging'));
      if (stagingIndex >= 0) {
        return urlParts.slice(stagingIndex).join('/');
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
 * 
 * Handles mixed URLs: only maps URLs that are staging, preserves existing production URLs
 * 
 * @param allUrls - All image URLs (may include both staging and production URLs)
 * @param committedKeys - Production keys after commit (from commitStagingFiles)
 * @param productionUrls - Production URLs to use (CloudFront custom domain)
 * @returns Mapped URLs with staging URLs replaced by production URLs
 */
export function mapStagingUrlsToProductionUrls(
  allUrls: string[],
  committedKeys: string[],
  productionUrls: string[]
): string[] {
  if (committedKeys.length !== productionUrls.length) {
    console.warn('⚠️ URL mapping mismatch:', {
      committedCount: committedKeys.length,
      productionCount: productionUrls.length
    });
    return allUrls; // Return original URLs if mismatch
  }
  
  return allUrls.map((url) => {
    // Extract key from URL
    const urlKey = extractKeyFromImageUrl(url);
    if (!urlKey) return url; // Keep URL if can't extract key
    
    // Check if this is a staging URL
    const isStaging = urlKey.includes('/staging/') || urlKey.startsWith('staging/');
    if (!isStaging) {
      // Not a staging URL, keep it as-is (already production URL)
      return url;
    }
    
    // This is a staging URL, find matching production URL by filename
    const fileName = urlKey.split('/').pop();
    if (!fileName) return url;
    
    // Find matching committed key by filename
    const committedIndex = committedKeys.findIndex(ck => {
      const committedFileName = ck.split('/').pop();
      return committedFileName === fileName;
    });
    
    if (committedIndex >= 0 && committedIndex < productionUrls.length) {
      // Return production URL for this staging URL
      return productionUrls[committedIndex];
    }
    
    // No match found, keep original URL (shouldn't happen in normal flow)
    console.warn(`⚠️ No production URL found for staging key: ${urlKey}`);
    return url;
  });
}

