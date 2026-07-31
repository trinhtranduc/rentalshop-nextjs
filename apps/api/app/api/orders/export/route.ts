import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import {
  handleApiError,
  ResponseBuilder,
  parseDateRangeFromQuery,
  createExcelWorkbook,
  formatDateForExcel,
  formatFullName,
  generateExcelFilename,
  type ExcelColumn,
} from '@rentalshop/utils';
import { API, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '@rentalshop/constants';

/**
 * GET /api/orders/export
 * Export orders to Excel or CSV
 *
 * Column layout matches the merchant order spreadsheet:
 * Mã đơn hàng | NV tạo đơn | Ngày thuê | Ngày lấy | Ngày trả | Cọc | Tổng đơn |
 * Giảm giá | Loại giảm | Số điện thoại KH | Tên khách | Tiền đền bù |
 * Cọc giấy tờ | Trạng thái đơn | Ghi chú
 *
 * Authorization: roles with 'orders.export' (ADMIN, MERCHANT, OUTLET_ADMIN).
 *
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate / endDate: ISO string (required for custom period)
 * - status / orderType: optional filters
 * - dateField: 'createdAt' (default) | 'pickupPlanAt' | 'returnPlanAt'
 */

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  AMOUNT: 'Số tiền',
  FIXED: 'Số tiền',
  PERCENT: '%',
  PERCENTAGE: '%',
};

function formatExportMoney(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Number.isInteger(value) ? value : Number(Number(value).toFixed(2));
}

function formatDiscountType(raw: string | null | undefined): string {
  if (!raw) return '';
  return DISCOUNT_TYPE_LABELS[raw.toUpperCase()] || raw;
}

function formatOrderStatusLabel(orderType: string | null | undefined, status: string | null | undefined): string {
  // Spreadsheet samples use type-oriented labels for sales ("Sales Order").
  // Rental rows show Vietnamese status so staff can see lifecycle state.
  if ((orderType || '').toUpperCase() === 'SALE') {
    return 'Sales Order';
  }
  if (status && status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS];
  }
  if (orderType && orderType in ORDER_TYPE_LABELS) {
    return ORDER_TYPE_LABELS[orderType as keyof typeof ORDER_TYPE_LABELS];
  }
  return status || orderType || '';
}

function formatCollateral(type: string | null | undefined, details: string | null | undefined): string {
  const parts = [type, details]
    .map((v) => (v || '').trim())
    .filter(Boolean);
  // Prefer type alone when it already encodes the value (e.g. "cccd")
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0];
  return parts.join(' - ');
}

function formatPhoneForExport(phone: string | null | undefined): string {
  // Keep leading zeros as text for Excel.
  const value = (phone || '').trim();
  return value;
}

export const GET = withPermissions(['orders.export'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const dateField = searchParams.get('dateField') || 'createdAt';

    const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
    if ('error' in dateRangeResult) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_RANGE'),
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRangeResult;

    const where: any = {};

    if (userScope.merchantId) {
      where.outlet = { merchantId: userScope.merchantId };
    }
    if (userScope.outletId) {
      where.outletId = userScope.outletId;
    }

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    if (dateField === 'createdAt') {
      where.createdAt = { gte: startDate, lte: endDate };
    } else if (dateField === 'pickupPlanAt') {
      where.pickupPlanAt = { gte: startDate, lte: endDate };
    } else if (dateField === 'returnPlanAt') {
      where.returnPlanAt = { gte: startDate, lte: endDate };
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        damageFee: true,
        discountType: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        collateralType: true,
        collateralDetails: true,
        notes: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const exportData = orders.map((order: any) => {
      const rentalDate = order.createdAt;
      const pickupDate = order.pickedUpAt || order.pickupPlanAt;
      const returnDate = order.returnedAt || order.returnPlanAt;

      return {
        orderNumber: order.orderNumber || '',
        createdByName:
          formatFullName(order.createdBy?.firstName, order.createdBy?.lastName) ||
          order.createdBy?.email ||
          '',
        rentalDate: formatDateForExcel(rentalDate, 'datetime-short'),
        pickupDate: formatDateForExcel(pickupDate, 'datetime-short'),
        returnDate: formatDateForExcel(returnDate, 'datetime-short'),
        depositAmount: formatExportMoney(order.depositAmount),
        totalAmount: formatExportMoney(order.totalAmount),
        discountAmount: formatExportMoney(order.discountAmount),
        discountType: formatDiscountType(order.discountType),
        customerPhone: formatPhoneForExport(order.customer?.phone),
        customerName: formatFullName(order.customer?.firstName, order.customer?.lastName) || '',
        damageFee: formatExportMoney(order.damageFee),
        collateral: formatCollateral(order.collateralType, order.collateralDetails),
        orderStatus: formatOrderStatusLabel(order.orderType, order.status),
        notes: order.notes || '',
      };
    });

    const columns: ExcelColumn[] = [
      { header: 'Mã đơn hàng', key: 'orderNumber', width: 16 },
      { header: 'NV tạo đơn', key: 'createdByName', width: 22 },
      { header: 'Ngày thuê', key: 'rentalDate', width: 20 },
      { header: 'Ngày lấy', key: 'pickupDate', width: 20 },
      { header: 'Ngày trả', key: 'returnDate', width: 20 },
      { header: 'Cọc', key: 'depositAmount', width: 12 },
      { header: 'Tổng đơn', key: 'totalAmount', width: 12 },
      { header: 'Giảm giá', key: 'discountAmount', width: 12 },
      { header: 'Loại giảm', key: 'discountType', width: 12 },
      { header: 'Số điện thoại KH', key: 'customerPhone', width: 16 },
      { header: 'Tên khách', key: 'customerName', width: 22 },
      { header: 'Tiền đền bù', key: 'damageFee', width: 12 },
      { header: 'Cọc giấy tờ', key: 'collateral', width: 16 },
      { header: 'Trạng thái đơn', key: 'orderStatus', width: 16 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
    ];

    if (format === 'excel') {
      const buffer = createExcelWorkbook(exportData, columns, 'Orders');
      const filename = generateExcelFilename('orders', startDate, endDate);

      return new NextResponse(buffer as any, {
        status: API.STATUS.OK,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // CSV (same columns / Vietnamese headers)
    const csvHeaders = columns.map((col) => col.header);
    const csvRows = exportData.map((order: any) =>
      columns.map((col) => {
        const value = order[col.key];
        if (typeof value === 'number') return String(value);
        const text = String(value ?? '');
        return `"${text.replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [csvHeaders.join(','), ...csvRows.map((row: string[]) => row.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
