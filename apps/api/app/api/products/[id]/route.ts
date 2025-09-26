import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { getProductById, updateProduct } from '@rentalshop/database';
import { getUserScope, assertAnyRole } from '@rentalshop/auth';
import { productUpdateSchema } from '@rentalshop/utils';
import { captureAuditContext } from '@rentalshop/middleware';
import { createAuditHelper } from '@rentalshop/utils';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products/[id]
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const { id } = params;
    console.log('🔍 GET /api/products/[id] - Looking for product with ID:', id);

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const productId = parseInt(id);
    
    // Get user scope for merchant isolation
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;
    
    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }
    
    // Get product using the secure database function that enforces merchant isolation
    const product = await getProductById(productId, userMerchantId);

    if (!product) {
      console.log('❌ Product not found in database for productId:', productId);
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: API.STATUS.NOT_FOUND }
      );
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
      message: 'Product retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Update product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

    // Authorization: Only merchant-level roles can update products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient permissions to update products' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get user scope for merchant isolation
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;
    
    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    const { id } = params;

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const productId = parseInt(id);

    // Parse and validate request body
    const body = await request.json();
    console.log('🔍 PUT /api/products/[id] - Update request body:', body);

    // Validate input data
    const validatedData = productUpdateSchema.parse(body);
    console.log('✅ Validated update data:', validatedData);

    // Check if product exists and user has access to it
    const existingProduct = await getProductById(productId, userMerchantId);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Update the product using the database function
    const updatedProduct = await updateProduct(productId, validatedData);
    console.log('✅ Product updated successfully:', updatedProduct);

    // Log audit event for product update
    try {
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logUpdate({
        entityType: 'Product',
        entityId: updatedProduct?.id?.toString() || productId.toString(),
        entityName: updatedProduct?.name || `Product ${productId}`,
        oldValues: {}, // We don't have the old values in this context
        newValues: updatedProduct || {},
        description: `Product updated: ${updatedProduct?.name || productId}`,
        context: {
          ...auditContext,
          userId: user.id?.toString() || '',
          userEmail: user.email || undefined,
          userRole: user.role || undefined,
          merchantId: user.merchantId?.toString(),
          outletId: user.outletId?.toString()
        }
      });
    } catch (auditError) {
      console.error('Failed to log product update audit:', auditError);
      // Don't fail the request if audit logging fails
    }

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
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Delete product by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

    // Authorization: Only merchant-level roles can delete products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient permissions to delete products' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get user scope for merchant isolation
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;
    
    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    const { id } = params;

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    // For now, return a placeholder response since the delete logic needs to be implemented
    // using the proper database functions that handle the dual ID system
    return NextResponse.json({
      success: true,
      message: 'Product delete functionality coming soon'
    });

  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
