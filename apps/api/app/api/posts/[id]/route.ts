import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { postUpdateSchema } from '@rentalshop/validation';
import { API, USER_ROLE } from '@rentalshop/constants';
import { buildCorsHeaders } from '@/lib/cors';

// Dynamic import for server-only logger
let logInfo: any, logWarn: any;
if (typeof window === 'undefined') {
  const loggerModule = require('@rentalshop/utils/server');
  logInfo = loggerModule.logInfo;
  logWarn = loggerModule.logWarn;
}

/**
 * OPTIONS /api/posts/[id]
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/posts/[id]
 * Get post by ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Custom logs: Business warnings (not found, access denied)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withApiLogging(
    withPermissions(['posts.view'])(async (request, { user, userScope }) => {
      const corsHeaders = buildCorsHeaders(request);
      
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400, headers: corsHeaders }
        );
      }

      const postId = parseInt(id);
      const post = await db.posts.findById(postId);

      if (!post) {
        logWarn('Post not found', { postId, userId: user.id });
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND, headers: corsHeaders }
        );
      }

      // Only ADMIN can see draft posts
      if (post.status !== 'PUBLISHED' && user.role !== USER_ROLE.ADMIN) {
        logWarn('Access denied to draft post', { postId, userId: user.id, userRole: user.role });
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('POST_RETRIEVED_SUCCESS', post),
        { headers: corsHeaders }
      );
    })
  )(request);
}

/**
 * PUT /api/posts/[id]
 * Update post
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Custom log: Business event (post updated)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withApiLogging(
    withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
      const corsHeaders = buildCorsHeaders(request);
      
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400, headers: corsHeaders }
        );
      }

      const postId = parseInt(id);
      const body = await request.json();

      const parsed = postUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400, headers: corsHeaders }
        );
      }

      const post = await db.posts.update(postId, parsed.data);

      // Custom business log for important event
      logInfo('Post updated successfully', {
        postId: post.id,
        title: post.title,
        userId: user.id,
        status: post.status,
      });

      return NextResponse.json(
        ResponseBuilder.success('POST_UPDATED_SUCCESS', post),
        { headers: corsHeaders }
      );
    })
  )(request);
}

/**
 * DELETE /api/posts/[id]
 * Delete post
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Custom log: Business event (post deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withApiLogging(
    withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
      const corsHeaders = buildCorsHeaders(request);
      
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_POST_ID_FORMAT'),
          { status: 400, headers: corsHeaders }
        );
      }

      const postId = parseInt(id);
      await db.posts.delete(postId);

      // Custom business log for important event
      logInfo('Post deleted successfully', {
        postId,
        userId: user.id,
      });

      return NextResponse.json(
        ResponseBuilder.success('POST_DELETED_SUCCESS'),
        { headers: corsHeaders }
      );
    })
  )(request);
}
