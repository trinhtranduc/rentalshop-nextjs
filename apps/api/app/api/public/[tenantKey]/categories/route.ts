import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';

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
  { params }: { params: Promise<{ tenantKey: string }> | { tenantKey: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { tenantKey } = resolvedParams;
  
  try {
    
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

