/**
 * S3 Folder Structure Helper
 * 
 * Provides utilities for generating S3 folder paths following the recommended structure:
 * - Environment-based separation (dev, staging, prod)
 * - Image type classification (products, avatars, documents, temp)
 * - Multi-tenant support (merchant/outlet isolation)
 */

// ============================================================================
// TYPES
// ============================================================================

export type S3Environment = 'dev' | 'staging' | 'prod';
export type ImageType = 'product' | 'avatar' | 'document' | 'temp' | 'staging';
export type AvatarSubType = 'user' | 'merchant' | 'outlet';
export type DocumentSubType = 'contract' | 'invoice' | 'report' | 'other';

export interface FolderPathOptions {
  environment?: S3Environment;
  imageType: ImageType;
  merchantId?: number;
  outletId?: number;
  avatarSubType?: AvatarSubType;
  documentSubType?: DocumentSubType;
}

export interface GenerateKeyOptions extends FolderPathOptions {
  fileName: string;
  preserveExtension?: boolean;
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detect current environment from NODE_ENV
 * @returns Environment string ('dev', 'staging', or 'prod')
 */
export function getS3Environment(): S3Environment {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  
  if (env === 'production' || env === 'prod') {
    return 'prod';
  }
  
  if (env === 'staging' || env === 'staging') {
    return 'staging';
  }
  
  return 'dev';
}

/**
 * Get environment prefix for folder path
 * @param environment Optional environment override
 * @returns Environment folder path (e.g., 'env/dev')
 */
export function getEnvironmentPrefix(environment?: S3Environment): string {
  const env = environment || getS3Environment();
  return `env/${env}`;
}

// ============================================================================
// FOLDER PATH GENERATION
// ============================================================================

/**
 * Generate folder path based on options
 * 
 * @param options Folder path configuration
 * @returns Full folder path (e.g., 'env/prod/products/merchant-1/outlet-2')
 * 
 * @example
 * // Product image with merchant and outlet
 * generateFolderPath({
 *   imageType: 'product',
 *   merchantId: 1,
 *   outletId: 2
 * })
 * // Returns: 'env/prod/products/merchant-1/outlet-2'
 * 
 * @example
 * // User avatar
 * generateFolderPath({
 *   imageType: 'avatar',
 *   avatarSubType: 'user'
 * })
 * // Returns: 'env/prod/avatars/users'
 * 
 * @example
 * // Staging folder
 * generateFolderPath({
 *   imageType: 'staging'
 * })
 * // Returns: 'env/prod/staging'
 */
export function generateFolderPath(options: FolderPathOptions): string {
  const basePath = getEnvironmentPrefix(options.environment);
  
  switch (options.imageType) {
    case 'product': {
      if (options.merchantId && options.outletId) {
        return `${basePath}/products/merchant-${options.merchantId}/outlet-${options.outletId}`;
      } else if (options.merchantId) {
        return `${basePath}/products/merchant-${options.merchantId}`;
      }
      return `${basePath}/products`;
    }
    
    case 'avatar': {
      const avatarSubType = options.avatarSubType || 'users';
      return `${basePath}/avatars/${avatarSubType}`;
    }
    
    case 'document': {
      const docSubType = options.documentSubType || 'other';
      return `${basePath}/documents/${docSubType}`;
    }
    
    case 'temp': {
      return `${basePath}/temp`;
    }
    
    case 'staging': {
      return `${basePath}/staging`;
    }
    
    default: {
      return `${basePath}/uploads`;
    }
  }
}

// ============================================================================
// FILE KEY GENERATION
// ============================================================================

/**
 * Generate full S3 key (folder path + filename)
 * 
 * @param options Key generation options
 * @returns Full S3 key (e.g., 'env/prod/products/merchant-1/product-image-1234567890-abc123.jpg')
 * 
 * @example
 * generateS3Key({
 *   imageType: 'product',
 *   merchantId: 1,
 *   outletId: 2,
 *   fileName: 'product-image-1234567890-abc123.jpg'
 * })
 * // Returns: 'env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg'
 */
export function generateS3Key(options: GenerateKeyOptions): string {
  const folderPath = generateFolderPath(options);
  const fileName = options.fileName.replace(/^\./, '').replace(/\/+/g, '/');
  return `${folderPath}/${fileName}`.replace(/\/+/g, '/');
}

/**
 * Generate filename with timestamp and random ID
 * 
 * @param prefix Filename prefix (e.g., 'product-image', 'avatar')
 * @param extension File extension (default: 'jpg')
 * @returns Generated filename (e.g., 'product-image-1234567890-abc123def456.jpg')
 */
export function generateFileName(prefix: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedPrefix = prefix
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  return `${sanitizedPrefix}-${timestamp}-${randomId}.${extension}`;
}

// ============================================================================
// KEY PARSING & EXTRACTION
// ============================================================================

/**
 * Parse S3 key to extract information
 * 
 * @param key S3 key to parse
 * @returns Parsed key information
 * 
 * @example
 * parseS3Key('env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg')
 * // Returns: {
 * //   environment: 'prod',
 * //   imageType: 'product',
 * //   merchantId: 1,
 * //   outletId: 2,
 * //   fileName: 'product-image-1234567890-abc123.jpg'
 * // }
 */
export function parseS3Key(key: string): {
  environment: S3Environment | null;
  imageType: ImageType | null;
  merchantId: number | null;
  outletId: number | null;
  avatarSubType: AvatarSubType | null;
  documentSubType: DocumentSubType | null;
  fileName: string;
  folderPath: string;
} {
  const parts = key.split('/').filter(Boolean);
  
  let environment: S3Environment | null = null;
  let imageType: ImageType | null = null;
  let merchantId: number | null = null;
  let outletId: number | null = null;
  let avatarSubType: AvatarSubType | null = null;
  let documentSubType: DocumentSubType | null = null;
  
  // Check for environment prefix
  if (parts[0] === 'env' && parts[1]) {
    environment = parts[1] as S3Environment;
  }
  
  // Find image type
  const imageTypeIndex = parts.indexOf('products') !== -1 ? parts.indexOf('products') :
                         parts.indexOf('avatars') !== -1 ? parts.indexOf('avatars') :
                         parts.indexOf('documents') !== -1 ? parts.indexOf('documents') :
                         parts.indexOf('temp') !== -1 ? parts.indexOf('temp') :
                         parts.indexOf('staging') !== -1 ? parts.indexOf('staging') : -1;
  
  if (imageTypeIndex !== -1) {
    const typeStr = parts[imageTypeIndex];
    imageType = typeStr === 'products' ? 'product' :
                typeStr === 'avatars' ? 'avatar' :
                typeStr === 'documents' ? 'document' :
                typeStr === 'temp' ? 'temp' :
                typeStr === 'staging' ? 'staging' : null;
    
    // Parse merchant/outlet for products
    if (imageType === 'product' && imageTypeIndex + 1 < parts.length) {
      const merchantPart = parts[imageTypeIndex + 1];
      const merchantMatch = merchantPart?.match(/^merchant-(\d+)$/);
      if (merchantMatch) {
        merchantId = parseInt(merchantMatch[1], 10);
        
        // Check for outlet
        if (imageTypeIndex + 2 < parts.length) {
          const outletPart = parts[imageTypeIndex + 2];
          const outletMatch = outletPart?.match(/^outlet-(\d+)$/);
          if (outletMatch) {
            outletId = parseInt(outletMatch[1], 10);
          }
        }
      }
    }
    
    // Parse avatar sub type
    if (imageType === 'avatar' && imageTypeIndex + 1 < parts.length) {
      const subType = parts[imageTypeIndex + 1];
      if (['user', 'merchant', 'outlet'].includes(subType)) {
        avatarSubType = subType as AvatarSubType;
      }
    }
    
    // Parse document sub type
    if (imageType === 'document' && imageTypeIndex + 1 < parts.length) {
      const subType = parts[imageTypeIndex + 1];
      if (['contract', 'invoice', 'report', 'other'].includes(subType)) {
        documentSubType = subType as DocumentSubType;
      }
    }
  }
  
  const fileName = parts[parts.length - 1] || '';
  const folderPath = parts.slice(0, -1).join('/');
  
  return {
    environment,
    imageType,
    merchantId,
    outletId,
    avatarSubType,
    documentSubType,
    fileName,
    folderPath
  };
}

/**
 * Extract merchant ID from S3 key
 * @param key S3 key
 * @returns Merchant ID or null
 */
export function extractMerchantIdFromKey(key: string): number | null {
  const parsed = parseS3Key(key);
  return parsed.merchantId;
}

/**
 * Extract outlet ID from S3 key
 * @param key S3 key
 * @returns Outlet ID or null
 */
export function extractOutletIdFromKey(key: string): number | null {
  const parsed = parseS3Key(key);
  return parsed.outletId;
}

/**
 * Check if key is from staging folder
 * @param key S3 key
 * @returns True if key is in staging folder
 */
export function isStagingKey(key: string): boolean {
  return key.includes('/staging/') || key.startsWith('staging/');
}

/**
 * Convert staging key to production key
 * @param stagingKey Staging key
 * @param targetFolder Target folder path (e.g., 'products/merchant-1/outlet-2')
 * @returns Production key
 */
export function convertStagingToProductionKey(
  stagingKey: string,
  targetFolder: string
): string {
  const fileName = stagingKey.split('/').pop() || '';
  return `${targetFolder}/${fileName}`.replace(/\/+/g, '/');
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate product image key
 */
export function generateProductImageKey(
  merchantId: number,
  fileName: string,
  outletId?: number,
  environment?: S3Environment
): string {
  return generateS3Key({
    environment,
    imageType: 'product',
    merchantId,
    outletId,
    fileName
  });
}

/**
 * Generate avatar key
 */
export function generateAvatarKey(
  subType: AvatarSubType,
  fileName: string,
  environment?: S3Environment
): string {
  return generateS3Key({
    environment,
    imageType: 'avatar',
    avatarSubType: subType,
    fileName
  });
}

/**
 * Generate user avatar key
 */
export function generateUserAvatarKey(
  fileName: string,
  environment?: S3Environment
): string {
  return generateAvatarKey('user', fileName, environment);
}

/**
 * Generate merchant avatar key
 */
export function generateMerchantAvatarKey(
  fileName: string,
  environment?: S3Environment
): string {
  return generateAvatarKey('merchant', fileName, environment);
}

/**
 * Generate outlet avatar key
 */
export function generateOutletAvatarKey(
  fileName: string,
  environment?: S3Environment
): string {
  return generateAvatarKey('outlet', fileName, environment);
}

/**
 * Generate staging key
 */
export function generateStagingKey(
  fileName: string,
  environment?: S3Environment
): string {
  return generateS3Key({
    environment,
    imageType: 'staging',
    fileName
  });
}

/**
 * Generate document key
 */
export function generateDocumentKey(
  subType: DocumentSubType,
  fileName: string,
  environment?: S3Environment
): string {
  return generateS3Key({
    environment,
    imageType: 'document',
    documentSubType: subType,
    fileName
  });
}

// ============================================================================
// URL GENERATION
// ============================================================================

/**
 * Convert S3 key to CloudFront URL
 * @param key S3 key
 * @param cloudfrontDomain CloudFront domain
 * @returns CloudFront URL
 */
export function keyToCloudFrontUrl(key: string, cloudfrontDomain: string): string {
  return `https://${cloudfrontDomain}/${key}`;
}

/**
 * Convert S3 key to S3 URL
 * @param key S3 key
 * @param bucketName S3 bucket name
 * @param region AWS region
 * @returns S3 URL
 */
export function keyToS3Url(key: string, bucketName: string, region: string): string {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate S3 key format
 * @param key S3 key to validate
 * @returns True if key is valid
 */
export function isValidS3Key(key: string): boolean {
  // Basic validation
  if (!key || key.length === 0) return false;
  if (key.includes('//')) return false; // No double slashes
  if (key.startsWith('/')) return false; // No leading slash
  if (key.endsWith('/')) return false; // No trailing slash
  if (key.includes('..')) return false; // No path traversal
  
  return true;
}

/**
 * Sanitize filename for S3
 * @param filename Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Remove multiple dashes
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .substring(0, 255); // Limit length
}

/**
 * Split S3 key into folder and filename
 * Useful when working with uploadToS3 that takes folder and fileName separately
 * 
 * @param key Full S3 key
 * @returns Object with folder path and filename
 * 
 * @example
 * splitKeyIntoParts('env/prod/products/merchant-1/image.jpg')
 * // Returns: { folder: 'env/prod/products/merchant-1', fileName: 'image.jpg' }
 */
export function splitKeyIntoParts(key: string): { folder: string; fileName: string } {
  const parts = key.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  const folder = parts.slice(0, -1).join('/');
  
  return {
    folder: folder || '', // Return empty string if no folder
    fileName
  };
}

