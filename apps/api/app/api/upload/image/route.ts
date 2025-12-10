import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { ResponseBuilder, compressImageTo1MB } from '@rentalshop/utils';
import { uploadToS3, generateAccessUrl, generateStagingKey, generateFileName, splitKeyIntoParts } from '@rentalshop/utils';
import { VALIDATION } from '@rentalshop/constants';

// Allowed image types - JPG, PNG, and WebP (browser often converts to WebP)
const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
// Allow larger initial upload (5MB), will be compressed to 400KB
const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE;

/**
 * Validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  // Check file type - handle both MIME type and file extension
  const fileTypeLower = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase().trim();
  
  // Check MIME type (handle empty case)
  const isValidMimeType = fileTypeLower ? ALLOWED_TYPES.some(type => 
    fileTypeLower === type.toLowerCase()
  ) : false;
  
  // Check file extension
  const isValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    fileNameLower.endsWith(ext)
  );
  
  // Accept if either MIME type OR extension is valid
  if (!isValidMimeType && !isValidExtension) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')} or extensions: ${ALLOWED_EXTENSIONS.join(',')}. File type: "${file.type}", File name: "${file.name}"`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  // Check if file is too small (likely corrupted)
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'File size is too small, file may be corrupted'
    };
  }

  return { isValid: true };
}



/**
 * POST /api/upload/image
 * Upload image to AWS S3 with smart filename handling
 * 
 * **Request Body (FormData):**
 * - `image`: File - The image file to upload
 * - `originalName` (optional): string - Original filename from frontend for better tracking
 * - `preserveFilename` (optional): boolean - Whether to preserve original filename structure
 * 
 * **Smart Filename Strategy:**
 * 1. **Best Case**: Use `originalName` if provided (frontend sends true filename)
 * 2. **Fallback**: Use `file.name` if not "blob" 
 * 3. **Last Resort**: Generate generic name
 * 
 * **Filename Sanitization:**
 * - Removes special characters (except _ and -)
 * - Limits length to 50 characters
 * - Adds timestamp + random ID for uniqueness
 * - Preserves or standardizes extension based on contentType
 * 
 * **Response includes:**
 * - `originalFileName`: What user sees
 * - `finalFileName`: Actual S3 filename  
 * - `stagingKey`: For cleanup operations
 */
export const POST = withAnyAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const originalName = formData.get('originalName') as string | null;
    const preserveFilename = formData.get('preserveFilename') === 'true';
    
    if (!file) {
      return NextResponse.json(
        ResponseBuilder.error('NO_IMAGE_FILE'),
        { status: 400 }
      );
    }

    // Debug: Log file type to understand what browser is sending
    console.log('🔍 File validation debug:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      allowedTypes: ALLOWED_TYPES
    });

    // Validate image
    const validation = validateImage(file);
    if (!validation.isValid) {
      console.log('❌ Validation failed:', {
        fileType: file.type,
        allowedTypes: ALLOWED_TYPES,
        error: validation.error
      });
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Convert file to buffer and compress
    const bytes = await file.arrayBuffer();
    const buffer = await compressImageTo1MB(Buffer.from(new Uint8Array(bytes)));
    
    // Final check - reject if still too large after compression
    const MAX_SIZE = VALIDATION.IMAGE_SIZES.PRODUCT;
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        ResponseBuilder.error('IMAGE_TOO_LARGE'),
        { status: 400 }
      );
    }

    // Smart filename handling: prioritize originalName, then file.name
    const effectiveFileName = (() => {
      // Case 1: Frontend provides originalName (best case)
      if (originalName && originalName.trim()) {
        return originalName.trim();
      }
      
      // Case 2: File has proper name (not blob)
      if (file.name && file.name !== 'blob' && file.name.trim()) {
        return file.name.trim();
      }
      
      // Case 3: Fallback to generic name
      return null;
    })();

    // Generate filename and staging key using new structure
    const fileName = effectiveFileName
      ? generateFileName(effectiveFileName.replace(/\.[^/.]+$/, ''))
      : generateFileName('upload-image');
    const stagingKey = generateStagingKey(fileName);
    const { folder, fileName: finalFileName } = splitKeyIntoParts(stagingKey);

    console.log('📸 Uploading image:', {
      originalFile: file.name,
      providedOriginalName: originalName,
      effectiveFileName: effectiveFileName,
      finalFileName: finalFileName,
      stagingKey: stagingKey,
      preserveFilename,
      contentType: file.type,
      size: file.size
    });

    // Upload compressed image to AWS S3 staging folder with new structure
    const result = await uploadToS3(buffer, {
      folder,
      fileName: finalFileName,
      contentType: 'image/jpeg', // Always JPEG after compression
      preserveOriginalName: false // Always use generated filename for consistency
    });
    console.log('✅ Image uploaded to AWS S3');
    console.log('📊 Upload result:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      // Prefer CloudFront URL if configured (faster, cleaner, CDN caching)
      // result.data.url already contains CloudFront URL if CLOUDFRONT_DOMAIN is set
      const isStaging = result.data.key.startsWith('staging/');
      let accessUrl: string;
      
      // Check if CloudFront is configured via environment variable
      const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      
      // Use CloudFront URL if configured (check both result.data.cdnUrl and result.data.url)
      // CloudFront provides better performance, CDN caching, and cleaner URLs
      if (cloudfrontDomain && (result.data.cdnUrl || (result.data.url && !result.data.url.includes('amazonaws.com')))) {
        // CloudFront URL is available - use it directly
        accessUrl = result.data.cdnUrl || result.data.url;
        console.log('✅ Using CloudFront URL:', accessUrl);
      } else if (cloudfrontDomain) {
        // CloudFront is configured but URL not in result - generate it
        accessUrl = `https://${cloudfrontDomain}/${result.data.key}`;
        console.log('✅ Generated CloudFront URL:', accessUrl);
      } else {
        // CloudFront not configured - generate presigned URL as fallback
        const presignedUrl = await generateAccessUrl(result.data.key, 86400, false); // 24 hours
        accessUrl = presignedUrl || result.data.s3Url || result.data.url;
        console.log('⚠️ CloudFront not configured, using presigned URL');
      }
      
      // Extract filename from key for better tracking
      const keyParts = result.data.key.split('/');
      const finalFileName = keyParts[keyParts.length - 1];
      
      // All images are now stored as JPG for consistency
      let format = 'jpg';

      return NextResponse.json({
        success: true,
        data: {
          url: accessUrl,
          publicId: result.data.key,
          stagingKey: result.data.key, // Original staging key for cleanup if needed
          isStaging: isStaging,
          originalFileName: effectiveFileName || file.name,
          finalFileName: finalFileName,
          width: 0,
          height: 0,
          format: format, // Actual format based on content type
          size: file.size,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        code: 'IMAGE_UPLOADED_SUCCESS',
        message: 'Image uploaded successfully to AWS S3 staging folder'
      });
    } else {
      console.error('❌ Upload failed:', result);
      throw new Error(result.error || 'Failed to upload to S3');
    }

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      ResponseBuilder.error('UPLOAD_IMAGE_FAILED'),
      { status: 500 }
    );
  }
});
