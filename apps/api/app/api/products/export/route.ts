import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products/export
 * Export products to CSV
 * 
 * Authorization: All roles with 'products.export' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot export (does not have 'products.export' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['products.export'])(async (request, { user, userScope }) => {
  try {

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build search filters based on user scope
    const filters: any = {
      limit,
      offset,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    // Apply scope restrictions
    if (userScope.merchantId) {
      filters.merchantId = userScope.merchantId;
    }
    if (userScope.outletId) {
      filters.outletId = userScope.outletId;
    }

    // Get products
    const result = await db.products.search(filters);
    const products = result.data;

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
      if (userScope.outletId) {
        const outletStock = product.outletStock.find((os: any) => os.outlet.id === userScope.outletId);
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
