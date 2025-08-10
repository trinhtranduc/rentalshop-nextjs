import { NextRequest, NextResponse } from 'next/server';
import { 
  getProducts, 
  type ProductSearchFilter
} from '@rentalshop/database';

/**
 * GET /api/mobile/products
 * Get products optimized for mobile apps
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: ProductSearchFilter = {};
    
    // Filter parameters
    if (searchParams.get('outletId')) filters.outletId = searchParams.get('outletId')!;
    if (searchParams.get('categoryId')) filters.categoryId = searchParams.get('categoryId')!;
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    
    // Pagination parameters (optimized for mobile)
    if (searchParams.get('page')) filters.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit')!);

    // Default mobile-optimized settings
    if (!filters.limit) filters.limit = 20; // Smaller batch size for mobile

    const result = await getProducts(filters);

    // Transform data for mobile optimization
    const mobileProducts = result.products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.rentPrice || 0,
      deposit: product.deposit,
      images: product.images,
      isAvailable: product.outletStock?.[0]?.available > 0 && product.isActive,
      category: {
        name: product.category?.name,
      },
      outlet: {
        name: product.outletStock?.[0]?.outlet?.name,
        address: product.outletStock?.[0]?.outlet?.address,
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