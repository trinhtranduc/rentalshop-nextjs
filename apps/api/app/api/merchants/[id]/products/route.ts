import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/products
 * Get merchant products
 * 
 * Authorization: All roles with 'products.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
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
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get products for this merchant
      const products = await db.products.search({
        merchantId: merchantPublicId,
        isActive: true
      });

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
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/products
 * Create new product
 * 
 * Authorization: All roles with 'products.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withPermissions(['products.manage'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

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
        data: newProduct
      });

    } catch (error) {
      console.error('Error creating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}