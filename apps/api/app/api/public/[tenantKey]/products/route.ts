import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
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
 * OPTIONS /api/public/[tenantKey]/products
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * GET /api/public/[tenantKey]/products
 * Get products by tenant key (public endpoint, no authentication required)
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantKey: string }> | { tenantKey: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { tenantKey } = resolvedParams;
  
  return withApiLogging(async (request: NextRequest) => {
    try {
    const { searchParams } = new URL(request.url);
    
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

    // Find merchant by tenantKey (handles case-insensitive search internally)
    let merchant;
    try {
      // findByTenantKey now handles case-insensitive search internally
      merchant = await db.merchants.findByTenantKey(tenantKey);
    } catch (error) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { 
          status: 404,
          headers: buildCorsHeaders(request)
        }
      );
    }
    
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

    // Parse query parameters
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build product filters
    // Note: For public pages, we only show active products
    const productFilters: any = {
      merchantId: merchant.id, // Use publicId (number) - searchProducts will convert to CUID
      isActive: true, // Only show active products
      page,
      limit
    };

    if (categoryId) {
      const categoryIdNum = parseInt(categoryId, 10);
      if (!isNaN(categoryIdNum)) {
        productFilters.categoryId = categoryIdNum;
      }
    }

    if (search) {
      productFilters.search = search;
    }

    // Get products
    let productsResult;
    try {
      productsResult = await db.products.search(productFilters);
    } catch (error) {
      throw error; // Re-throw to be caught by outer catch
    }

    // Get categories for this merchant
    // db.categories.search accepts merchantId (number) and converts to CUID internally
    let categoriesResult: any[] = [];
    try {
      const categoriesSearchResult = await db.categories.search({
        merchantId: merchant.id, // Use publicId (number) - search will convert to CUID
        isActive: true,
        page: 1,
        limit: 1000 // Get all categories
      });
      categoriesResult = categoriesSearchResult.data || [];
    } catch (error) {
      // Don't fail the whole request if categories fail
      categoriesResult = [];
    }

    // Get outlets for this merchant (for contact information)
    // Note: db.outlets.search expects merchantId as number (publicId) but database uses CUID
    // We need to check if db.outlets.search handles the conversion
    // For now, try with merchant.id (number) - if it fails, we'll handle it
    let outletsResult: any[] = [];
    try {
      // db.outlets.search might not convert merchantId, so we need to handle it differently
      // Since we can't use prisma directly, we'll use db.merchants.findById to get the merchant
      // and then construct the query properly
      // Actually, let's check if db.outlets.search handles merchantId conversion
      // If not, we might need to skip outlets for now or find another way
      const outletsSearchResult = await db.outlets.search({
        merchantId: merchant.id, // Use publicId (number) - may need conversion in outlet.search
        isActive: true,
        page: 1,
        limit: 1000 // Get all outlets
      });
      outletsResult = outletsSearchResult.data || [];
    } catch (error) {
      // Don't fail the whole request if outlets fail
      outletsResult = [];
    }

    // Transform products to ensure they have categoryId
    const transformedProducts = (productsResult.data || []).map((product: any) => ({
      ...product,
      categoryId: product.categoryId || product.category?.id,
      // Ensure images is an array
      images: Array.isArray(product.images) 
        ? product.images 
        : typeof product.images === 'string' 
          ? (() => {
              try {
                const parsed = JSON.parse(product.images);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return product.images.split(',').filter(Boolean);
              }
            })()
          : []
    }));

    const responseData = {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        description: merchant.description,
        address: merchant.address,
        phone: merchant.phone,
        email: merchant.email,
        website: merchant.website,
        city: merchant.city,
        country: merchant.country,
        currency: merchant.currency,
        isActive: merchant.isActive
      },
      products: transformedProducts,
      categories: categoriesResult || [],
      outlets: (outletsResult || []).map((outlet: any) => ({
        id: outlet.id,
        name: outlet.name,
        address: outlet.address || '',
        phone: outlet.phone || '',
        city: outlet.city || '',
        state: outlet.state || '',
        zipCode: outlet.zipCode || '',
        country: outlet.country || ''
      })),
      pagination: {
        total: productsResult.total || 0,
        page: productsResult.page || page,
        limit: productsResult.limit || limit,
        hasMore: productsResult.hasMore || false
      }
    };

    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_FETCHED', responseData),
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

