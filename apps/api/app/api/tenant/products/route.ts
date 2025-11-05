import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/tenant/products
 * Get products from tenant database
 * Demonstrates data isolation - each tenant only sees their own data
 */
export async function GET(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('SUBDOMAIN_REQUIRED', 'Tenant subdomain not found'),
        { status: 400 }
      );
    }

    // Get tenant-specific database connection
    const tenantDb = await getTenantDb(subdomain);

    // Query products from tenant's isolated database
    const products = await tenantDb.product.findMany({
      where: {
        isActive: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        outletStock: {
          select: {
            outletId: true,
            stock: true,
            available: true,
            renting: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_FOUND', {
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          barcode: p.barcode,
          rentPrice: p.rentPrice,
          salePrice: p.salePrice,
          deposit: p.deposit,
          category: p.category,
          outletStock: p.outletStock,
          isActive: p.isActive,
          createdAt: p.createdAt
        })),
        total: products.length
      })
    );
  } catch (error: any) {
    console.error('Get tenant products error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * POST /api/tenant/products
 * Create product in tenant database
 * Demonstrates data isolation - product is created only in tenant's database
 */
export async function POST(request: NextRequest) {
  try {
    const subdomain = request.headers.get('x-tenant-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('SUBDOMAIN_REQUIRED', 'Tenant subdomain not found'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, barcode, rentPrice, salePrice, deposit, categoryId } = body;

    if (!name || !rentPrice || !categoryId) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', 'Name, rentPrice, and categoryId are required'),
        { status: 400 }
      );
    }

    // Get tenant-specific database connection
    const tenantDb = await getTenantDb(subdomain);

    // Create product in tenant's isolated database
    const product = await tenantDb.product.create({
      data: {
        name,
        description: description || null,
        barcode: barcode || null,
        rentPrice: parseFloat(rentPrice),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        deposit: deposit ? parseFloat(deposit) : 0,
        categoryId: parseInt(categoryId),
        isActive: true,
        totalStock: 0
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(
      ResponseBuilder.success('PRODUCT_CREATED', {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          barcode: product.barcode,
          rentPrice: product.rentPrice,
          salePrice: product.salePrice,
          deposit: product.deposit,
          category: product.category,
          isActive: product.isActive,
          createdAt: product.createdAt
        }
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create tenant product error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tenant-subdomain',
    }
  });
}
