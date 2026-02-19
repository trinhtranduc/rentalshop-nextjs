import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { isAllowedOrigin, getAllowedOrigins } from '../../../../lib/cors';

/**
 * Build CORS headers for response
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isAllowed = isAllowedOrigin(origin);
  const allowedOrigins = getAllowedOrigins();

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * OPTIONS /api/posts/tags/public
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
 * GET /api/posts/tags/public
 * Get all post tags for public display (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let tags;
    if (search) {
      tags = await db.postTags.search(search);
    } else {
      tags = await db.postTags.findAll();
    }

    return NextResponse.json(
      ResponseBuilder.success('TAGS_FOUND', tags),
      {
        headers: buildCorsHeaders(request)
      }
    );
  } catch (error) {
    console.error('Error fetching public tags:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: buildCorsHeaders(request)
    });
  }
}
