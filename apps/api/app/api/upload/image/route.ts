import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { v2 as cloudinary } from 'cloudinary';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ResponseBuilder } from '@rentalshop/utils';

// Configure Cloudinary
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_FOLDER = process.env.UPLOAD_PATH_LOCAL || './public/uploads';

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
 * Upload to Cloudinary
 */
async function uploadToCloudinary(buffer: Buffer, folder: string = 'rentalshop/products') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder,
        transformation: [
          { width: 1200, height: 900, crop: 'limit' }, // Max dimensions for web
          { quality: 'auto:good' }, // Auto optimize quality (good balance)
          { fetch_format: 'auto' } // Auto format (webp, avif, etc.)
        ],
        // Generate multiple sizes for responsive images
        eager: [
          { width: 400, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto:good' },
          { width: 800, height: 600, crop: 'limit', quality: 'auto:good' }
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}

/**
 * Upload to local filesystem (fallback)
 */
async function uploadToLocal(file: File, buffer: Buffer): Promise<any> {
  try {
    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_FOLDER)) {
      await mkdir(UPLOAD_FOLDER, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filepath = join(UPLOAD_FOLDER, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return local URL (will be served by Next.js public folder)
    const publicUrl = `/uploads/${filename}`;

    return {
      secure_url: publicUrl,
      public_id: filename,
      width: 0, // Unknown for local storage
      height: 0,
      format: extension,
      bytes: file.size,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Local upload error:', error);
    throw new Error('Failed to save file locally');
  }
}

/**
 * Convert file to base64 (ultimate fallback)
 */
function fileToBase64(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * POST /api/upload/image
 * Upload image to Cloudinary with fallback to local storage
 * 
 * **Why this approach:**
 * - Cloudinary provides automatic image optimization, CDN delivery, and transformations
 * - Local storage fallback ensures the system works even without Cloudinary
 * - Base64 fallback as ultimate solution for development/testing
 * - Multi-format support for different image types (JPEG, PNG, WebP, etc.)
 * - Validation prevents malicious uploads and ensures quality
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const folder = (formData.get('folder') as string) || 'rentalshop/products';
    const useBase64Fallback = formData.get('useBase64') === 'true';
    
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

    let result: any;
    let uploadMethod: 'cloudinary' | 'local' | 'base64' = 'cloudinary';

    // Try Cloudinary first (if configured)
    if (isCloudinaryConfigured()) {
      try {
        result = await uploadToCloudinary(buffer, folder);
        uploadMethod = 'cloudinary';
        console.log('✅ Image uploaded to Cloudinary');
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
        
        // Fallback to local storage
        try {
          result = await uploadToLocal(file, buffer);
          uploadMethod = 'local';
          console.log('✅ Image uploaded to local storage');
        } catch (localError) {
          console.error('Local upload failed:', localError);
          
          // Ultimate fallback to base64 (if allowed)
          if (useBase64Fallback) {
            const base64Url = fileToBase64(buffer, file.type);
            result = {
              secure_url: base64Url,
              public_id: `base64-${Date.now()}`,
              width: 0,
              height: 0,
              format: file.type.split('/')[1],
              bytes: file.size
            };
            uploadMethod = 'base64';
            console.log('⚠️ Using base64 fallback');
          } else {
            throw new Error('All upload methods failed');
          }
        }
      }
    } else {
      // No Cloudinary configured, use local storage
      console.log('⚠️ Cloudinary not configured, using local storage');
      try {
        result = await uploadToLocal(file, buffer);
        uploadMethod = 'local';
      } catch (localError) {
        console.error('Local upload failed:', localError);
        
        // Ultimate fallback to base64 (if allowed)
        if (useBase64Fallback) {
          const base64Url = fileToBase64(buffer, file.type);
          result = {
            secure_url: base64Url,
            public_id: `base64-${Date.now()}`,
            width: 0,
            height: 0,
            format: file.type.split('/')[1],
            bytes: file.size
          };
          uploadMethod = 'base64';
          console.log('⚠️ Using base64 fallback');
        } else {
          throw new Error('Upload failed and base64 fallback is disabled');
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width || 0,
        height: result.height || 0,
        format: result.format,
        size: result.bytes || file.size,
        uploadMethod // Include upload method in response for debugging
      },
      code: 'IMAGE_UPLOADED_SUCCESS', message: `Image uploaded successfully via ${uploadMethod}`
    });

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
