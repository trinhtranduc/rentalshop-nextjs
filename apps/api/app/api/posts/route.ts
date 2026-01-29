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
  } catch (error) {
    console.error('Error creating post:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
