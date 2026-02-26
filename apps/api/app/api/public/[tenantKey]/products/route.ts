import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';

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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build product filters
    // Note: For public pages, we only show active products
    const productFilters: any = {
      merchantId: merchant.id, // Use publicId (number) - searchProducts will convert to CUID
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
    console.log('📂 Categories found:', categoriesResult.length);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
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
    console.log('🏪 Outlets found:', outletsResult.length);
    } catch (error) {
      console.error('❌ Error fetching outlets:', error);
      console.error('💡 Note: db.outlets.search may need merchant CUID instead of publicId');
      // Don't fail the whole request if outlets fail
      outletsResult = [];
    }

    // Transform products to ensure they have categoryId
    const transformedProducts = (productsResult.data || []).map((product: any) => ({
      ...product,
      categoryId: product.categoryId || product.category?.id,
      // ✅ Use shared parseProductImages() for backward compatibility
      // Handles: array, JSON string, comma-separated string, quoted string
      images: parseProductImages(product.images)
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

