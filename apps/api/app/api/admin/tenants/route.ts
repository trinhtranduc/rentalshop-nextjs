import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { listAllTenants } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tenants
 * List all tenants (Super Admin only)
 * Returns tenants from Main DB with pagination and filtering
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;
    const subscriptionStatus = searchParams.get('subscriptionStatus') || undefined;
    const planId = searchParams.get('planId') ? parseInt(searchParams.get('planId')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build filters
    const filters = {
      search,
      status,
      subscriptionStatus,
      planId,
      page,
      limit,
      sortBy,
      sortOrder
    };

    // Get tenants from Main DB
    const result = await listAllTenants(filters);

    // Transform tenants to match Merchant interface (for backward compatibility)
    const merchants = result.tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      zipCode: tenant.zipCode,
      country: tenant.country,
      businessType: tenant.businessType,
      website: tenant.website,
      description: tenant.description,
      taxId: tenant.taxId,
      subdomain: tenant.subdomain,
      status: tenant.status,
      subscriptionStatus: tenant.subscriptionStatus,
      planId: tenant.planId,
      trialStart: tenant.trialStart,
      trialEnd: tenant.trialEnd,
      currentPeriodStart: tenant.currentPeriodStart,
      currentPeriodEnd: tenant.currentPeriodEnd,
      canceledAt: tenant.canceledAt,
      cancelReason: tenant.cancelReason,
      isActive: tenant.status === 'active',
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      // Add tenant-specific fields
      tenantUrl: `${tenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'anyrent.shop'}`,
      databaseUrl: tenant.databaseUrl ? '***masked***' : null // Don't expose actual database URL
    }));

    return NextResponse.json(
      ResponseBuilder.success('TENANTS_FOUND', {
        merchants, // Use 'merchants' key for backward compatibility
        tenants: result.tenants, // Also include 'tenants' key
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasMore: (page * limit) < result.total
      })
    );
  } catch (error: any) {
    console.error('Get tenants error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
