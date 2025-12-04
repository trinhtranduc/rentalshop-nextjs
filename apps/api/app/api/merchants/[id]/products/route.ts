import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/products
 * Get merchant products with role-based access control
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Role-based filtering ensures users only see products within their scope:
 * - ADMIN: Can see all products (no restrictions)
 * - MERCHANT: Can only see products from their own merchant
 * - OUTLET_ADMIN/OUTLET_STAFF: Can only see products from their merchant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['products.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Build search filters with role-based access control
      const searchFilters: any = {
        merchantId: merchantPublicId,
        isActive: true
      };

      // Role-based outlet filtering (if user is outlet-level, filter by outlet stock):
      // - OUTLET_ADMIN/OUTLET_STAFF: Only show products available at their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        if (userScope.outletId) {
          searchFilters.outletId = userScope.outletId;
        }
      }

      console.log(`🔍 Role-based filtering for merchant products (${user.role}):`, {
        merchantPublicId,
        'userScope.merchantId': userScope.merchantId,
        'userScope.outletId': userScope.outletId,
        'final merchantId filter': searchFilters.merchantId,
        'final outletId filter': searchFilters.outletId
      });

      // Get products for this merchant with role-based filtering
      const products = await db.products.search(searchFilters);

      // Return standardized response format matching general products API
      return NextResponse.json(ResponseBuilder.success('PRODUCTS_FOUND', {
        products: products.data || [],
        total: products.total || 0,
        page: products.page || 1,
        limit: products.limit || 20,
        hasMore: products.hasMore || false,
        totalPages: Math.ceil((products.total || 0) / (products.limit || 20))
      }, `Found ${products.total || 0} products`));

    } catch (error) {
      console.error('Error fetching merchant products:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/products
 * Create new product with role-based access control
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Validates merchant ownership before creating product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['products.manage'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const body = await request.json();
      const { name, description, barcode, categoryId, rentPrice, salePrice, deposit, totalStock, images } = body;

      // Create new product
      const newProduct = await db.products.create({
        name,
        description,
        barcode,
        categoryId,
        rentPrice,
        salePrice,
        deposit,
        totalStock,
        images: JSON.stringify(Array.isArray(images) ? images : images ? [images] : []),
        merchantId: merchant.id,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        data: newProduct,
        code: 'PRODUCT_CREATED_SUCCESS',
        message: 'Product created successfully'
      });

    } catch (error) {
      console.error('Error creating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}