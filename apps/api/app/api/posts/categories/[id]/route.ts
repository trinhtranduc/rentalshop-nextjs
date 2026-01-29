import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postCategoryUpdateSchema } from '@rentalshop/validation';
import { API } from '@rentalshop/constants';

/**
 * GET /api/posts/categories/[id]
 * Get category by ID
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
          ResponseBuilder.error('INVALID_CATEGORY_ID_FORMAT'),
          { status: 400 }
        );
      }

      const categoryId = parseInt(id);
      const category = await db.postCategories.findById(categoryId);

      if (!category) {
        return NextResponse.json(
          ResponseBuilder.error('CATEGORY_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_RETRIEVED_SUCCESS', category)
      );
    } catch (error) {
      console.error('Error fetching category:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/posts/categories/[id]
 * Update category
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
          ResponseBuilder.error('INVALID_CATEGORY_ID_FORMAT'),
          { status: 400 }
        );
      }

      const categoryId = parseInt(id);
      const body = await request.json();

      const parsed = postCategoryUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const category = await db.postCategories.update(categoryId, parsed.data);

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_UPDATED_SUCCESS', category)
      );
    } catch (error) {
      console.error('Error updating category:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/posts/categories/[id]
 * Delete category
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
          ResponseBuilder.error('INVALID_CATEGORY_ID_FORMAT'),
          { status: 400 }
        );
      }

      const categoryId = parseInt(id);
      await db.postCategories.delete(categoryId);

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_DELETED_SUCCESS')
      );
    } catch (error) {
      console.error('Error deleting category:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
