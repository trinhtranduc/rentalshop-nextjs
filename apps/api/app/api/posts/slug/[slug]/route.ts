import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * Get allowed CORS origins
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  return [
    ...corsOrigins,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://anyrent.shop',
    'https://www.anyrent.shop',
    'https://api.anyrent.shop',
    'https://admin.anyrent.shop',
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop',
    'https://dev-admin.anyrent.shop'
  ];
}

/**
 * Build CORS headers for response
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * OPTIONS /api/posts/slug/[slug]
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: buildCorsHeaders(request),
    },
  );
}

/**
 * GET /api/posts/slug/[slug]
 * Get post by slug (public endpoint for client app)
 * Only returns published posts
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { slug } = resolvedParams;
  
  return withApiLogging(async (request: NextRequest) => {
    try {
      const post = await db.posts.findBySlug(slug);

      if (!post) {
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { 
            status: API.STATUS.NOT_FOUND,
            headers: buildCorsHeaders(request)
          }
        );
      }

      // Only return published posts for public access
      if (post.status !== 'PUBLISHED') {
        return NextResponse.json(
          ResponseBuilder.error('POST_NOT_FOUND'),
          { 
            status: API.STATUS.NOT_FOUND,
            headers: buildCorsHeaders(request)
          }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('POST_RETRIEVED_SUCCESS', post),
        {
          headers: buildCorsHeaders(request)
        }
      );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { 
        status: statusCode,
        headers: buildCorsHeaders(request)
      });
    }
  })(request);
}
