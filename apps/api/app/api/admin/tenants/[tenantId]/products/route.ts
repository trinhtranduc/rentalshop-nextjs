import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, getTenantDb } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tenants/{tenantId}/products
 * Get products for a specific tenant (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const { tenantId } = params;

    // Validate tenantId
    if (!tenantId) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_ID_REQUIRED', 'Tenant ID is required'),
        { status: 400 }
      );
    }

    // Get tenant from Main DB
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
        { status: 404 }
      );
    }

    if (tenant.status !== 'active') {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_INACTIVE', 'Tenant is not active'),
        { status: 400 }
      );
    }

    // Connect to tenant DB
    const tenantDb = await getTenantDb(tenant.subdomain);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('q') || searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined;
    const isActive = searchParams.get('isActive') !== 'false'; // Default to true
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {
      isActive: isActive !== false,
    };

    // Search filter
    if (search) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'price') {
      orderBy.rentPrice = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Query products from tenant DB
    const [products, total] = await Promise.all([
      (tenantDb as any).product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          outletStock: {
            include: {
              outlet: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      (tenantDb as any).product.count({ where }),
    ]);

    // Transform products to include tenant info
    const items = products.map((product: any) => ({
      ...product,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSubdomain: tenant.subdomain,
    }));

    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_FOUND', {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
      })
    );
  } catch (error: any) {
    console.error('Get tenant products error:', error);
    
    // Handle tenant DB connection errors
    if (error.message?.includes('not found') || error.message?.includes('inactive')) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

