import { NextRequest, NextResponse } from 'next/server';
import { 
  getProductById, 
  updateProduct, 
  deleteProduct,
  hardDeleteProduct,
  updateProductStock,
  checkProductAvailability
} from '@rentalshop/database';
import { productUpdateSchema } from '@rentalshop/utils';

/**
 * GET /api/products/[id]
 * Get a product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const product = await getProductById(id);
    
    if (!product) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
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
 * Update a product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }
    
    // Validate input
    const validatedData = productUpdateSchema.parse(body);
    
    // Update product
    const product = await updateProduct(id, validatedData);

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error',
          details: error.message
        },
        { status: 400 }
      );
    }

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
 * Delete a product (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';
    
    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }
    
    // Delete product
    const product = hardDelete 
      ? await hardDeleteProduct(id)
      : await deleteProduct(id);

    return NextResponse.json({
      success: true,
      data: product,
      message: `Product ${hardDelete ? 'permanently deleted' : 'deleted'} successfully`,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
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

/**
 * PATCH /api/products/[id]/stock
 * Update product stock
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }
    
    // Validate quantity
    const { quantity } = body;
    if (typeof quantity !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Quantity must be a number' 
        },
        { status: 400 }
      );
    }
    
    // Update stock
    const product = await updateProductStock(id, quantity);

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product stock updated successfully',
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update product stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 