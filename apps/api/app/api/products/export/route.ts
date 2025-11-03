import { NextRequest, NextResponse } from 'next/server';
import { withProductExportAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/products/export
 * Export products to CSV (Admin, Merchant, Outlet Admin only)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * OUTLET_STAFF cannot export products
 */
export const GET = withProductExportAuth(async (authorizedRequest) => {
  try {
    const { user, request } = authorizedRequest;
    
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause - NO merchantId needed
    const where: any = {};
    if (user.role === 'OUTLET_ADMIN') {
      // Filter products that have stock at this outlet
      where.outletStock = {
        some: {
          outletId: user.outletId
        }
      };
    }

    // Get products
    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        outletStock: {
          include: { outlet: true }
        }
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset
    });

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Name',
      'Barcode',
      'Description',
      'Stock',
      'Renting',
      'Available',
      'Rent Price',
      'Deposit',
      'Outlet ID',
      'Created At',
      'Updated At'
    ];

    const csvRows = products.flatMap((product: any) => {
      // If filtering by specific outlet, only export that outlet's data
      if (user.role === 'OUTLET_ADMIN') {
        const outletStock = product.outletStock.find((os: any) => os.outlet.id === user.outletId);
        if (!outletStock) return []; // Skip products not in this outlet
        
        return [[
          product.id,
          `"${product.name}"`,
          product.barcode || '',
          `"${product.description || ''}"`,
          outletStock.stock || 0,
          outletStock.renting || 0,
          outletStock.available || 0,
          product.rentPrice,
          product.deposit,
          outletStock.outlet.id,
          product.createdAt,
          product.updatedAt
        ]];
      } else {
        // If no specific outlet, create one row per outlet
        return product.outletStock.map((outletStock: any) => [
          product.id,
          `"${product.name}"`,
          product.barcode || '',
          `"${product.description || ''}"`,
          outletStock.stock || 0,
          outletStock.renting || 0,
          outletStock.available || 0,
          product.rentPrice,
          product.deposit,
          outletStock.outlet.id,
          product.createdAt,
          product.updatedAt
        ]);
      }
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.join(','))
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting products:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
