import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { postCategoryCreateSchema, postCategoryUpdateSchema } from '@rentalshop/validation';
import { buildCorsHeaders } from '@/lib/cors';

/**
 * OPTIONS /api/posts/categories
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/posts/categories
 * List all post categories
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user, userScope }) => {
    const categories = await db.postCategories.findAll({ isActive: true });
    const corsHeaders = buildCorsHeaders(request);

    return NextResponse.json(
      ResponseBuilder.success('CATEGORIES_FOUND', categories),
      { headers: corsHeaders }
    );
  })
);

/**
 * POST /api/posts/categories
 * Create post category
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
    const body = await request.json();
    const corsHeaders = buildCorsHeaders(request);

    const parsed = postCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400, headers: corsHeaders }
      );
    }

    const category = await db.postCategories.create(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_CREATED_SUCCESS', category),
      { status: 201, headers: corsHeaders }
    );
  })
);
