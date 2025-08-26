import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { productUpdateSchema } from '@rentalshop/utils';

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

    // Get user scope to check merchant access
    const { merchantId } = getUserScope(user as any);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Check if the ID is numeric (public ID) or alphanumeric (internal ID)
    const isPublicId = /^\d+$/.test(id);
    
    // Find product by ID and ensure it belongs to the user's merchant
    const product = await prisma.product.findFirst({
      where: {
        ...(isPublicId ? { publicId: parseInt(id) } : { id: id }),
        merchantId: merchantId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        merchant: {
          select: {
            id: true,
            name: true
          }
        },
        outletStock: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      console.log('❌ Product not found in database for ID:', id);
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
        outletId: os.outlet.id,
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
 * PUT /api/products/[productId]
 * Update product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const { productId } = params;
    const body = await request.json();

    console.log('🔍 PUT /api/products/[productId] - Updating product with ID:', productId);
    console.log('📝 Update data:', body);

    // Validate input data
    const validationResult = productUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('❌ Validation error:', validationResult.error.flatten());
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          error: validationResult.error.flatten()
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Get user scope to check merchant access
    const { merchantId } = getUserScope(user as any);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Check if the ID is numeric (public ID) or alphanumeric (internal ID)
    const isPublicId = /^\d+$/.test(productId);

    // Check if product exists and belongs to the user's merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        ...(isPublicId ? { publicId: parseInt(productId) } : { id: productId }),
        merchantId: merchantId
      }
    });

    if (!existingProduct) {
      console.log('❌ Product not found or access denied for ID:', productId);
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product - use the appropriate ID field
    const whereClause = isPublicId ? { publicId: parseInt(productId) } : { id: productId };
    
    const updatedProduct = await prisma.product.update({
      where: whereClause,
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.categoryId && { categoryId: updateData.categoryId }),
        ...(updateData.rentPrice !== undefined && { rentPrice: updateData.rentPrice }),
        ...(updateData.salePrice !== undefined && { salePrice: updateData.salePrice }),
        ...(updateData.deposit !== undefined && { deposit: updateData.deposit }),
        ...(updateData.totalStock !== undefined && { totalStock: updateData.totalStock }),
        ...(updateData.images !== undefined && { images: updateData.images }),
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        merchant: {
          select: {
            id: true,
            name: true
          }
        },
        outletStock: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Note: outletStock updates are not supported in the current schema
    // They would need to be handled separately if needed

    console.log('✅ Product updated successfully');

    // Transform the updated product data
    const transformedProduct = {
              id: updatedProduct.publicId, // Return publicId as "id" to frontend
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
      outletStock: updatedProduct.outletStock.map(os => ({
        outletId: os.outlet.id,
        stock: os.stock,
        available: os.available,
        renting: os.renting
      })),
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
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[productId]
 * Delete product by ID (soft delete by setting isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const { productId } = params;
    console.log('🔍 DELETE /api/products/[productId] - Deleting product with ID:', productId);

    // Get user scope to check merchant access
    const { merchantId } = getUserScope(user as any);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Check if the ID is numeric (public ID) or alphanumeric (internal ID)
    const isPublicId = /^\d+$/.test(productId);

    // Check if product exists and belongs to the user's merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        ...(isPublicId ? { publicId: parseInt(productId) } : { id: productId }),
        merchantId: merchantId
      }
    });

    if (!existingProduct) {
      console.log('❌ Product not found or access denied for ID:', productId);
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const whereClause = isPublicId ? { publicId: parseInt(productId) } : { id: productId };
    
    await prisma.product.update({
      where: whereClause,
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    console.log('✅ Product deleted successfully (soft delete)');

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
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
