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

// Create S3Client function to avoid cached client issues
function createS3Client() {
  // Clean credentials to remove invisible characters (common cause of signature mismatch)
  const cleanAccessKey = (AWS_ACCESS_KEY_ID || '').trim();
  const cleanSecretKey = (AWS_SECRET_ACCESS_KEY || '').trim();
  
  // Based on Stack Overflow solution: Always ensure client is properly initialized
  // Fix for the issue where S3 client wasn't properly instantiated in all cases
  if (!cleanAccessKey || !cleanSecretKey) {
    throw new Error('AWS credentials are missing or empty after trimming');
  }
  
  // Ensure region is consistent and properly set
  const region = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
  
  console.log('🔧 Creating S3 client with:', {
    region,
    accessKeyPreview: `${cleanAccessKey.substring(0, 8)}...`,
    bucket: process.env.AWS_S3_BUCKET_NAME || 'rentalshop-images'
  });
  
  const client = new S3Client({
    region: region,
    forcePathStyle: false,
    credentials: {
      accessKeyId: cleanAccessKey,
      secretAccessKey: cleanSecretKey,
    },
  });
  
  // Note: AWS SDK v3 automatically uses signature version v4
  
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
    // Validate AWS credentials before upload (based on Stack Overflow solutions)
    const cleanAccessKey = (AWS_ACCESS_KEY_ID || '').trim();
    const cleanSecretKey = (AWS_SECRET_ACCESS_KEY || '').trim();
    const region = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    
    if (!cleanAccessKey || !cleanSecretKey) {
      console.error('❌ AWS credentials missing or empty after trimming:', {
        hasAccessKey: !!cleanAccessKey,
        hasSecretKey: !!cleanSecretKey,
        accessKeyPreview: cleanAccessKey ? `${cleanAccessKey.substring(0, 8)}...` : 'missing',
        originalLength: AWS_ACCESS_KEY_ID?.length || 0,
        region
      });
      
      return {
        success: false,
        error: 'AWS credentials not configured or contain only whitespace. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      };
    }
    
    // Additional validation for ap-southeast-1 region - check for common issues
    if (region === 'ap-southeast-1') {
      console.log('🔍 ap-southeast-1 region detected - applying additional validation');
      
      // Check for potential credential issues
      if (cleanAccessKey.length !== 20) {
        console.warn('⚠️ Access Key length is not 20 characters:', cleanAccessKey.length);
      }
      
      if (cleanSecretKey.length !== 40) {
        console.warn('⚠️ Secret Key length is not 40 characters:', cleanSecretKey.length);
      }
    }
    
    console.log('✅ AWS credentials validated:', {
      accessKeyPreview: `${cleanAccessKey.substring(0, 8)}...`,
      accessKeyLength: cleanAccessKey.length,
      secretKeyLength: cleanSecretKey.length,
      region: AWS_REGION,
      bucket: BUCKET_NAME,
      signatureVersion: 'v4'
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
    
    // Clean key to prevent signature mismatch issues (common problem from Stack Overflow)
    const cleanFileName = finalFileName.replace(/^\./, ''); // Remove leading dots
    key = `${folder}/${cleanFileName}`.replace(/\/+/g, '/'); // Remove double slashes

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read', // Make file publicly accessible
    });

    // Based on Stack Overflow solution: Always create fresh client to avoid cached client issues
    // This fixes the common problem where client doesn't get properly initialized
    const freshClient = createS3Client();
    
    // Get the actual region being used by the client
    const actualRegion = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    
    console.log('📤 Uploading to S3:', {
      bucket: BUCKET_NAME,
      key,
      region: actualRegion,
      contentType,
      fileSize: file.byteLength || file.length
    });
    
    await freshClient.send(command);

    // Generate URLs with consistent region
    const s3Url = `https://${BUCKET_NAME}.s3.${actualRegion}.amazonaws.com/${key}`;
    const cdnUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : s3Url;

    return {
      success: true,
      data: {
        url: s3Url,
        key,
        bucket: BUCKET_NAME,
        region: actualRegion,
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
    
    // Provide more specific error messages based on Stack Overflow solutions
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('signature') || errorMessage.includes('Signature')) {
      const cleanAccessKey = (AWS_ACCESS_KEY_ID || '').trim();
      const cleanSecretKey = (AWS_SECRET_ACCESS_KEY || '').trim();
      const region = AWS_REGION || process.env.AWS_REGION || 'us-east-1';
      
      errorMessage = `AWS Signature Mismatch - Detailed fixes for region ${region}:
1. Check for invisible characters in credentials (spaces, line breaks, tabs)
2. Verify Access Key ID: ${cleanAccessKey.substring(0, 8)}... (length: ${cleanAccessKey.length})
3. Verify Secret Key length: ${cleanSecretKey.length} characters (should be 40)
4. Verify region: ${region}
5. Check bucket permissions and region compatibility
6. Verify AWS credentials have proper S3 permissions
7. Try regenerating AWS credentials if issue persists

Common ap-southeast-1 issues:
- Ensure bucket was created in ap-southeast-1 region
- Check if credentials are for the correct AWS account
- Verify bucket policy allows uploads`;
      
      console.error('🔍 Signature mismatch debug info:', {
        region,
        bucket: BUCKET_NAME,
        key: key || 'unknown',
        accessKeyLength: cleanAccessKey.length,
        secretKeyLength: cleanSecretKey.length,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = contentType.split('/')[1] || 'bin';
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
      ContentType: contentType,
      ACL: 'public-read',
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
        bucket: BUCKET_NAME,
        region: process.env.AWS_REGION || 'us-east-1',
        cdnUrl
      }
    };

  } catch (error) {
    console.error('AWS S3 stream upload error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      region: AWS_REGION,
      bucket: BUCKET_NAME,
      key: key || 'unknown'
    });
    
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('signature')) {
      errorMessage = `AWS Signature Mismatch - Stream upload failed. Check credentials and region: ${AWS_REGION}`;
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
      // Clean and validate keys to prevent signature mismatch (Stack Overflow fix)
      const cleanStagingKey = stagingKey.trim().replace(/\/+/g, '/');
      const filename = cleanStagingKey.replace(/^staging\//, '').replace(/^\./, '');
      const cleanTargetKey = `${targetFolder}/${filename}`.replace(/\/+/g, '/');

      // Copy from staging to target with clean keys
      const copyCommand = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${cleanStagingKey}`,
        Key: cleanTargetKey,
        ACL: 'public-read',
      });

      // Use fresh client for copy operation
      const freshClient = createS3Client();
      await freshClient.send(copyCommand);

      // Delete staging file
      await deleteFromS3(cleanStagingKey);

      committedKeys.push(cleanTargetKey);
      console.log(`✅ Moved ${cleanStagingKey} → ${cleanTargetKey}`);
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
  CLOUDFRONT_DOMAIN,
  createS3Client
};
