import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getProductByPublicId } from '@rentalshop/database';
import { getUserScope, assertAnyRole } from '@rentalshop/auth';

/**
 * GET /api/products/[id]
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id } = params;
    console.log('🔍 GET /api/products/[id] - Looking for product with ID:', id);

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const publicId = parseInt(id);
    
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
    const product = await getProductByPublicId(publicId, userMerchantId);

    if (!product) {
      console.log('❌ Product not found in database for publicId:', publicId);
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('✅ Product found, transforming data...');

    // Transform the data to match the expected format
    const transformedProduct = {
      id: product.publicId, // Return publicId as "id" to frontend
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
      outletStock: product.outletStock.map(os => ({
        outletId: os.outlet.publicId, // Use publicId for frontend
        stock: os.stock,
        available: os.available,
        renting: os.renting
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
      { status: 500 }
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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    // Authorization: Only merchant-level roles can update products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient permissions to update products' },
        { status: 403 }
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

    // For now, return a placeholder response since the update logic needs to be implemented
    // using the proper database functions that handle the dual ID system
    return NextResponse.json({
      success: true,
      data: {},
      message: 'Product update functionality coming soon'
    });

  } catch (error) {
    console.error('❌ Error updating product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    // Authorization: Only merchant-level roles can delete products
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient permissions to delete products' },
        { status: 403 }
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
      { status: 500 }
    );
  }
}
