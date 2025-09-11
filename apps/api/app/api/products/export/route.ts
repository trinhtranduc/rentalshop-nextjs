import { NextRequest, NextResponse } from 'next/server';
import { withProductExportAuth } from '@rentalshop/auth';
import { searchProducts } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products/export
 * Export products to CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export products
 */
export const GET = withProductExportAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to export products
    // Only ADMIN, MERCHANT, OUTLET_ADMIN can export
    // OUTLET_STAFF will automatically get 403 Forbidden
    const { user, userScope, request } = authorizedRequest;

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
    const result = await searchProducts(filters);
    const products = result.data.products;

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

    const csvRows = products.map(product => [
      product.id,
      `"${product.name}"`,
      product.barcode || '',
      `"${product.description || ''}"`,
      product.stock,
      product.renting,
      product.available,
      product.rentPrice,
      product.deposit,
      product.outletId,
      product.createdAt,
      product.updatedAt
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
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
    return NextResponse.json(
      { success: false, message: 'Failed to export products' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
