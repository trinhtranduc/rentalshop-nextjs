import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

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
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const allowOrigin = isAllowedOrigin ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * OPTIONS /api/public/[tenantKey]/categories
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * GET /api/public/[tenantKey]/categories
 * Get categories by tenant key (public endpoint, no authentication required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantKey: string } }
) {
  try {
    const { tenantKey } = params;
    
    // Validate tenantKey format (alphanumeric + hyphen)
    if (!tenantKey || !/^[a-z0-9\-]+$/i.test(tenantKey)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_TENANT_KEY'),
        { 
          status: 400,
          headers: buildCorsHeaders(request)
        }
      );
    }

    // Find merchant by tenantKey
    const merchant = await db.merchants.findByTenantKey(tenantKey);
    
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { 
          status: 404,
          headers: buildCorsHeaders(request)
        }
      );
    }

    // Check if merchant is active
    if (!merchant.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_INACTIVE'),
        { 
          status: 403,
          headers: buildCorsHeaders(request)
        }
      );
    }

    // Get categories for this merchant
    const categories = await db.categories.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(
      ResponseBuilder.success('CATEGORIES_FETCHED', {
        categories: categories || []
      }),
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

