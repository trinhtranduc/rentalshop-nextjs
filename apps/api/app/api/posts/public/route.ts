import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postSearchSchema } from '@rentalshop/validation';
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
 * OPTIONS /api/posts/public
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
 * GET /api/posts/public
 * Get published posts for public display (no authentication required)
 * Only returns PUBLISHED posts
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
    const { searchParams } = new URL(request.url);
    
    // Parse search params with defaults for public access
    const parsed = postSearchSchema.safeParse({
      ...Object.fromEntries(searchParams.entries()),
      status: 'PUBLISHED', // Force published only for public access
    });

    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { 
          status: 400,
          headers: buildCorsHeaders(request)
        }
      );
    }

    const filters = {
      ...parsed.data,
      status: 'PUBLISHED' as const, // Always published for public
    };

    const result = await db.posts.search(filters);

    return NextResponse.json(
      ResponseBuilder.success('POSTS_FOUND', result),
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
