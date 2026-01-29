import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postTagUpdateSchema } from '@rentalshop/validation';
import { API } from '@rentalshop/constants';

/**
 * GET /api/posts/tags/[id]
 * Get tag by ID
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
          ResponseBuilder.error('INVALID_TAG_ID_FORMAT'),
          { status: 400 }
        );
      }

      const tagId = parseInt(id);
      const tag = await db.postTags.findById(tagId);

      if (!tag) {
        return NextResponse.json(
          ResponseBuilder.error('TAG_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('TAG_RETRIEVED_SUCCESS', tag)
      );
    } catch (error) {
      console.error('Error fetching tag:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/posts/tags/[id]
 * Update tag
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
          ResponseBuilder.error('INVALID_TAG_ID_FORMAT'),
          { status: 400 }
        );
      }

      const tagId = parseInt(id);
      const body = await request.json();

      const parsed = postTagUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const tag = await db.postTags.update(tagId, parsed.data);

      return NextResponse.json(
        ResponseBuilder.success('TAG_UPDATED_SUCCESS', tag)
      );
    } catch (error) {
      console.error('Error updating tag:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/posts/tags/[id]
 * Delete tag
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
          ResponseBuilder.error('INVALID_TAG_ID_FORMAT'),
          { status: 400 }
        );
      }

      const tagId = parseInt(id);
      await db.postTags.delete(tagId);

      return NextResponse.json(
        ResponseBuilder.success('TAG_DELETED_SUCCESS')
      );
    } catch (error) {
      console.error('Error deleting tag:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
