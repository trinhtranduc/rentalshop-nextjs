import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// Create S3Client function to avoid cached client issues
function createS3Client() {
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID || '',
      secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

const s3Client = createS3Client();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'rentalshop-images';
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN || '';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface S3UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  expiresIn?: number; // seconds
}

export interface S3UploadResponse {
  success: boolean;
  data?: {
    url: string;
    key: string;
    bucket: string;
    region: string;
    cdnUrl?: string;
  };
  error?: string;
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
    // Validate AWS credentials before upload
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials missing:', {
        hasAccessKey: !!AWS_ACCESS_KEY_ID,
        hasSecretKey: !!AWS_SECRET_ACCESS_KEY,
        accessKeyPreview: AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'missing'
      });
      
      return {
        success: false,
        error: 'AWS credentials not configured. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      };
    }
    
    console.log('✅ AWS credentials found:', {
      accessKeyPreview: `${AWS_ACCESS_KEY_ID.substring(0, 8)}...`,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: BUCKET_NAME
    });
    const {
      folder: optionsFolder = 'uploads',
      fileName,
      contentType = 'image/jpeg',
      expiresIn = 3600
    } = options;

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = contentType.split('/')[1] || 'jpg';
    finalFileName = fileName || `${timestamp}-${randomId}.${fileExtension}`;
    folder = optionsFolder;
    
    key = `${folder}/${finalFileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read', // Make file publicly accessible
    });

    // Create fresh client to avoid signature issues with region changes
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
        bucket: BUCKET_NAME,
        region: process.env.AWS_REGION || 'us-east-1',
        cdnUrl
      }
    };

  } catch (error) {
    console.error('AWS S3 upload error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      region: AWS_REGION,
      bucket: BUCKET_NAME,
      key: key || 'unknown',
      accessKeyPreview: AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'missing'
    });
    
    // Provide more specific error messages
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('signature')) {
      errorMessage = `Signature error - please verify AWS credentials (Access Key ID: ${AWS_ACCESS_KEY_ID?.substring(0, 8)}...) and region (${AWS_REGION})`;
    }
    
    return {
      success: false,
      error: errorMessage
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
    try {
      // Extract filename from staging key (remove staging/ prefix)
      const filename = stagingKey.replace(/^staging\//, '');
      const targetKey = `${targetFolder}/${filename}`;

      // Copy from staging to target
      const copyCommand = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${stagingKey}`,
        Key: targetKey,
        ACL: 'public-read',
      });

      // Use fresh client for copy operation
      const freshClient = createS3Client();
      await freshClient.send(copyCommand);

      // Delete staging file
      await deleteFromS3(stagingKey);

      committedKeys.push(targetKey);
      console.log(`✅ Moved ${stagingKey} → ${targetKey}`);
    } catch (error) {
      const errorMsg = `Failed to commit ${stagingKey}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      errors.push(errorMsg);
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
 * Generate presigned URL for file access
 */
export async function generateAccessUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
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
  CLOUDFRONT_DOMAIN
};
