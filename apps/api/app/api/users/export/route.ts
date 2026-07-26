import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
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
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/export
 * Export users to Excel or CSV
 *
 * Authorization: roles with 'users.view'
 * - ADMIN: all users (system-wide)
 * - MERCHANT / OUTLET_*: scoped by JWT userScope
 *
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate / endDate: ISO strings (required for custom period)
 * - merchantId: optional filter for ADMIN only
 */
export const GET = withPermissions(['users.view'])(async (request, { userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
    if ('error' in dateRangeResult) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_RANGE'),
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRangeResult;

    const filters: any = {
      limit: 10000,
      page: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const merchantIdParam = searchParams.get('merchantId');
    if (userScope.merchantId) {
      filters.merchantId = userScope.merchantId;
    } else if (merchantIdParam) {
      const merchantId = parseInt(merchantIdParam, 10);
      if (!Number.isNaN(merchantId)) {
        filters.merchantId = merchantId;
      }
    }
    if (userScope.outletId) {
      filters.outletId = userScope.outletId;
    }

    const result = await db.users.search(filters);
    let users = result.data || [];

    const userIds = searchParams
      .getAll('userIds')
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
    const hasSelection = userIds.length > 0;

    if (hasSelection) {
      users = users.filter((user: any) => userIds.includes(user.id));
    } else {
      users = users.filter((user: any) => {
        if (!user.createdAt) return false;
        const createdAt = new Date(user.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    const includeMerchant = !userScope.merchantId;

    const exportData = users.map((user: any) => ({
      ...(includeMerchant ? { merchantName: user.merchant?.name || '' } : {}),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || '',
      outletName: user.outlet?.name || '',
      isActive: user.isActive ? 'Yes' : 'No',
      lastLoginAt: formatDateForExcel(user.lastLoginAt),
      createdAt: formatDateForExcel(user.createdAt),
      updatedAt: formatDateForExcel(user.updatedAt),
    }));

    if (format === 'excel') {
      const columns: ExcelColumn[] = [
        ...(includeMerchant ? [{ header: 'Merchant', key: 'merchantName', width: 25 }] : []),
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Outlet', key: 'outletName', width: 20 },
        { header: 'Is Active', key: 'isActive', width: 10 },
        { header: 'Last Login', key: 'lastLoginAt', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 },
      ];

      const buffer = createExcelWorkbook(exportData, columns, 'Users');
      const filename = generateExcelFilename('users', startDate, endDate);

      return new NextResponse(buffer, {
        status: API.STATUS.OK,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    const csvHeaders = [
      ...(includeMerchant ? ['Merchant'] : []),
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Role',
      'Outlet',
      'Is Active',
      'Last Login',
      'Created At',
      'Updated At',
    ];

    const csvRows = exportData.map((user: any) => [
      ...(includeMerchant ? [`"${user.merchantName || ''}"`] : []),
      `"${user.firstName}"`,
      `"${user.lastName}"`,
      `"${user.email}"`,
      `"${user.phone}"`,
      `"${user.role}"`,
      `"${user.outletName}"`,
      user.isActive,
      user.lastLoginAt,
      user.createdAt,
      user.updatedAt,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
