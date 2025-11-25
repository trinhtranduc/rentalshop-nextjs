/**
 * Image Sync Utilities
 * Download images from old server and prepare for upload to new server
 */

export interface DownloadedImage {
  url: string;
  buffer: Buffer;
  contentType: string;
  fileName: string;
  size: number;
}

export interface ImageDownloadResult {
  originalUrls: string[];
  downloadedImages: DownloadedImage[];
  readyForUpload: boolean;
  errors?: Array<{ url: string; error: string }>;
}

/**
 * Download product images from old server for sync
 * Downloads images from URLs and stores in buffers for later upload
 * 
 * @param oldProduct - Product object from old server
 * @returns Image download result with buffers ready for upload
 */
export async function downloadProductImagesForSync(
  oldProduct: any
): Promise<ImageDownloadResult> {
  const result: ImageDownloadResult = {
    originalUrls: [],
    downloadedImages: [],
    readyForUpload: false,
    errors: []
  };

  try {
    // Extract image URLs from product
    // Support multiple formats: image, images, image_url, image_urls, etc.
    let imageUrls: string[] = [];

    if (oldProduct.images && Array.isArray(oldProduct.images)) {
      imageUrls = oldProduct.images.filter((url: any) => url && typeof url === 'string');
    } else if (oldProduct.image && typeof oldProduct.image === 'string') {
      imageUrls = [oldProduct.image];
    } else if (oldProduct.image_url && typeof oldProduct.image_url === 'string') {
      imageUrls = [oldProduct.image_url];
    } else if (oldProduct.image_urls && Array.isArray(oldProduct.image_urls)) {
      imageUrls = oldProduct.image_urls.filter((url: any) => url && typeof url === 'string');
    } else if (oldProduct.product_image) {
      // Handle single image or array
      if (Array.isArray(oldProduct.product_image)) {
        imageUrls = oldProduct.product_image.filter((url: any) => url && typeof url === 'string');
      } else if (typeof oldProduct.product_image === 'string') {
        imageUrls = [oldProduct.product_image];
      }
    }

    // Remove duplicates and empty strings
    imageUrls = [...new Set(imageUrls)].filter(url => url.trim().length > 0);

    result.originalUrls = imageUrls;

    if (imageUrls.length === 0) {
      result.readyForUpload = true; // No images to download, ready to proceed
      return result;
    }

    // Download each image
    for (const imageUrl of imageUrls) {
      try {
        const downloadedImage = await downloadImage(imageUrl);
        if (downloadedImage) {
          result.downloadedImages.push(downloadedImage);
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        result.errors?.push({
          url: imageUrl,
          error: errorMessage
        });
        console.error(`Failed to download image ${imageUrl}:`, errorMessage);
      }
    }

    // Mark as ready if at least some images were downloaded successfully
    result.readyForUpload = result.downloadedImages.length > 0 || imageUrls.length === 0;

    return result;
  } catch (error: any) {
    console.error('Error processing product images:', error);
    result.errors?.push({
      url: 'unknown',
      error: error.message || 'Unknown error processing images'
    });
    return result;
  }
}

/**
 * Download image from URL and return as Buffer
 * 
 * @param imageUrl - URL of the image to download
 * @returns Downloaded image data or null if failed
 */
async function downloadImage(imageUrl: string): Promise<DownloadedImage | null> {
  try {
    // Validate URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL');
    }

    // Handle relative URLs - prepend old server base URL if needed
    let fullUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      // Relative URL - would need old server base URL
      // For now, skip relative URLs or handle in caller
      throw new Error('Relative URLs not supported without base URL');
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      throw new Error('Invalid URL format');
    }

    // Fetch image
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'RentalShop-Sync/1.0'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if it's actually an image
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`);
    }

    // Get image data as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate buffer size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      throw new Error(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }

    if (buffer.length === 0) {
      throw new Error('Empty image data');
    }

    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname;
    const fileName = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;
    
    // Ensure filename has extension
    const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    const finalFileName = hasExtension 
      ? fileName 
      : `${fileName}.jpg`;

    return {
      url: imageUrl,
      buffer,
      contentType,
      fileName: finalFileName,
      size: buffer.length
    };
  } catch (error: any) {
    console.error(`Error downloading image ${imageUrl}:`, error.message);
    throw error;
  }
}

/**
 * Convert downloaded images to base64 for JSON serialization
 * Useful when sending data over API
 */
export function imagesToBase64(images: DownloadedImage[]): Array<{
  url: string;
  data: string; // base64 data URL
  contentType: string;
  fileName: string;
  size: number;
}> {
  return images.map(img => ({
    url: img.url,
    data: `data:${img.contentType};base64,${img.buffer.toString('base64')}`,
    contentType: img.contentType,
    fileName: img.fileName,
    size: img.size
  }));
}

