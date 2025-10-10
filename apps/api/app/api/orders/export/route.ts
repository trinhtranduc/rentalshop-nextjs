import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/orders/export
 * Export orders to CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export orders
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  try {
    // User is already authenticated and authorized to export orders
    // Only ADMIN, MERCHANT, OUTLET_ADMIN can export
    // OUTLET_STAFF will automatically get 403 Forbidden
    // user and userScope are now available directly

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');

    // Build search filters based on user scope
    const filters: any = {
      limit,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    // Apply scope restrictions
    if (userScope.merchantId) {
      filters.merchantId = userScope.merchantId;
    }
    if (userScope.outletId) {
      filters.outletId = userScope.outletId;
    }

    // Apply additional filters
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;

    // Get orders
    const result = await db.orders.search(filters);
    const orders = result.data;

    // Convert to CSV
    const csvHeaders = [
      'Order ID',
      'Order Number',
      'Order Type',
      'Status',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Outlet ID',
      'Total Amount',
      'Deposit Amount',
      'Pickup Plan Date',
      'Return Plan Date',
      'Picked Up Date',
      'Returned Date',
      'Created At',
      'Updated At'
    ];

    const csvRows = orders.map((order: any) => [
      order.id,
      `"${order.orderNumber}"`,
      order.orderType,
      order.status,
      `"${order.customer?.firstName || ''} ${order.customer?.lastName || ''}"`,
      `"${order.customer?.email || ''}"`,
      `"${order.customer?.phone || ''}"`,
      order.outlet.id,
      order.totalAmount,
      order.depositAmount,
      order.pickupPlanAt || '',
      order.returnPlanAt || '',
      order.pickedUpAt || '',
      order.returnedAt || '',
      order.createdAt,
      order.updatedAt
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
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting orders:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
