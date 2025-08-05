import { NextRequest, NextResponse } from 'next/server';
import { 
  createProduct, 
  getProducts, 
  type ProductFilters, 
  type ProductListOptions 
} from '@rentalshop/database';
import { productSchema } from '@rentalshop/utils';

/**
 * GET /api/products
 * Get products with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
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