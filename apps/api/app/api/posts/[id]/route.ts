import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postUpdateSchema } from '@rentalshop/validation';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/posts/[id]
 * Get post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['posts.view'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400 }
        );
      }

      const postId = parseInt(id);
      const post = await db.posts.findById(postId);

      if (!post) {
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Only ADMIN can see draft posts
      if (post.status !== 'PUBLISHED' && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('POST_RETRIEVED_SUCCESS', post)
      );
    } catch (error) {
      console.error('Error fetching post:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/posts/[id]
 * Update post
 * 
 * Authorization: ADMIN only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400 }
        );
      }

      const postId = parseInt(id);
      const body = await request.json();

      const parsed = postUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const post = await db.posts.update(postId, parsed.data);

      return NextResponse.json(
        ResponseBuilder.success('POST_UPDATED_SUCCESS', post)
      );
    } catch (error) {
      console.error('Error updating post:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/posts/[id]
 * Delete post
 * 
 * Authorization: ADMIN only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400 }
        );
      }

      const postId = parseInt(id);
      await db.posts.delete(postId);

      return NextResponse.json(
        ResponseBuilder.success('POST_DELETED_SUCCESS')
      );
    } catch (error) {
      console.error('Error deleting post:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
