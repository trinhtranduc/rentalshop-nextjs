import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/products
 * Get merchant products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid merchant ID' },
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get products for this merchant
      const products = await db.products.search({
        merchantId: merchantPublicId,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        data: products.data || [],
        total: products.total || 0
      });

    } catch (error) {
      console.error('Error fetching merchant products:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/products
 * Create new product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid merchant ID' },
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
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