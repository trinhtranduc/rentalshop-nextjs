import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/products/[productId]
 * Get product detail for editing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const productPublicId = parseInt(resolvedParams.productId);
  
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const product = await db.products.findById(productPublicId);
      if (!product) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
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

      // Debug outletStock vs outlets mapping
      console.log('🔍 GET Product - raw outletStock:', product.outletStock);
      console.log('🔍 GET Product - raw outlets:', outlets.data);

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
          outletStock: product.outletStock.map(os => {
            console.log(`🔍 Mapping outletStock: outlet.id=${os.outlet.id}, stock=${os.stock}, outlet.name=${os.outlet.name}`);
            return { outletId: os.outlet.id, stock: os.stock };
          })
        },
        categories: categories.map(c => ({ id: c.id, name: c.name })),
        outlets: outlets.data?.map(o => {
          console.log(`🔍 Mapping outlet: id=${o.id}, name=${o.name}`);
          return { id: o.id, name: o.name, address: o.address || '' };
        }) || []
      };

      return NextResponse.json({ success: true, data: transformed });
    } catch (error) {
      console.error('Error fetching product detail:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
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
  { params }: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  const productPublicId = parseInt(resolvedParams.productId);
  
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const existing = await db.products.findById(productPublicId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const body = await request.json();
      const { name, description, barcode, categoryId, rentPrice, salePrice, deposit, totalStock, images, isActive, outletStock } = body;
      
      console.log('🔍 PUT Product - received body outletStock:', outletStock);
      console.log('🔍 PUT Product - typeof outletStock:', typeof outletStock, 'isArray:', Array.isArray(outletStock));

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

      // Update outlet stock if provided
      if (outletStock && Array.isArray(outletStock) && outletStock.length > 0) {
        console.log('🔄 Updating outlet stock:', outletStock);
        
        // Delete existing outlet stock entries for this product
        await prisma.outletStock.deleteMany({
          where: { productId: existing.id }
        });

        // Create new outlet stock entries
        for (const stock of outletStock) {
          if (stock.outletId && typeof stock.stock === 'number') {
            console.log(`🔍 Processing outlet stock - outletId: ${stock.outletId}, stock: ${stock.stock}`);
            
            // Verify outlet exists
            const outlet = await db.outlets.findById(stock.outletId);
            if (outlet) {
              console.log(`✅ Found outlet:`, { id: outlet.id, name: outlet.name });
              
              await prisma.outletStock.create({
                data: {
                  productId: existing.id,
                  outletId: outlet.id,
                  stock: stock.stock,
                  available: stock.stock,
                  renting: 0
                }
              });
              
              console.log(`✅ Created outlet stock entry for product ${existing.id} and outlet ${outlet.id}`);
            } else {
              console.error(`❌ Outlet not found with id: ${stock.outletId}`);
            }
          } else {
            console.log(`⚠️ Skipping invalid stock entry:`, stock);
          }
        }
      } else {
        console.log('⚠️ No outletStock provided or empty array');
      }

      // Fetch updated product with outlet stock
      const updatedProduct = await db.products.findById(productPublicId);

      return NextResponse.json({ success: true, data: updatedProduct });
    } catch (error) {
      console.error('Error updating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}