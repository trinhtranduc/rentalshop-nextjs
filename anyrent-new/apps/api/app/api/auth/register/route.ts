import { NextRequest, NextResponse } from 'next/server';
import {
  createMerchant,
  createTenant,
  createTenantDatabase,
  sanitizeSubdomain,
  validateSubdomain,
  subdomainExists,
  getRootDomain,
  getProtocol,
} from '@demo/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, email, phone, subdomain: inputSubdomain } = body;

    // Validate inputs
    if (!businessName || !email) {
      return NextResponse.json(
        { error: 'Business name and email are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate subdomain
    const subdomain = inputSubdomain
      ? sanitizeSubdomain(inputSubdomain)
      : sanitizeSubdomain(businessName);

    if (!validateSubdomain(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    if (await subdomainExists(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 409 }
      );
    }

    // Create merchant in Main DB
    const merchant = await createMerchant({
      name: businessName,
      email,
      phone: phone || undefined,
    });

    // Create tenant database
    console.log(`Creating database for tenant: ${subdomain}`);
    const databaseUrl = await createTenantDatabase(subdomain, merchant.id);

    // Create tenant in Main DB
    const tenant = await createTenant({
      subdomain,
      name: businessName,
      merchantId: merchant.id,
      databaseUrl,
    });

    // Return success with redirect URL
    const protocol = getProtocol();
    const rootDomain = getRootDomain();
    const tenantUrl = `${protocol}://${subdomain}.${rootDomain}`;

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
      },
      url: tenantUrl,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
