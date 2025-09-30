import { NextRequest, NextResponse } from 'next/server';
import { withCustomerExportAuth } from '@rentalshop/auth';
import { searchCustomers } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/export
 * Export customers to CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export customers
 */
export const GET = withCustomerExportAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to export customers
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
    const result = await searchCustomers(filters);
    const customers = result.data.customers;

    // Convert to CSV
    const csvHeaders = [
      'ID',
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

    const csvRows = customers.map(customer => [
      customer.id,
      `"${customer.firstName}"`,
      `"${customer.lastName}"`,
      `"${customer.email}"`,
      `"${customer.phone || ''}"`,
      `"${customer.address || ''}"`,
      `"${customer.city || ''}"`,
      `"${customer.state || ''}"`,
      `"${customer.country || ''}"`,
      `"${customer.zipCode || ''}"`,
      `"${customer.idType || ''}"`,
      `"${customer.idNumber || ''}"`,
      customer.isActive ? 'Yes' : 'No',
      customer.createdAt,
      customer.updatedAt
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
        'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export customers' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
