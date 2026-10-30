/**
 * Customers export (Excel / CSV), shared by `GET` and `POST /api/customers/export` (#1361).
 * `GET` reads its options from the query (installed apps, period exports); `POST` reads them from a JSON body so
 * a long selection of customer ids does not travel in the URL. Both build the same file here.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import {
  ResponseBuilder,
  parseDateRangeFromQuery,
  createExcelWorkbook,
  formatDateForExcel,
  generateExcelFilename,
  formatDateKeyInTimeZone,
  SHOP_TIMEZONE,
  type ExcelColumn,
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/** Most customer ids one `POST` may carry */
export const MAX_EXPORT_CUSTOMER_IDS = 5000;

/** Customers loaded per export, as `GET` always did (ids and period are filtered in memory after the load) */
const EXPORT_LOAD_LIMIT = 10000;

export interface CustomersExportOptions {
  /** `'csv'` gives CSV; anything else gives Excel */
  format: string;
  period: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Only used when the caller has no shop of its own (ADMIN / OPS) */
  merchantId: number | string | null;
  /** Selected customers; when not empty the period does not filter */
  customerIds: number[];
}

const PERIODS = ['1month', '3months', '6months', '1year', 'custom'] as const;

/** Body of `POST /api/customers/export` */
export const customersExportBodySchema = z.object({
  customerIds: z.array(z.number().int().positive()).max(MAX_EXPORT_CUSTOMER_IDS).optional(),
  format: z.enum(['excel', 'csv']).optional(),
  period: z.enum(PERIODS).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  merchantId: z.number().int().positive().optional(),
});

const invalidInput = (message: string) =>
  NextResponse.json({ ...ResponseBuilder.error('INVALID_INPUT'), message }, { status: 400 });

/** Options of a `POST` body, or the 400 response to send */
export function parseCustomersExportBody(
  body: unknown
): { options: CustomersExportOptions } | { response: NextResponse } {
  const parsed = customersExportBodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    return { response: invalidInput(message) };
  }
  const { customerIds = [], format, period, startDate, endDate, merchantId } = parsed.data;
  if (customerIds.length === 0 && !period && !startDate && !endDate) {
    return { response: invalidInput('customerIds or a period (period, startDate, endDate) is required') };
  }
  return {
    options: {
      format: format ?? 'excel',
      period: period ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      merchantId: merchantId ?? null,
      customerIds,
    },
  };
}

export async function buildCustomersExportResponse(
  userScope: { merchantId?: number | null; outletId?: number | null },
  options: CustomersExportOptions
): Promise<NextResponse> {
  const { format, period, startDate: startDateParam, endDate: endDateParam, merchantId: merchantIdParam, customerIds } = options;

  // Parse and validate date range
  const dateRangeResult = parseDateRangeFromQuery(period, startDateParam, endDateParam);
  if ('error' in dateRangeResult) {
    return invalidInput(dateRangeResult.error);
  }

  const { startDate, endDate } = dateRangeResult;

  // Build search filters based on user scope
  const filters: any = {
    limit: EXPORT_LOAD_LIMIT, // Large limit for export
    offset: 0,
    sortBy: 'firstName',
    sortOrder: 'asc'
  };

  // Apply scope restrictions
  // ADMIN may optionally pass merchantId to export one merchant's customers
  if (userScope.merchantId) {
    filters.merchantId = userScope.merchantId;
  } else if (merchantIdParam !== null && merchantIdParam !== undefined) {
    const merchantId = parseInt(String(merchantIdParam), 10);
    if (!Number.isNaN(merchantId)) {
      filters.merchantId = merchantId;
    }
  }
  if (userScope.outletId) {
    filters.outletId = userScope.outletId;
  }

  // Get customers
  const result = await db.customers.search(filters);
  let customers = result.data || [];

  // Optionally filter by selected IDs (selection export — skip date filter)
  const hasSelection = customerIds.length > 0;

  if (hasSelection) {
    const selected = new Set(customerIds);
    customers = customers.filter((customer: any) => selected.has(customer.id));
  } else {
    // Filter by date range (createdAt) only when exporting by period
    customers = customers.filter((customer: any) => {
      if (!customer.createdAt) return false;
      const createdAt = new Date(customer.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }

  const includeMerchant = !userScope.merchantId;

  // Prepare data for export (exclude system IDs)
  const exportData = customers.map((customer: any) => ({
    ...(includeMerchant ? { merchantName: customer.merchant?.name || '' } : {}),
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
      ...(includeMerchant ? [{ header: 'Merchant', key: 'merchantName', width: 25 }] : []),
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
    ...(includeMerchant ? ['Merchant'] : []),
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
    ...(includeMerchant ? [`"${customer.merchantName || ''}"`] : []),
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
      'Content-Disposition': `attachment; filename="customers-export-${formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE)}.csv"`,
      'Cache-Control': 'no-cache'
    }
  });
}
