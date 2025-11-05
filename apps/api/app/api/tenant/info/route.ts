import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySubdomain } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tenant/info
 * Get tenant information by subdomain
 * Reads subdomain from x-tenant-subdomain header (set by middleware)
 */
export async function GET(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('SUBDOMAIN_REQUIRED', 'Tenant subdomain not found in request headers'),
        { status: 400 }
      );
    }

    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
        { status: 404 }
      );
    }

    // Return tenant info (exclude sensitive data like databaseUrl)
    return NextResponse.json(
      ResponseBuilder.success('TENANT_INFO_FOUND', {
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
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
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          trialEnd: tenant.trialEnd,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      })
    );
  } catch (error: any) {
    console.error('Get tenant info error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-subdomain',
    }
  });
}
