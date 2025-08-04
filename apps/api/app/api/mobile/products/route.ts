import { NextRequest, NextResponse } from 'next/server';
import { 
  getProducts, 
  type ProductFilters, 
  type ProductListOptions 
} from '@rentalshop/database';

/**
 * GET /api/mobile/products
 * Get products optimized for mobile apps
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
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('minPrice')) filters.minPrice = parseFloat(searchParams.get('minPrice')!);
    if (searchParams.get('maxPrice')) filters.maxPrice = parseFloat(searchParams.get('maxPrice')!);
    
    // Pagination and sorting parameters (optimized for mobile)
    if (searchParams.get('page')) options.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('limit')) options.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sortBy')) options.sortBy = searchParams.get('sortBy') as any;
    if (searchParams.get('sortOrder')) options.sortOrder = searchParams.get('sortOrder') as any;

    // Default mobile-optimized settings
    if (!options.limit) options.limit = 20; // Smaller batch size for mobile
    if (!options.sortBy) options.sortBy = 'createdAt';
    if (!options.sortOrder) options.sortOrder = 'desc';

    const result = await getProducts(filters, options);

    // Transform data for mobile optimization
    const mobileProducts = result.products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price || 0,
      deposit: product.deposit,
      images: product.images,
      isAvailable: product.isAvailable,
      category: {
        name: product.category.name,
      },
      outlet: {
        name: product.outlet.name,
        address: product.outlet.address,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        products: mobileProducts,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching mobile products:', error);
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