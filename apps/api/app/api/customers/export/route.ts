import { NextRequest, NextResponse } from 'next/server';
import { withCustomerExportAuth } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  parseDateRangeFromQuery,
  createExcelWorkbook,
  formatDateForExcel,
  generateExcelFilename,
  type ExcelColumn
} from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/export
 * Export customers to Excel or CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export customers
 * 
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate: ISO string (required for custom period)
 * - endDate: ISO string (required for custom period)
 */
export const GET = withCustomerExportAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to export customers
    // Only ADMIN, MERCHANT, OUTLET_ADMIN can export
    // OUTLET_STAFF will automatically get 403 Forbidden
    const { user, userScope, request } = authorizedRequest;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // Default to Excel
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Parse and validate date range
    const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
    if ('error' in dateRangeResult) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_INPUT'),
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRangeResult;

    // Build search filters based on user scope
    const filters: any = {
      limit: 10000, // Large limit for export
      offset: 0,
      sortBy: 'firstName',
      sortOrder: 'asc'
    };

    // Apply scope restrictions
    if (userScope.merchantId) {
      filters.merchantId = userScope.merchantId;
    }
    if (userScope.outletId) {
      filters.outletId = userScope.outletId;
    }

    // Get customers
    const result = await db.customers.search(filters);
    let customers = result.data || [];

    // Filter by date range (createdAt)
    customers = customers.filter((customer: any) => {
      if (!customer.createdAt) return false;
      const createdAt = new Date(customer.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Prepare data for export (exclude system IDs)
    const exportData = customers.map((customer: any) => ({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      zipCode: customer.zipCode || '',
      idType: customer.idType || '',
      idNumber: customer.idNumber || '',
      isActive: customer.isActive ? 'Yes' : 'No',
      createdAt: formatDateForExcel(customer.createdAt),
      updatedAt: formatDateForExcel(customer.updatedAt)
    }));

    // Excel export
    if (format === 'excel') {
      const columns: ExcelColumn[] = [
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'Zip Code', key: 'zipCode', width: 10 },
        { header: 'ID Type', key: 'idType', width: 15 },
        { header: 'ID Number', key: 'idNumber', width: 15 },
        { header: 'Is Active', key: 'isActive', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 }
      ];

      const buffer = createExcelWorkbook(exportData, columns, 'Customers');
      const filename = generateExcelFilename('customers', startDate, endDate);

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
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Country',
      'Zip Code',
      'ID Type',
      'ID Number',
      'Is Active',
      'Created At',
      'Updated At'
    ];

    const csvRows = exportData.map((customer: any) => [
      `"${customer.firstName}"`,
      `"${customer.lastName}"`,
      `"${customer.email}"`,
      `"${customer.phone}"`,
      `"${customer.address}"`,
      `"${customer.city}"`,
      `"${customer.state}"`,
      `"${customer.country}"`,
      `"${customer.zipCode}"`,
      `"${customer.idType}"`,
      `"${customer.idNumber}"`,
      customer.isActive,
      customer.createdAt,
      customer.updatedAt
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
        'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
