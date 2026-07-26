import { NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
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
import { API, USER_ROLE } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/merchants/export
 * Export merchants to Excel or CSV (Super Admin only)
 *
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate / endDate: ISO strings (required for custom period)
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (request) => {
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

    const result = await db.merchants.search({
      limit: 10000,
      page: 1,
    });
    let merchants = result.data || [];

    const merchantIds = searchParams
      .getAll('merchantIds')
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
    const hasSelection = merchantIds.length > 0;

    if (hasSelection) {
      merchants = merchants.filter((merchant: any) => merchantIds.includes(merchant.id));
    } else {
      merchants = merchants.filter((merchant: any) => {
        if (!merchant.createdAt) return false;
        const createdAt = new Date(merchant.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    const exportData = merchants.map((merchant: any) => ({
      name: merchant.name || '',
      email: merchant.email || '',
      phone: merchant.phone || '',
      city: merchant.city || '',
      country: merchant.country || '',
      businessType: merchant.businessType || '',
      plan: merchant.subscription?.plan?.name || '',
      subscriptionStatus: merchant.subscription?.status || '',
      isActive: merchant.isActive ? 'Yes' : 'No',
      outlets: merchant._count?.outlets ?? 0,
      users: merchant._count?.users ?? 0,
      products: merchant._count?.products ?? 0,
      customers: merchant._count?.customers ?? 0,
      orders: merchant._count?.orders ?? 0,
      createdAt: formatDateForExcel(merchant.createdAt),
      updatedAt: formatDateForExcel(merchant.updatedAt),
    }));

    if (format === 'excel') {
      const columns: ExcelColumn[] = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'Business Type', key: 'businessType', width: 15 },
        { header: 'Plan', key: 'plan', width: 15 },
        { header: 'Subscription Status', key: 'subscriptionStatus', width: 18 },
        { header: 'Is Active', key: 'isActive', width: 10 },
        { header: 'Outlets', key: 'outlets', width: 10 },
        { header: 'Users', key: 'users', width: 10 },
        { header: 'Products', key: 'products', width: 10 },
        { header: 'Customers', key: 'customers', width: 10 },
        { header: 'Orders', key: 'orders', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 },
      ];

      const buffer = createExcelWorkbook(exportData, columns, 'Merchants');
      const filename = generateExcelFilename('merchants', startDate, endDate);

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
      'Name',
      'Email',
      'Phone',
      'City',
      'Country',
      'Business Type',
      'Plan',
      'Subscription Status',
      'Is Active',
      'Outlets',
      'Users',
      'Products',
      'Customers',
      'Orders',
      'Created At',
      'Updated At',
    ];

    const csvRows = exportData.map((merchant: any) => [
      `"${merchant.name}"`,
      `"${merchant.email}"`,
      `"${merchant.phone}"`,
      `"${merchant.city}"`,
      `"${merchant.country}"`,
      `"${merchant.businessType}"`,
      `"${merchant.plan}"`,
      `"${merchant.subscriptionStatus}"`,
      merchant.isActive,
      merchant.outlets,
      merchant.users,
      merchant.products,
      merchant.customers,
      merchant.orders,
      merchant.createdAt,
      merchant.updatedAt,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="merchants-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error exporting merchants:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
