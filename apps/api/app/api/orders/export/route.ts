import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
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
 * GET /api/orders/export
 * Export orders to Excel or CSV
 * 
 * Authorization: All roles with 'orders.export' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot export (does not have 'orders.export' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate: ISO string (required for custom period)
 * - endDate: ISO string (required for custom period)
 * - status: Order status filter (optional)
 * - orderType: Order type filter (optional)
 * - dateField: 'createdAt' (default) | 'pickupPlanAt' | 'returnPlanAt'
 */
export const GET = withPermissions(['orders.export'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel'; // Default to Excel
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const dateField = searchParams.get('dateField') || 'createdAt'; // Default to createdAt

    // Parse and validate date range
    const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
    if ('error' in dateRangeResult) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_RANGE', dateRangeResult.error),
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRangeResult;

    // Build where clause for Prisma query
    const where: any = {};

    // Apply scope restrictions
    if (userScope.merchantId) {
      where.outlet = { merchantId: userScope.merchantId };
    }
    if (userScope.outletId) {
      where.outletId = userScope.outletId;
    }

    // Apply additional filters
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    
    // Apply date range filter
    if (dateField === 'createdAt') {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    } else if (dateField === 'pickupPlanAt') {
      where.pickupPlanAt = {
        gte: startDate,
        lte: endDate
      };
    } else if (dateField === 'returnPlanAt') {
      where.returnPlanAt = {
        gte: startDate,
        lte: endDate
      };
    }

    // Get orders with all required fields
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10000 // Large limit for export
    });

    // Prepare data for export
    const exportData = orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber || '',
      orderType: order.orderType || '',
      status: order.status || '',
      customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
      customerEmail: order.customer?.email || '',
      customerPhone: order.customer?.phone || '',
      outletId: order.outlet?.id || '',
      outletName: order.outlet?.name || '',
      outletAddress: order.outlet?.address || '',
      createdById: order.createdBy?.id || '',
      createdByName: `${order.createdBy?.firstName || ''} ${order.createdBy?.lastName || ''}`.trim() || order.createdBy?.email || '',
      createdByEmail: order.createdBy?.email || '',
      discountType: order.discountType || '',
      discountValue: formatNumberForExcel(order.discountValue || 0),
      discountAmount: formatNumberForExcel(order.discountAmount || 0),
      totalAmount: formatNumberForExcel(order.totalAmount),
      depositAmount: formatNumberForExcel(order.depositAmount),
      pickupPlanDate: formatDateForExcel(order.pickupPlanAt),
      returnPlanDate: formatDateForExcel(order.returnPlanAt),
      pickedUpDate: formatDateForExcel(order.pickedUpAt),
      returnedDate: formatDateForExcel(order.returnedAt),
      createdAt: formatDateForExcel(order.createdAt, 'datetime'),
      updatedAt: formatDateForExcel(order.updatedAt, 'datetime')
    }));

    // Excel export
    if (format === 'excel') {
      const columns: ExcelColumn[] = [
        { header: 'Order ID', key: 'id', width: 10 },
        { header: 'Order Number', key: 'orderNumber', width: 20 },
        { header: 'Order Type', key: 'orderType', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Customer Email', key: 'customerEmail', width: 25 },
        { header: 'Customer Phone', key: 'customerPhone', width: 15 },
        { header: 'Outlet ID', key: 'outletId', width: 10 },
        { header: 'Outlet Name', key: 'outletName', width: 25 },
        { header: 'Outlet Address', key: 'outletAddress', width: 30 },
        { header: 'Created By ID', key: 'createdById', width: 12 },
        { header: 'Created By Name', key: 'createdByName', width: 25 },
        { header: 'Created By Email', key: 'createdByEmail', width: 25 },
        { header: 'Discount Type', key: 'discountType', width: 15 },
        { header: 'Discount Value', key: 'discountValue', width: 15 },
        { header: 'Discount Amount', key: 'discountAmount', width: 15 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Deposit Amount', key: 'depositAmount', width: 15 },
        { header: 'Pickup Plan Date', key: 'pickupPlanDate', width: 20 },
        { header: 'Return Plan Date', key: 'returnPlanDate', width: 20 },
        { header: 'Picked Up Date', key: 'pickedUpDate', width: 20 },
        { header: 'Returned Date', key: 'returnedDate', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 }
      ];

      const buffer = createExcelWorkbook(exportData, columns, 'Orders');
      const filename = generateExcelFilename('orders', startDate, endDate);

      return new NextResponse(buffer as any, {
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
      'Order ID',
      'Order Number',
      'Order Type',
      'Status',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Outlet ID',
      'Outlet Name',
      'Outlet Address',
      'Created By ID',
      'Created By Name',
      'Created By Email',
      'Discount Type',
      'Discount Value',
      'Discount Amount',
      'Total Amount',
      'Deposit Amount',
      'Pickup Plan Date',
      'Return Plan Date',
      'Picked Up Date',
      'Returned Date',
      'Created At',
      'Updated At'
    ];

    const csvRows = exportData.map((order: any) => [
      order.id,
      `"${order.orderNumber}"`,
      order.orderType,
      order.status,
      `"${order.customerName}"`,
      `"${order.customerEmail}"`,
      `"${order.customerPhone}"`,
      order.outletId,
      `"${order.outletName}"`,
      `"${order.outletAddress}"`,
      order.createdById,
      `"${order.createdByName}"`,
      `"${order.createdByEmail}"`,
      `"${order.discountType}"`,
      order.discountValue,
      order.discountAmount,
      order.totalAmount,
      order.depositAmount,
      order.pickupPlanDate,
      order.returnPlanDate,
      order.pickedUpDate,
      order.returnedDate,
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
