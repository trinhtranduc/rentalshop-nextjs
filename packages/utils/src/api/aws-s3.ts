import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// ============================================================================
// AWS S3 CONFIGURATION
// ============================================================================

// Validate AWS credentials
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Missing AWS credentials:', {
    hasAccessKey: !!AWS_ACCESS_KEY_ID,
    hasSecretKey: !!AWS_SECRET_ACCESS_KEY
  });
}

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Create S3Client function - Production Ready
function createS3Client() {
  const region = process.env.AWS_REGION || 'ap-southeast-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not found in environment variables. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  }
  
  // Sử dụng credentials từ environment variables
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  
  return client;
}

// Create initial client instance - handle cases where credentials might not be available yet
let s3Client: S3Client;
try {
  s3Client = createS3Client();
} catch (error) {
  console.warn('⚠️ S3 client not initialized due to missing credentials:', error instanceof Error ? error.message : 'Unknown error');
  // Create a placeholder that will be replaced when credentials are available
  s3Client = new S3Client({ region: AWS_REGION });
}

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN || '';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface S3UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  expiresIn?: number; // seconds
  preserveOriginalName?: boolean; // Whether to preserve original filename structure
}

export interface S3StreamUploadOptions extends S3UploadOptions {
  stream?: Readable;
}

export interface S3UploadResponse {
  success: boolean;
  data?: {
    url: string;
    key: string;
    bucket: string;
    region: string;
    cdnUrl?: string;
    s3Url?: string;
  };
  error?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simple validation - support JPG, PNG, and WebP
 */
function validateImageType(contentType: string, buffer: Buffer): { isValid: boolean; actualType: string } {
  const isJpg = contentType === 'image/jpeg' || contentType === 'image/jpg';
  const isPng = contentType === 'image/png';
  const isWebP = contentType === 'image/webp';
  
  // Quick magic bytes check for additional validation
  if (buffer.length >= 4) {
    const header = buffer.subarray(0, 4);
    
    // PNG: 89 50 4E 47
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return { isValid: true, actualType: 'image/png' };
    }
    
    // JPEG: FF D8
    if (header[0] === 0xFF && header[1] === 0xD8) {
      return { isValid: true, actualType: 'image/jpeg' };
    }
    
    // WebP: RIFF header check (RIFF + file size + WEBP)
    if (buffer.length >= 12) {
      const webpHeader = buffer.subarray(0, 12);
      if (webpHeader.toString('ascii', 0, 4) === 'RIFF' && 
          webpHeader.toString('ascii', 8, 12) === 'WEBP') {
        return { isValid: true, actualType: 'image/webp' };
      }
    }
  }
  
  // If magic bytes don't match but content type is valid, trust content type
  if (isJpg || isPng || isWebP) {
    return { isValid: true, actualType: contentType };
  }
  
  return { isValid: false, actualType: contentType };
}

// ============================================================================
// AWS S3 FUNCTIONS
// ============================================================================

/**
 * Upload file to AWS S3
 */
