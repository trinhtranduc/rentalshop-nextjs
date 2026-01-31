import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postCreateSchema, postSearchSchema } from '@rentalshop/validation';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/posts
 * List posts with filtering and pagination
 * 
 * Authorization: ADMIN only for management, public for published posts
 */
export const GET = withPermissions(['posts.view'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const parsed = postSearchSchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const filters = parsed.data;
    
    // Only ADMIN can see all posts (including drafts)
    // For public access, filter to published only
    if (user.role !== USER_ROLE.ADMIN) {
      filters.status = 'PUBLISHED';
    }

    const result = await db.posts.search(filters);

    return NextResponse.json(
      ResponseBuilder.success('POSTS_FOUND', result)
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/posts
 * Create new post
 * 
 * Authorization: ADMIN only
 */
export const POST = withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
  try {
    const body = await request.json();
    
    const parsed = postCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Validate that user.id is a number (for database compatibility)
    if (typeof user.id !== 'number') {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_USER_ID'),
        { status: 400 }
      );
    }

    // Add authorId from current user
    const postData = {
      ...parsed.data,
      authorId: user.id,
    };

    const post = await db.posts.create(postData);

    return NextResponse.json(
      ResponseBuilder.success('POST_CREATED_SUCCESS', post),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating post:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
      name: error?.name,
      stack: error?.stack,
    });
    
    // Handle specific database errors
    if (error?.message?.includes('slug') || error?.code === 'P2002') {
      const target = error?.meta?.target;
      const field = Array.isArray(target) ? target[0] : target;
      if (field === 'slug' || error?.message?.includes('slug')) {
        return NextResponse.json(
          ResponseBuilder.error('POST_SLUG_EXISTS', { message: 'A post with this slug already exists' }),
          { status: 409 }
        );
      }
    }
    
    if (error?.message?.includes('author') || error?.code === 'P2003') {
      const fieldName = error?.meta?.field_name || 'authorId';
      return NextResponse.json(
        ResponseBuilder.error('INVALID_AUTHOR', { 
          message: `Author user not found. Field: ${fieldName}, Value: ${error?.meta?.field_value || user.id}` 
        }),
        { status: 400 }
      );
    }
    
    // Log full error for debugging
    if (error?.code?.startsWith('P')) {
      console.error('Prisma error detected:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
