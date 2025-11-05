import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, getTenantDb } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tenants/{tenantId}/users
 * Get users for a specific tenant (Admin only)
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
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive') !== 'false'; // Default to true, but allow 'false' string
    const outletId = searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined;
    const search = searchParams.get('q') || searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = {};

    if (isActive !== false) {
      where.isActive = true;
    } else {
      where.isActive = false;
    }

    if (role) {
      where.role = role;
    }

    if (outletId) {
      where.outletId = outletId;
    }

    // Text search
    if (search) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'firstName') {
      orderBy.firstName = sortOrder;
    } else if (sortBy === 'lastName') {
      orderBy.lastName = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Query users from tenant DB
    const [users, total] = await Promise.all([
      (tenantDb as any).user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          outlet: {
            select: {
              id: true,
              name: true,
            },
          },
          // Exclude password
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      (tenantDb as any).user.count({ where }),
    ]);

    // Transform users to include tenant info
    const items = users.map((user: any) => ({
      ...user,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSubdomain: tenant.subdomain,
    }));

    return NextResponse.json(
      ResponseBuilder.success('USERS_FOUND', {
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
    console.error('Get tenant users error:', error);
    
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