export async function uploadToS3(
  file: Buffer | Uint8Array,
  options: S3UploadOptions = {}
): Promise<S3UploadResponse> {
  // Declare variables outside try block for catch block access
  let folder: string = '';
  let finalFileName: string = '';
  let key: string = '';

  try {
    // Validate required environment variables
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }
    
    // Validate AWS credentials
    const cleanAccessKey = (AWS_ACCESS_KEY_ID || '').trim();
    const cleanSecretKey = (AWS_SECRET_ACCESS_KEY || '').trim();
    
    if (!cleanAccessKey || !cleanSecretKey) {
      throw new Error('AWS credentials not configured. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }
    
    // Log bucket and region info for debugging
    const region = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    console.log('📤 S3 Upload Info:', {
      bucketName: BUCKET_NAME,
      region: region,
      hasCredentials: !!(cleanAccessKey && cleanSecretKey)
    });

    const {
      folder: optionsFolder = 'uploads',
      fileName,
      contentType = 'image/jpeg',
      expiresIn = 3600,
      preserveOriginalName = false
    } = options;

    // Simple validation - support JPG, PNG, and WebP
    const inputBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const isImage = contentType.startsWith('image/');
    
    if (isImage) {
      const validation = validateImageType(contentType, inputBuffer);
      if (!validation.isValid) {
        throw new Error(`Invalid image type. Only JPG, PNG, and WebP are supported, got: ${contentType}`);
      }
    }
    
    // Generate filename with correct extension
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    
    let fileExtension = 'bin';
    if (isImage) {
      // Always use JPG extension for all images for consistency
      fileExtension = 'jpg';
    }
    
    if (fileName) {
      const nameWithoutExt = fileName.includes('.') 
        ? fileName.substring(0, fileName.lastIndexOf('.'))
        : fileName;
      
      const sanitizedName = nameWithoutExt
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      finalFileName = `${sanitizedName}-${timestamp}-${randomId}.${fileExtension}`;
    } else {
      finalFileName = `upload-${timestamp}-${randomId}.${fileExtension}`;
    }
    
    folder = optionsFolder;
    
    // Clean key to prevent signature mismatch issues (common problem from Stack Overflow)
    const cleanFileName = finalFileName.replace(/^\./, ''); // Remove leading dots
    key = `${folder}/${cleanFileName}`.replace(/\/+/g, '/'); // Remove double slashes

    // Simple S3 Upload - Use original buffer with proper content type
    const finalContentType = isImage ? 'image/jpeg' : contentType; // All images as JPEG for consistency
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: inputBuffer, // Use original buffer - no conversion
      ContentType: finalContentType, // Always JPEG for images for consistency
      ContentDisposition: 'inline',
      // ACL removed - bucket does not allow ACLs
    });

    // Sử dụng client đơn giản
    const client = createS3Client();
    await client.send(command);

    // Generate URLs
    const region = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    const s3Url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
    const cdnUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : s3Url;

    return {
      success: true,
      data: {
        url: cdnUrl, // Use CloudFront URL as primary
        key,
        bucket: BUCKET_NAME!,
        region,
        cdnUrl,
        s3Url // Keep S3 URL as fallback
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Enhanced error logging for bucket issues
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      console.error('❌ S3 Bucket Error:', {
        error: errorMessage,
        bucketName: BUCKET_NAME || 'NOT SET',
        region: AWS_REGION || process.env.AWS_REGION || 'us-east-1',
        hasCredentials: !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
        key: key || 'unknown'
      });
      
      // Provide more helpful error message
      if (errorMessage.includes('does not exist')) {
        return {
          success: false,
          error: `S3 bucket "${BUCKET_NAME || 'NOT CONFIGURED'}" does not exist in region "${AWS_REGION || process.env.AWS_REGION || 'us-east-1'}". Please check AWS_S3_BUCKET_NAME environment variable and ensure the bucket exists in your AWS account.`
        };
      }
    }
    
    console.error('❌ S3 Upload Error:', {
      error: errorMessage,
      bucketName: BUCKET_NAME || 'NOT SET',
      region: AWS_REGION || process.env.AWS_REGION || 'us-east-1',
      key: key || 'unknown'
    });
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Upload stream to AWS S3 (Based on Stack Overflow example)
 * This is useful for handling large files or streams directly from multipart form data
 */
export async function uploadStreamToS3(
  stream: Readable,
  options: S3StreamUploadOptions = {}
): Promise<S3UploadResponse> {
  let folder: string = '';
  let finalFileName: string = '';
  let key: string = '';

  try {
    // Validate AWS credentials (same as uploadToS3)
    const cleanAccessKey = (AWS_ACCESS_KEY_ID || '').trim();
    const cleanSecretKey = (AWS_SECRET_ACCESS_KEY || '').trim();
    
    if (!cleanAccessKey || !cleanSecretKey) {
      return {
        success: false,
        error: 'AWS credentials not configured. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      };
    }

    const {
      folder: optionsFolder = 'uploads',
      fileName,
      contentType = 'application/octet-stream',
    } = options;

    // Generate unique filename - force JPG for images
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const isImage = contentType.startsWith('image/');
    const fileExtension = isImage ? 'jpg' : (contentType.split('/')[1] || 'bin');
    finalFileName = fileName || `${timestamp}-${randomId}.${fileExtension}`;
    folder = optionsFolder;
    
    // Clean key to prevent signature mismatch issues
    const cleanFileName = finalFileName.replace(/^\./, '');
    key = `${folder}/${cleanFileName}`.replace(/\/+/g, '/');

    // Based on Stack Overflow solution: Use stream directly in PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: stream, // Stream directly - AWS SDK v3 handles this automatically
      ContentType: isImage ? 'image/jpeg' : contentType, // Force JPG for images
      ContentDisposition: 'inline',
      Metadata: isImage ? {
        'file-type': 'jpg',
        'original-format': 'converted-to-jpg'
      } : undefined,
      // ACL removed - bucket does not allow ACLs
    });

    // Create fresh client to avoid signature issues
    const freshClient = createS3Client();
    await freshClient.send(command);

    // Generate URLs
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    const cdnUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : s3Url;

    return {
      success: true,
      data: {
        url: s3Url,
        key,
        bucket: BUCKET_NAME!,
        region: process.env.AWS_REGION || 'us-east-1',
        cdnUrl
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Enhanced error logging for bucket issues
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      console.error('❌ S3 Bucket Error (Stream Upload):', {
        error: errorMessage,
        bucketName: BUCKET_NAME || 'NOT SET',
        region: AWS_REGION || process.env.AWS_REGION || 'us-east-1',
        hasCredentials: !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
        key: key || 'unknown'
      });
      
      // Provide more helpful error message
      if (errorMessage.includes('does not exist')) {
        return {
          success: false,
          error: `S3 bucket "${BUCKET_NAME || 'NOT CONFIGURED'}" does not exist in region "${AWS_REGION || process.env.AWS_REGION || 'us-east-1'}". Please check AWS_S3_BUCKET_NAME environment variable and ensure the bucket exists in your AWS account.`
        };
      }
    }
    
    console.error('❌ AWS S3 stream upload error:', {
      error: errorMessage,
      region: AWS_REGION || process.env.AWS_REGION || 'us-east-1',
      bucket: BUCKET_NAME || 'NOT SET',
      key: key || 'unknown'
    });
    
    let finalErrorMessage = errorMessage;
    
    if (errorMessage.includes('signature')) {
      finalErrorMessage = `AWS Signature Mismatch - Stream upload failed. Check credentials and region: ${AWS_REGION || process.env.AWS_REGION || 'us-east-1'}`;
    }
    
    return {
      success: false,
      error: finalErrorMessage
    };
  }
}

/**
 * Delete file from AWS S3
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Use fresh client for delete operation
    const freshClient = createS3Client();
    await freshClient.send(command);
    return true;
  } catch (error) {
    console.error('AWS S3 delete error:', error);
    return false;
  }
}

/**
 * Clean up orphaned staging files
 * Used when user uploads images but doesn't create product
 */
export async function cleanupStagingFiles(
  stagingKeys: string[]
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const stagingKey of stagingKeys) {
    try {
      const cleanStagingKey = stagingKey.trim().replace(/\/+/g, '/');
      
      // Ensure it's a staging file for safety
      if (!cleanStagingKey.startsWith('staging/')) {
        console.warn(`⚠️ Skipping non-staging file: ${cleanStagingKey}`);
        continue;
      }

      const deleted = await deleteFromS3(cleanStagingKey);
      if (deleted) {
        deletedCount++;
        console.log(`🗑️ Cleaned up staging file: ${cleanStagingKey}`);
      } else {
        errors.push(`Failed to delete ${cleanStagingKey}`);
      }
    } catch (error) {
      const errorMsg = `Failed to cleanup ${stagingKey}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors
  };
}

/**
 * Move file from staging to production folder in S3
 * This implements the Two-Phase Upload Pattern
 */
export async function commitStagingFiles(
  stagingKeys: string[], 
  targetFolder: string = 'product'
): Promise<{ success: boolean; committedKeys: string[]; errors: string[] }> {
  const committedKeys: string[] = [];
  const errors: string[] = [];

  for (const stagingKey of stagingKeys) {
    const cleanStagingKey = stagingKey.trim().replace(/\/+/g, '/');
    const filename = cleanStagingKey.replace(/^staging\//, '').replace(/^\./, '');
    const cleanTargetKey = `${targetFolder}/${filename}`.replace(/\/+/g, '/');
    
    try {
      // Copy from staging to target - Standard AWS approach
      const copyCommand = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${cleanStagingKey}`,
        Key: cleanTargetKey,
        MetadataDirective: 'COPY', // Preserve all original metadata and content type
        // ACL removed - bucket does not allow ACLs
      });

      // Use fresh client for copy operation
      const freshClient = createS3Client();
      await freshClient.send(copyCommand);
      
      // Only mark as committed after successful copy
      committedKeys.push(cleanTargetKey);
      console.log(`✅ Copied ${cleanStagingKey} → ${cleanTargetKey}`);
      
    } catch (error) {
      const errorMsg = `Failed to copy ${stagingKey}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      errors.push(errorMsg);
      continue; // Skip deletion if copy failed
    }
    
    // Delete staging file after successful copy
    try {
      await deleteFromS3(cleanStagingKey);
      console.log(`🗑️ Deleted staging file: ${cleanStagingKey}`);
    } catch (deleteError) {
      // Don't fail the whole operation if delete fails, but log the issue
      console.warn(`⚠️ Failed to delete staging file ${cleanStagingKey}:`, deleteError);
      // Could implement background cleanup job here
    }
  }

  return {
    success: errors.length === 0,
    committedKeys,
    errors
  };
}

/**
 * Generate presigned URL for direct upload
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error('AWS S3 presigned URL error:', error);
    return null;
  }
}

/**
 * Generate clean S3 URL for file access (direct or CDN)
 */
export async function generateAccessUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Prefer CloudFront URL if available (much cleaner and no access issues)
    if (CLOUDFRONT_DOMAIN) {
      return `https://${CLOUDFRONT_DOMAIN}/${key}`;
    }
    
    // Fallback to presigned URL since bucket is not public
    // This ensures access works but URLs are longer
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error('AWS S3 access URL error:', error);
    return null;
  }
}

