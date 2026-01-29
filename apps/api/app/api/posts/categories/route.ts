import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postCategoryCreateSchema, postCategoryUpdateSchema } from '@rentalshop/validation';

/**
 * GET /api/posts/categories
 * List all post categories
 */
export const GET = withPermissions(['posts.view'])(async (request, { user, userScope }) => {
  try {
    const categories = await db.postCategories.findAll({ isActive: true });

    return NextResponse.json(
      ResponseBuilder.success('CATEGORIES_FOUND', categories)
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/posts/categories
 * Create post category
 * 
 * Authorization: ADMIN only
 */
export const POST = withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
  try {
    const body = await request.json();

    const parsed = postCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const category = await db.postCategories.create(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_CREATED_SUCCESS', category),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
