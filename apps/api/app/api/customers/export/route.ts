import { NextRequest, NextResponse } from 'next/server';
import { withCustomerExportAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { handleApiError } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/customers/export
 * Export customers to CSV (Admin, Merchant, Outlet Admin only)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * OUTLET_STAFF cannot export customers
 */
export const GET = withCustomerExportAuth(async (authorizedRequest) => {
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

    // Get customers (NO merchantId needed)
    const customers = await db.customer.findMany({
      orderBy: { firstName: 'asc' },
      take: limit,
      skip: offset
    });

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

    const csvRows = customers.map((customer: any) => [
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
