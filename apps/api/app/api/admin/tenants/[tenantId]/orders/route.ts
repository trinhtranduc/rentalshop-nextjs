import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, getTenantDb } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tenants/{tenantId}/orders
 * Get orders for a specific tenant (Admin only)
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
    const status = searchParams.get('status') || undefined;
    const orderType = searchParams.get('orderType') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const search = searchParams.get('q') || searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Text search
    if (search) {
      const searchTerm = search.trim();
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchTerm } } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'orderNumber') {
      orderBy.orderNumber = sortOrder;
    } else if (sortBy === 'totalAmount') {
      orderBy.totalAmount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Query orders from tenant DB
    const [orders, total] = await Promise.all([
      (tenantDb as any).order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          outlet: {
            select: {
              id: true,
              name: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      (tenantDb as any).order.count({ where }),
    ]);

    // Transform orders to include tenant info
    const items = orders.map((order: any) => ({
      ...order,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSubdomain: tenant.subdomain,
    }));

    return NextResponse.json(
      ResponseBuilder.success('ORDERS_FOUND', {
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
    console.error('Get tenant orders error:', error);
    
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

