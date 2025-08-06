import { NextRequest, NextResponse } from 'next/server';
import { 
  createProduct, 
  getProducts, 
  getProductById,
  updateProduct, 
  deleteProduct,
  hardDeleteProduct,
  updateProductStock,
  checkProductAvailability,
  searchProducts,
  searchProductByBarcode,
  getProductsByMerchant,
  getProductsByOutlet,
  type ProductFilters, 
  type ProductListOptions 
} from '@rentalshop/database';
import { productSchema, productUpdateSchema } from '@rentalshop/utils';
import { searchRateLimiter } from '../../../lib/middleware/rateLimit';

/**
 * GET /api/products
 * Get products with filtering, pagination, and special operations
 * 
 * Query Parameters:
 * - Standard filters: outletId, categoryId, isActive, search, minPrice, maxPrice
 * - Pagination: page, limit, sortBy, sortOrder
 * - Special operations:
 *   - barcode: Search by barcode
 *   - merchantId: Filter by merchant
 *   - checkAvailability: Check availability for specific product
 *   - productId: Required when checkAvailability=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Apply rate limiting for search operations
    const rateLimitResult = searchRateLimiter(request);
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }
    
    // Handle barcode search
    const barcode = searchParams.get('barcode');
    if (barcode) {
      const product = await searchProductByBarcode(barcode.trim());
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: product });
    }
    
    // Handle availability check
    const checkAvailability = searchParams.get('checkAvailability');
    const productId = searchParams.get('productId');
    if (checkAvailability === 'true' && productId) {
      const isAvailable = await checkProductAvailability(productId);
      return NextResponse.json({
        success: true,
        data: { productId, isAvailable }
      });
    }
    
    // Handle merchant-specific products
    const merchantId = searchParams.get('merchantId');
    if (merchantId) {
      const categoryId = searchParams.get('categoryId') || undefined;
      const isActive = searchParams.get('isActive');
      const inStock = searchParams.get('inStock');
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: 'Limit must be between 1 and 100' },
          { status: 400 }
        );
      }
      
      const options = {
        categoryId,
        isActive: isActive ? isActive === 'true' : undefined,
        inStock: inStock ? inStock === 'true' : undefined,
        limit,
        offset,
      };
      
      const result = await getProductsByMerchant(merchantId.trim(), options);
      return NextResponse.json({ success: true, data: result });
    }
    
    // Handle outlet-specific products
    const outletId = searchParams.get('outletId');
    if (outletId && !searchParams.get('search')) {
      const categoryId = searchParams.get('categoryId') || undefined;
      const isActive = searchParams.get('isActive');
      const inStock = searchParams.get('inStock');
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: 'Limit must be between 1 and 100' },
          { status: 400 }
        );
      }
      
      const options = {
        categoryId,
        isActive: isActive ? isActive === 'true' : undefined,
        inStock: inStock ? inStock === 'true' : undefined,
        limit,
        offset,
      };
      
      const result = await getProductsByOutlet(outletId.trim(), options);
      return NextResponse.json({ success: true, data: result });
    }
    
    // Handle search functionality
    const searchQuery = searchParams.get('search') || searchParams.get('q');
    if (searchQuery) {
      const query = searchQuery;
      const outletId = searchParams.get('outletId') || undefined;
      const merchantId = searchParams.get('merchantId') || undefined;
      const categoryId = searchParams.get('categoryId') || undefined;
      const isActive = searchParams.get('isActive');
      const inStock = searchParams.get('inStock');
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: 'Limit must be between 1 and 100' },
          { status: 400 }
        );
      }
      
      const filter = {
        query,
        outletId,
        merchantId,
        categoryId,
        isActive: isActive ? isActive === 'true' : undefined,
        inStock: inStock ? inStock === 'true' : undefined,
        limit,
        offset,
      };
      
      const result = await searchProducts(filter);
      return NextResponse.json({ success: true, data: result });
    }
    
    // Standard product listing with filters
    const filters: ProductFilters = {};
    const options: ProductListOptions = {};
    
    // Filter parameters
    if (searchParams.get('outletId')) filters.outletId = searchParams.get('outletId')!;
    if (searchParams.get('categoryId')) filters.categoryId = searchParams.get('categoryId')!;
    if (searchParams.get('isActive')) filters.isActive = searchParams.get('isActive') === 'true';
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('minPrice')) filters.minPrice = parseFloat(searchParams.get('minPrice')!);
    if (searchParams.get('maxPrice')) filters.maxPrice = parseFloat(searchParams.get('maxPrice')!);
    
    // Pagination and sorting parameters
    if (searchParams.get('page')) options.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('limit')) options.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sortBy')) options.sortBy = searchParams.get('sortBy') as any;
    if (searchParams.get('sortOrder')) options.sortOrder = searchParams.get('sortOrder') as any;

    const result = await getProducts(filters, options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = productSchema.parse(body);
    
    // Create product
    const product = await createProduct(validatedData);

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    
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
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products
 * Update a product (requires productId in query params)
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Check if product exists
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Validate input
    const validatedData = productUpdateSchema.parse(body);
    
    // Update product
    const product = await updateProduct(productId, validatedData);

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
 * DELETE /api/products
 * Delete a product (requires productId in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const hardDelete = searchParams.get('hard') === 'true';
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Check if product exists
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Delete product
    const product = hardDelete 
      ? await hardDeleteProduct(productId)
      : await deleteProduct(productId);

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
 * PATCH /api/products
 * Update product stock (requires productId in query params)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Check if product exists
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Validate quantity
    const { quantity } = body;
    if (typeof quantity !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a number' },
        { status: 400 }
      );
    }
    
    // Update stock
    const product = await updateProductStock(productId, quantity);

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