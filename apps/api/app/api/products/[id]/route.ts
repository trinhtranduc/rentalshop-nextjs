import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { productUpdateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/products/[id]
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/products/[id] - Looking for product with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Get product using the simplified database API
      const product = await db.products.findById(productId);

      if (!product) {
        console.log('❌ Product not found in database for productId:', productId);
        throw new Error('Product not found');
      }

      console.log('✅ Product found, transforming data...');

      // Transform the data to match the expected format
      const transformedProduct = {
        id: product.id, // Return id directly to frontend
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        categoryId: product.categoryId,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice,
        deposit: product.deposit,
        totalStock: product.totalStock,
        images: product.images,
        isActive: product.isActive,
        category: product.category,
        merchant: product.merchant,
        outletStock: product.outletStock.map((os: any) => ({
          id: os.id,
          outletId: os.outlet.id, // Use id for frontend
          stock: os.stock,
          available: os.available,
          renting: os.renting,
          outlet: {
            id: os.outlet.id, // Use id for frontend
            name: os.outlet.name,
            address: os.outlet.address || null // Include address if available
          }
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      };

      console.log('✅ Transformed product data:', transformedProduct);

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_RETRIEVED_SUCCESS', message: 'Product retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/products/[id]
 * Update product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/products/[id] - Update request body:', body);

      // Validate input data
      const validatedData = productUpdateSchema.parse(body);
      console.log('✅ Validated update data:', validatedData);

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Check for duplicate product name if name is being updated
      if (validatedData.name && validatedData.name !== existingProduct.name) {
        const duplicateProduct = await db.products.findFirst({
          where: {
            name: validatedData.name,
            merchantId: userMerchantId,
            isActive: true,
            id: { not: productId }
          }
        });

        if (duplicateProduct) {
          console.log('❌ Product name already exists:', validatedData.name);
          return NextResponse.json(
            {
              success: false,
              code: 'PRODUCT_NAME_EXISTS',
              message: `A product with the name "${validatedData.name}" already exists. Please choose a different name.`
            },
            { status: 409 }
          );
        }
      }

      // Update the product using the simplified database API
      const updatedProduct = await db.products.update(productId, validatedData);
      console.log('✅ Product updated successfully:', updatedProduct);

      // Transform the response to match frontend expectations
      const transformedProduct = {
        id: updatedProduct.id, // Return id directly to frontend
        name: updatedProduct.name,
        description: updatedProduct.description,
        barcode: updatedProduct.barcode,
        categoryId: updatedProduct.categoryId,
        rentPrice: updatedProduct.rentPrice,
        salePrice: updatedProduct.salePrice,
        deposit: updatedProduct.deposit,
        totalStock: updatedProduct.totalStock,
        images: updatedProduct.images,
        isActive: updatedProduct.isActive,
        category: updatedProduct.category,
        merchant: updatedProduct.merchant,
        createdAt: updatedProduct.createdAt.toISOString(),
        updatedAt: updatedProduct.updatedAt.toISOString()
      };

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_UPDATED_SUCCESS', message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/products/[id]
 * Delete product by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Soft delete by setting isActive to false
      const deletedProduct = await db.products.update(productId, { isActive: false });
      console.log('✅ Product soft deleted successfully:', deletedProduct);

      return NextResponse.json({
        success: true,
        data: deletedProduct,
        code: 'PRODUCT_DELETED_SUCCESS', message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
