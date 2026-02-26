import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { isAllowedOrigin, getAllowedOrigins } from '@rentalshop/utils/server';

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
 * OPTIONS /api/posts/categories/public
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
 * GET /api/posts/categories/public
 * Get all active post categories for public display (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await db.postCategories.findAll({ isActive: true });

    return NextResponse.json(
      ResponseBuilder.success('CATEGORIES_FOUND', categories),
      {
        headers: buildCorsHeaders(request)
      }
    );
  } catch (error) {
    console.error('Error fetching public categories:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: buildCorsHeaders(request)
    });
  }
}
