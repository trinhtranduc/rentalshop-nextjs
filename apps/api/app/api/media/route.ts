import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { uploadToS3, deleteFromS3, listS3Files } from '@rentalshop/utils/server';

const MEDIA_FOLDER = 'media/blog';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/media
 * List media files from S3 (blog media folder)
 * 
 * Query params:
 * - prefix: subfolder within media/blog (optional)
 * - continuationToken: for pagination (optional)
 * - limit: max results (default 50)
 */
export const GET = withPermissions(['posts.manage'])(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';
    const continuationToken = searchParams.get('continuationToken') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const fullPrefix = prefix ? `${MEDIA_FOLDER}/${prefix}` : `${MEDIA_FOLDER}/`;

    const result = await listS3Files({
      prefix: fullPrefix,
      maxKeys: limit,
      continuationToken,
    });

    return NextResponse.json(
      ResponseBuilder.success('MEDIA_LIST_SUCCESS', {
        files: result.files,
        total: result.files.length,
        hasMore: result.hasMore,
        nextToken: result.nextToken || null,
      })
    );
  } catch (error) {
    console.error('Error listing media:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/media
 * Upload media file(s) to S3
 * 
 * Accepts multipart/form-data with field "files"
 */
export const POST = withPermissions(['posts.manage'])(async (request, { user }) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('NO_FILES_PROVIDED'),
        { status: 400 }
      );
    }

    const uploaded: Array<{ key: string; url: string; name: string; size: number }> = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type (${file.type}). Allowed: JPG, PNG, WebP, GIF`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 5MB)`);
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(bytes));

      // Generate a clean filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .substring(0, 50);
      const fileName = `${cleanName}-${timestamp}-${randomId}.${ext}`;

      const result = await uploadToS3(buffer, {
        folder: MEDIA_FOLDER,
        fileName,
        contentType: file.type,
        preserveOriginalName: true,
      });

      if (result.success && result.data) {
        uploaded.push({
          key: result.data.key,
          url: result.data.url,
          name: fileName,
          size: file.size,
        });
      } else {
        errors.push(`${file.name}: Upload failed - ${result.error || 'Unknown error'}`);
      }
    }

    return NextResponse.json(
      ResponseBuilder.success('MEDIA_UPLOAD_SUCCESS', {
        uploaded,
        errors: errors.length > 0 ? errors : undefined,
        totalUploaded: uploaded.length,
        totalFailed: errors.length,
      }),
      { status: uploaded.length > 0 ? 201 : 400 }
    );
  } catch (error) {
    console.error('Error uploading media:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * DELETE /api/media
 * Delete media file(s) from S3
 * 
 * Body: { keys: string[] }
 */
export const DELETE = withPermissions(['posts.manage'])(async (request, { user }) => {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('NO_KEYS_PROVIDED'),
        { status: 400 }
      );
    }

    // Security: only allow deleting from media/blog folder
    const invalidKeys = keys.filter((key: string) => !key.startsWith(MEDIA_FOLDER));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_KEYS', { message: 'Can only delete files from media/blog folder' }),
        { status: 403 }
      );
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      const success = await deleteFromS3(key);
      if (success) {
        deleted.push(key);
      } else {
        failed.push(key);
      }
    }

    return NextResponse.json(
      ResponseBuilder.success('MEDIA_DELETE_SUCCESS', {
        deleted,
        failed: failed.length > 0 ? failed : undefined,
        totalDeleted: deleted.length,
        totalFailed: failed.length,
      })
    );
  } catch (error) {
    console.error('Error deleting media:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
