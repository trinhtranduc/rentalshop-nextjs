import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { postTagCreateSchema } from '@rentalshop/validation';
import { buildCorsHeaders } from '@/lib/cors';

/**
 * OPTIONS /api/posts/tags
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/posts/tags
 * List all post tags with optional search
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user, userScope }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const corsHeaders = buildCorsHeaders(request);

    let tags;
    if (search) {
      tags = await db.postTags.search(search);
    } else {
      tags = await db.postTags.findAll();
    }

    return NextResponse.json(
      ResponseBuilder.success('TAGS_FOUND', tags),
      { headers: corsHeaders }
    );
  })
);

/**
 * POST /api/posts/tags
 * Create post tag
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
    const body = await request.json();
    const corsHeaders = buildCorsHeaders(request);

    const parsed = postTagCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400, headers: corsHeaders }
      );
    }

    const tag = await db.postTags.create(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('TAG_CREATED_SUCCESS', tag),
      { status: 201, headers: corsHeaders }
    );
  })
);
