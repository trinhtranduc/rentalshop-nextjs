import { NextRequest, NextResponse } from 'next/server';
import { withOrderExportAuth } from '@rentalshop/auth';
import { searchOrders } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/orders/export
 * Export orders to CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export orders
 */
export const GET = withOrderExportAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to export orders
    // Only ADMIN, MERCHANT, OUTLET_ADMIN can export
    // OUTLET_STAFF will automatically get 403 Forbidden
    const { user, userScope, request } = authorizedRequest;

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
    const result = await searchOrders(filters);
    const orders = result.data.orders;

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

    const csvRows = orders.map(order => [
      order.id,
      `"${order.orderNumber}"`,
      order.orderType,
      order.status,
      `"${order.customer?.firstName || ''} ${order.customer?.lastName || ''}"`,
      `"${order.customer?.email || ''}"`,
      `"${order.customer?.phone || ''}"`,
      order.outletId,
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
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export orders' },
      { status: 500 }
    );
  }
});
