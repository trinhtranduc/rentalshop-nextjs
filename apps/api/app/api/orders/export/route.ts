import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders/export
 * Export orders to CSV (Admin, Merchant, Outlet Admin only)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * OUTLET_STAFF cannot export orders
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user }) => {
  try {
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');

    // Build where clause - NO merchantId needed
    const where: any = {};
    if (user.role === 'OUTLET_ADMIN') {
      where.outletId = user.outletId;
    }
    
    // Apply additional filters
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    // Get orders
    const orders = await db.order.findMany({
      where,
      include: {
        customer: true,
        outlet: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

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
