import { API } from '@rentalshop/constants';
import imageCompression from 'browser-image-compression';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    size: number;
    uploadMethod?: 'cloudinary' | 'local' | 'base64';
  };
  message?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'processing' | 'complete';
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  folder?: string;
  quality?: number; // Image quality (0-1)
  maxWidth?: number; // Max width for client-side resize
  maxHeight?: number; // Max height for client-side resize
  enableCompression?: boolean; // Enable client-side compression
  compressionQuality?: number; // Compression quality (0-1)
  maxSizeMB?: number; // Max file size after compression
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const WARNING_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MIN_FILE_SIZE = 100; // 100 bytes

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate image file before upload
 * 
 * **Why we validate:**
 * - Prevents uploading malicious files (security)
 * - Ensures quality standards (user experience)
 * - Catches errors early before expensive upload operations
 * - Provides helpful feedback to users about issues
 */
export function validateImage(file: File, options: UploadOptions = {}): ImageValidationResult {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES
  } = options;

  const warnings: string[] = [];
  let error: string | undefined;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    error = `Invalid file type "${file.type}". Allowed types: ${allowedTypes.join(', ')}`;
    return { isValid: false, error };
  }

  // Check file size (reject if too large)
  if (file.size > maxFileSize) {
    error = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`;
    return { isValid: false, error };
  }

  // Check if file is too small (likely corrupted)
  if (file.size < MIN_FILE_SIZE) {
    error = 'File size is too small. The file may be corrupted or empty.';
    return { isValid: false, error };
  }

  // Warn if file is large but still acceptable
  if (file.size > WARNING_SIZE_THRESHOLD) {
    warnings.push(`Large file size (${(file.size / 1024 / 1024).toFixed(2)}MB) may slow down page loading. Consider compressing the image.`);
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ============================================================================
// IMAGE OPTIMIZATION FUNCTIONS
// ============================================================================

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compress image using browser-image-compression library
 * 
 * **Why use browser-image-compression:**
 * - Better compression algorithms
 * - Auto WebP conversion
 * - Progress tracking
 * - More reliable than manual canvas compression
 * - Handles various image formats
 */
export async function compressImage(
  file: File,
  options: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    quality?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<File> {
  const {
    maxSizeMB = 1, // 1MB max after compression
    maxWidthOrHeight = 1200, // Max dimension
    useWebWorker = true, // Use web worker for better performance
    quality = 0.8, // 80% quality
    onProgress
  } = options;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      onProgress: onProgress ? (progress) => onProgress(progress * 100) : undefined,
      // Auto convert to WebP for better compression
      fileType: 'image/webp',
      // Preserve EXIF data
      preserveExif: false,
      // Always compress, even if file is small
      alwaysKeepResolution: false
    });

    console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);
    return file; // Return original file if compression fails
  }
}

/**
 * Resize image on client-side before upload (legacy method)
 * 
 * **Why client-side resize:**
 * - Reduces upload time and bandwidth
 * - Faster user experience
 * - Less server load
 * - Still have server-side optimization as backup
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 900,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // Create new file from blob
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });

          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert file to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload image with XMLHttpRequest for progress tracking
 * 
 * **Why XMLHttpRequest instead of fetch:**
 * - XMLHttpRequest provides native progress events
 * - fetch() doesn't support upload progress tracking
 * - More control over upload lifecycle
 * - Better error handling for network issues
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  token: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
          stage: 'uploading'
        });
      }
    });

    // Handle upload complete
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          
          if (onProgress) {
            onProgress({
              loaded: 100,
              total: 100,
              percentage: 100,
              stage: 'complete'
            });
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'));
    });

    // Configure request
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000; // 60 second timeout

    // Start upload
    if (onProgress) {
      onProgress({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: 'preparing'
      });
    }

    xhr.send(formData);
  });
}

/**
 * Upload image to server with progress tracking, validation, and fallbacks
 * 
 * **Complete upload flow:**
 * 1. Validate image (type, size, quality)
 * 2. Optional client-side resize/optimization
 * 3. Upload with progress tracking
 * 4. Automatic fallback to base64 if upload fails (optional)
 * 
 * @param file - Image file to upload
 * @param token - Authentication token
 * @param options - Upload configuration options
 */
export async function uploadImage(
  file: File,
  token: string,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const {
    onProgress,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    folder = 'rentalshop/products',
    quality = 0.85,
    maxWidth,
    maxHeight,
    enableCompression = true,
    compressionQuality = 0.8,
    maxSizeMB = 1
  } = options;

  try {
    // Stage 1: Validate image
    if (onProgress) {
      onProgress({ loaded: 0, total: 100, percentage: 0, stage: 'preparing' });
    }

    const validation = validateImage(file, { maxFileSize, allowedTypes });
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Image validation failed'
      };
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('Image upload warnings:', validation.warnings);
    }

    // Stage 2: Client-side compression (preferred) or resize
    let fileToUpload = file;
    
    if (enableCompression) {
      try {
        if (onProgress) {
          onProgress({ loaded: 10, total: 100, percentage: 10, stage: 'processing' });
        }
        
        console.log(`Compressing image: ${(file.size / 1024).toFixed(2)}KB`);
        fileToUpload = await compressImage(file, {
          maxSizeMB,
          maxWidthOrHeight: maxWidth || 1200,
          quality: compressionQuality,
          onProgress: (progress) => {
            if (onProgress) {
              onProgress({ 
                loaded: 10 + (progress * 0.3), // 10-40% for compression
                total: 100, 
                percentage: 10 + Math.round(progress * 0.3), 
                stage: 'processing' 
              });
            }
          }
        });
      } catch (compressionError) {
        console.warn('Image compression failed, trying resize fallback:', compressionError);
        
        // Fallback to resize if compression fails
        if (maxWidth && maxHeight) {
          try {
            const dimensions = await getImageDimensions(file);
            if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
              console.log(`Resizing image from ${dimensions.width}x${dimensions.height} to fit ${maxWidth}x${maxHeight}`);
              fileToUpload = await resizeImage(file, maxWidth, maxHeight, quality);
              console.log(`Image resized. Size reduced from ${(file.size / 1024).toFixed(2)}KB to ${(fileToUpload.size / 1024).toFixed(2)}KB`);
            }
          } catch (resizeError) {
            console.warn('Client-side resize also failed, uploading original:', resizeError);
            // Continue with original file if both fail
          }
        }
      }
    } else if (maxWidth && maxHeight) {
      // Legacy resize method (if compression disabled)
      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
          console.log(`Resizing image from ${dimensions.width}x${dimensions.height} to fit ${maxWidth}x${maxHeight}`);
          fileToUpload = await resizeImage(file, maxWidth, maxHeight, quality);
          console.log(`Image resized. Size reduced from ${(file.size / 1024).toFixed(2)}KB to ${(fileToUpload.size / 1024).toFixed(2)}KB`);
        }
      } catch (resizeError) {
        console.warn('Client-side resize failed, uploading original:', resizeError);
        // Continue with original file if resize fails
      }
    }

    // Stage 3: Upload to server
    const formData = new FormData();
    formData.append('image', fileToUpload);
    formData.append('folder', folder);

    // Use getApiBaseUrl() to ensure consistent API URL across all environments
    // This will use NEXT_PUBLIC_API_URL from .env.local or fallback to environment-based defaults
    const { getApiBaseUrl } = await import('../config/api');
    const apiUrl = getApiBaseUrl();
    const uploadUrl = `${apiUrl}/api/upload/image`;

    const result = await uploadWithProgress(uploadUrl, formData, token, onProgress);

    return result;

  } catch (error) {
    console.error('Railway Volume upload failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Railway Volume upload failed'
    };
  }
}

/**
 * Upload multiple images with individual progress tracking
 * 
 * @param files - Array of image files to upload
 * @param token - Authentication token
 * @param options - Upload configuration options
 * @param onFileProgress - Callback for individual file progress (optional)
 */
export async function uploadImages(
  files: File[],
  token: string,
  options: UploadOptions = {},
  onFileProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResponse[]> {
  const uploadPromises = files.map((file, index) => {
    const fileOptions: UploadOptions = {
      ...options,
      onProgress: onFileProgress ? (progress) => onFileProgress(index, progress) : undefined
    };
    return uploadImage(file, token, fileOptions);
  });

  return Promise.all(uploadPromises);
}

/**
 * Cancel ongoing upload (for future implementation with AbortController)
 */
export function createUploadController() {
  const controller = new AbortController();
  
  return {
    signal: controller.signal,
    cancel: () => controller.abort()
  };
}

// All functions are already exported individually above
