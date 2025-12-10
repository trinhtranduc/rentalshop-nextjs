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


