import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  parseDateRangeFromQuery,
  createExcelWorkbook,
  formatDateForExcel,
  formatNumberForExcel,
  generateExcelFilename,
  type ExcelColumn
} from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products/export
 * Export products to Excel or CSV
 * 
 * Authorization: All roles with 'products.export' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot export (does not have 'products.export' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate: ISO string (required for custom period)
 * - endDate: ISO string (required for custom period)
 */
export const GET = withPermissions(['products.export'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // Default to Excel
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Parse and validate date range
    const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
    if ('error' in dateRangeResult) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_RANGE', dateRangeResult.error),
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRangeResult;

    // Build search filters based on user scope
    const filters: any = {
      limit: 10000, // Large limit for export
      offset: 0,
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
    let products = result.data || [];

    // Filter by date range (createdAt)
    products = products.filter((product: any) => {
      if (!product.createdAt) return false;
      const createdAt = new Date(product.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Prepare data for export
    const exportData: any[] = [];
    
    products.forEach((product: any) => {
      // If filtering by specific outlet, only export that outlet's data
      if (userScope.outletId) {
        const outletStock = product.outletStock?.find((os: any) => os.outlet.id === userScope.outletId);
        if (!outletStock) return; // Skip products not in this outlet
        
        exportData.push({
          id: product.id,
          name: product.name || '',
          barcode: product.barcode || '',
          description: product.description || '',
          stock: outletStock.stock || 0,
          renting: outletStock.renting || 0,
          available: outletStock.available || 0,
          rentPrice: formatNumberForExcel(product.rentPrice),
          deposit: formatNumberForExcel(product.deposit),
          outletId: outletStock.outlet.id,
          createdAt: formatDateForExcel(product.createdAt),
          updatedAt: formatDateForExcel(product.updatedAt)
        });
      } else {
        // If no specific outlet, create one row per outlet
        product.outletStock?.forEach((outletStock: any) => {
          exportData.push({
            id: product.id,
            name: product.name || '',
            barcode: product.barcode || '',
            description: product.description || '',
            stock: outletStock.stock || 0,
            renting: outletStock.renting || 0,
            available: outletStock.available || 0,
            rentPrice: formatNumberForExcel(product.rentPrice),
            deposit: formatNumberForExcel(product.deposit),
            outletId: outletStock.outlet.id,
            createdAt: formatDateForExcel(product.createdAt),
            updatedAt: formatDateForExcel(product.updatedAt)
          });
        });
      }
    });

    // Excel export
    if (format === 'excel') {
      const columns: ExcelColumn[] = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Barcode', key: 'barcode', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Renting', key: 'renting', width: 10 },
        { header: 'Available', key: 'available', width: 10 },
        { header: 'Rent Price', key: 'rentPrice', width: 15 },
        { header: 'Deposit', key: 'deposit', width: 15 },
        { header: 'Outlet ID', key: 'outletId', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 }
      ];

      const buffer = createExcelWorkbook(exportData, columns, 'Products');
      const filename = generateExcelFilename('products', startDate, endDate);

      return new NextResponse(buffer, {
        status: API.STATUS.OK,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // CSV export (backward compatibility)
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

    const csvRows = exportData.map((product: any) => [
          product.id,
          `"${product.name}"`,
      product.barcode,
      `"${product.description}"`,
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
