import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ResponseBuilder } from '@rentalshop/utils';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_FOLDER = '/app/public/uploads'; // Railway Volume mount point

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
 * Upload to Railway Volume (simplified)
 */
async function uploadToRailwayVolume(file: File, buffer: Buffer): Promise<any> {
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

    // Write file to Railway Volume
    await writeFile(filepath, buffer);

    // Return public URL (served by Next.js static files)
    const publicUrl = `/uploads/${filename}`;

    return {
      secure_url: publicUrl,
      public_id: filename,
      width: 0, // Will be determined by client if needed
      height: 0,
      format: extension,
      bytes: file.size,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Railway Volume upload error:', error);
    throw new Error('Failed to save file to Railway Volume');
  }
}

/**
 * Convert file to base64 (emergency fallback)
 */
function fileToBase64(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * POST /api/upload/image
 * Upload image to Railway Volume with base64 fallback
 * 
 * **Simple & Reliable Approach:**
 * - Railway Volume provides persistent storage (100GB free)
 * - No external API dependencies or credit limits
 * - Base64 fallback for emergency cases
 * - Client-side optimization before upload
 * - Validation prevents malicious uploads
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
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
    let uploadMethod: 'railway' | 'base64' = 'railway';

    try {
      // Upload to Railway Volume (primary method)
      result = await uploadToRailwayVolume(file, buffer);
      uploadMethod = 'railway';
      console.log('✅ Image uploaded to Railway Volume');
    } catch (railwayError) {
      console.error('Railway Volume upload failed:', railwayError);
      
      // Fallback to base64 (if allowed)
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
        throw new Error('Railway Volume upload failed and base64 fallback is disabled');
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
      code: 'IMAGE_UPLOADED_SUCCESS', 
      message: `Image uploaded successfully via ${uploadMethod}`
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
