import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySubdomain } from '@demo/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-subdomain',
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain not found' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-tenant-subdomain',
          }
        }
      );
    }

    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.name,
          status: tenant.status,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-tenant-subdomain',
        }
      }
    );
  } catch (error: any) {
    console.error('Get tenant info error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get tenant info' },
      { status: 500 }
    );
  }
}
