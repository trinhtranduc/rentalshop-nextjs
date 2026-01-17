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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantKey: string }> | { tenantKey: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { tenantKey } = resolvedParams;
  
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
    console.log('🔍 Looking for merchant with tenantKey:', tenantKey);
    
    let merchant;
    try {
      // findByTenantKey now handles case-insensitive search internally
      merchant = await db.merchants.findByTenantKey(tenantKey);
    } catch (error) {
      console.error('❌ Error finding merchant by tenantKey:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { 
          status: 404,
          headers: buildCorsHeaders(request)
        }
      );
    }
    
    if (!merchant) {
      console.error('❌ Merchant not found with tenantKey:', tenantKey);
      console.error('💡 Tip: Make sure merchant has a tenantKey set in database');
      console.error('💡 Tip: Check if tenantKey matches exactly (case-insensitive)');
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { 
          status: 404,
          headers: buildCorsHeaders(request)
        }
      );
    }
    
    console.log('✅ Found merchant:', merchant.name, 'ID:', merchant.id, 'Type:', typeof merchant.id);

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
      merchantId: merchant.id,
      isActive: true, // Only show active products
      page,
      limit
    };
    
    console.log('🔍 Product filters:', JSON.stringify(productFilters, null, 2));

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
    console.log('🔍 Searching products with filters:', JSON.stringify(productFilters, null, 2));
    let productsResult;
    try {
      productsResult = await db.products.search(productFilters);
      console.log('📦 Products result:', {
        total: productsResult.total,
        dataLength: productsResult.data?.length || 0,
        hasMore: productsResult.hasMore
      });
    } catch (error) {
      console.error('❌ Error searching products:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filters: productFilters
      });
      throw error; // Re-throw to be caught by outer catch
    }

    // Get categories for this merchant
    const categoriesResult = await db.categories.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    console.log('📂 Categories found:', categoriesResult.length);

    // Get outlets for this merchant (for contact information)
    const outletsResult = await db.outlets.getOutletsByMerchant(merchant.id);
    console.log('🏪 Outlets found:', outletsResult.length);

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
    
    console.log('✅ Returning response with:', {
      merchantName: responseData.merchant.name,
      productsCount: responseData.products.length,
      categoriesCount: responseData.categories.length,
      total: responseData.pagination.total
    });

    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_FETCHED', responseData),
      {
        headers: buildCorsHeaders(request)
      }
    );

  } catch (error) {
    console.error('❌ Error fetching public products:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tenantKey,
      errorType: error?.constructor?.name,
      errorName: (error as any)?.name,
      errorCode: (error as any)?.code,
      errorMeta: (error as any)?.meta,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    
    // For public endpoints, we want more specific error messages
    // Check if it's a known error type first
    if ((error as any)?.code?.startsWith('P')) {
      // Prisma error - log it but return generic error for security
      console.error('❌ Prisma error detected:', (error as any).code);
    }
    
    const { response, statusCode } = handleApiError(error);
    console.error('❌ Error response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response, { 
      status: statusCode,
      headers: buildCorsHeaders(request)
    });
  }
}

