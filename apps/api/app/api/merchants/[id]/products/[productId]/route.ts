import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/products/[productId]
 * Get product detail for editing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      const productPublicId = parseInt(params.productId);
      
      if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
        return NextResponse.json({ success: false, message: 'Invalid IDs' }, { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: API.STATUS.NOT_FOUND });
      }

      const product = await db.products.findById(productPublicId);
      if (!product) {
        return NextResponse.json({ success: false, message: 'Product not found' }, { status: API.STATUS.NOT_FOUND });
      }

      // Get categories for this merchant
      const categories = await db.categories.findMany({
        where: { merchantId: merchant.id, isActive: true }
      });

      // Get outlets for this merchant
      const outlets = await db.outlets.search({
        merchantId: merchantPublicId,
        isActive: true
      });

      const transformed = {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          barcode: product.barcode,
          categoryId: product.categoryId,
          rentPrice: product.rentPrice,
          salePrice: product.salePrice,
          deposit: product.deposit,
          totalStock: product.totalStock,
          images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
          isActive: product.isActive,
          outletStock: product.outletStock.map(os => ({ outletId: os.outlet.id, stock: os.stock }))
        },
        categories: categories.map(c => ({ id: c.id, name: c.name })),
        outlets: outlets.data?.map(o => ({ id: o.id, name: o.name, address: o.address || '' })) || []
      };

      return NextResponse.json({ success: true, data: transformed });
    } catch (error) {
      console.error('Error fetching product detail:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/products/[productId]
 * Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      const productPublicId = parseInt(params.productId);
      
      if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
        return NextResponse.json({ success: false, message: 'Invalid IDs' }, { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.products.findById(productPublicId);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Product not found' }, { status: API.STATUS.NOT_FOUND });
      }

      const body = await request.json();
      const { name, description, barcode, categoryId, rentPrice, salePrice, deposit, totalStock, images, isActive } = body;

      // Resolve category CUID from id
      let categoryCuid: string | undefined = undefined;
      if (typeof categoryId === 'number') {
        const category = await db.categories.findById(categoryId);
        if (category) categoryCuid = category.id.toString();
      }

      // Update main product fields
      const updated = await db.products.update(productPublicId, {
        name,
        description: description ?? null,
        barcode: barcode ?? null,
        categoryId: categoryId,
        rentPrice,
        salePrice: salePrice ?? null,
        deposit,
        totalStock,
        images: JSON.stringify(Array.isArray(images) ? images : images ? [images] : []),
        isActive: body.isActive ?? true
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}