/**
 * Process product images - return CloudFront URLs as-is
 */
export async function processProductImages(
  images: string | string[] | null | undefined,
  expiresIn: number = 86400 * 7 // Not used anymore, kept for compatibility
): Promise<string[]> {
  if (!images) return [];
  
  // Normalize to array
  const imageUrls: string[] = Array.isArray(images) 
    ? images.filter(Boolean)
    : images.split(',').filter(Boolean);

  // Return as-is since CloudFront URLs are already public and fast
  return imageUrls;
}

/**
 * Normalize image key/path to JPG extension
 */
export function normalizeImageKeyToJpg(key: string): string {
  try {
    // Check if it's an image key
    if (key.match(/\.(webp|png|jpeg|jpg)$/i)) {
      // Remove existing extension and add .jpg
      return key.replace(/\.(webp|png|jpeg|jpg)$/i, '.jpg');
    }
    return key;
  } catch (error) {
    console.warn('Failed to normalize image key:', error);
    return key;
  }
}

/**
 * Normalize image URL to JPG extension for consistent display
 */
export function normalizeImageUrlToJpg(url: string): string {
  try {
    // Handle URLs with query parameters (presigned URLs)
    const [baseUrl, queryParams] = url.split('?');
    
    // Check if it's an image URL
    if (baseUrl.match(/\.(webp|png|jpeg|jpg)$/i)) {
      // Remove existing extension and add .jpg
      const urlWithoutExt = baseUrl.replace(/\.(webp|png|jpeg|jpg)$/i, '');
      const normalizedUrl = `${urlWithoutExt}.jpg`;
      
      // Add query params back if they exist
      return queryParams ? `${normalizedUrl}?${queryParams}` : normalizedUrl;
    }
    
    return url;
  } catch (error) {
    console.warn('Failed to normalize image URL:', error);
    return url;
  }
}

/**
 * Extract S3 key from URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash and extract key
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}

/**
 * Check if URL is from our S3 bucket
 */
export function isS3Url(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const bucketUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
    const cdnUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}` : '';
    
    return url.startsWith(bucketUrl) || (cdnUrl ? url.startsWith(cdnUrl) : false);
  } catch (error) {
    return false;
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export {
  s3Client,
  BUCKET_NAME,
  CLOUDFRONT_DOMAIN,
  createS3Client
};
