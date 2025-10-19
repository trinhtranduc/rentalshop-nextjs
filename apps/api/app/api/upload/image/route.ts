import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder } from '@rentalshop/utils';
import { uploadToS3 } from '@rentalshop/utils';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
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
 * Upload image to AWS S3
 * 
 * **AWS S3 Integration:**
 * - Scalable cloud storage
 * - CDN integration with CloudFront
 * - Secure file uploads with validation
 * - Optimized for production use
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        ResponseBuilder.error('NO_IMAGE_FILE'),
        { status: 400 }
      );
    }

    // Validate image
    const validation = validateImage(file);
    if (!validation.isValid) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', { details: validation.error }),
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to AWS S3
    const result = await uploadToS3(buffer, {
      folder: 'product',
      fileName: file.name,
      contentType: file.type
    });
    console.log('✅ Image uploaded to AWS S3');
    console.log('📊 Upload result:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      const responseData = {
        success: true,
        data: {
          url: result.data.cdnUrl || result.data.url, // Use CDN URL if available
          publicId: result.data.key,
          width: 0,
          height: 0,
          format: file.type.split('/')[1] || 'jpg',
          size: file.size
        },
        code: 'IMAGE_UPLOADED_SUCCESS', 
        message: 'Image uploaded successfully to AWS S3'
      };
      
      console.log('✅ Upload successful, returning:', {
        url: responseData.data.url,
        key: responseData.data.publicId,
        bucket: result.data.bucket
      });
      
      return NextResponse.json(responseData);
    } else {
      console.error('❌ Upload failed:', result);
      throw new Error(result.error || 'Failed to upload to S3');
    }

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { 
        success: false, 
        code: 'UPLOAD_IMAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to upload image',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
