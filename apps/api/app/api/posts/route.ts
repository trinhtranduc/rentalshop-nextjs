import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { postCreateSchema, postSearchSchema } from '@rentalshop/validation';
import { API, USER_ROLE } from '@rentalshop/constants';
import { buildCorsHeaders } from '@/lib/cors';

// Dynamic import for server-only logger
let logInfo: any;
if (typeof window === 'undefined') {
  const loggerModule = require('@rentalshop/utils/server');
  logInfo = loggerModule.logInfo;
}

/**
 * OPTIONS /api/posts
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/posts
 * List posts with filtering and pagination
 * 
 * Authorization: ADMIN only for management, public for published posts
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user, userScope }) => {
    const { searchParams } = new URL(request.url);
    
    const parsed = postSearchSchema.safeParse(Object.fromEntries(searchParams.entries()));
    const corsHeaders = buildCorsHeaders(request);
    
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400, headers: corsHeaders }
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
      ResponseBuilder.success('POSTS_FOUND', result),
      { headers: corsHeaders }
    );
  })
);

/**
 * POST /api/posts
 * Create new post
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Custom log: Business event (post created)
 */
export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
    const body = await request.json();
    const corsHeaders = buildCorsHeaders(request);
    
    const parsed = postCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400, headers: corsHeaders }
      );
    }

    // Add authorId from current user
    const postData = {
      ...parsed.data,
      authorId: user.id,
    };

    const post = await db.posts.create(postData);

    // Custom business log for important event
    logInfo('Post created successfully', {
      postId: post.id,
      title: post.title,
      authorId: user.id,
      status: post.status,
      slug: post.slug,
    });

    return NextResponse.json(
      ResponseBuilder.success('POST_CREATED_SUCCESS', post),
      { status: 201, headers: corsHeaders }
    );
  })
);
