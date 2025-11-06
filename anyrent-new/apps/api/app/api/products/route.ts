import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@demo/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain not found' },
        { status: 400 }
      );
    }

    // Get tenant database connection
    const db = await getTenantDb(subdomain);

    // Query products from tenant's database
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      products,
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, stock } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Get tenant database connection
    const db = await getTenantDb(subdomain);

    // Create product in tenant's database
    const product = await db.product.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
      },
    });

    return NextResponse.json({
      product,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
