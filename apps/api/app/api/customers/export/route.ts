import { NextResponse } from 'next/server';
import { withCustomerExportAuth } from '@rentalshop/auth/server';
import { handleApiError } from '@rentalshop/utils';
import {
  buildCustomersExportResponse,
  parseCustomersExportBody,
} from '@/lib/customers-export';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/export
 * Export customers to Excel or CSV (Admin, Merchant, Outlet Admin only)
 * OUTLET_STAFF cannot export customers
 * 
 * Query parameters:
 * - format: 'excel' (default) or 'csv'
 * - period: '1month' | '3months' | '6months' | '1year' | 'custom'
 * - startDate: ISO string (required for custom period)
 * - endDate: ISO string (required for custom period)
 * - merchantId: number (ADMIN only)
 * - customerIds: repeated, the selected customers (skips the period filter).
 *   A long selection does not fit in a URL: use POST (#1361).
 */
export const GET = withCustomerExportAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized to export customers
    // Only ADMIN, MERCHANT, OUTLET_ADMIN can export
    // OUTLET_STAFF will automatically get 403 Forbidden
    const { userScope, request } = authorizedRequest;

    const { searchParams } = new URL(request.url);
    const customerIds = searchParams
      .getAll('customerIds')
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));

    return await buildCustomersExportResponse(userScope, {
      format: searchParams.get('format') || 'excel', // Default to Excel
      period: searchParams.get('period'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      merchantId: searchParams.get('merchantId'),
      customerIds,
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/customers/export (#1361)
 * Same file as GET, with the options in a JSON body so that thousands of selected customers fit in the request.
 * Roles: ADMIN, MERCHANT, OUTLET_ADMIN (`customers.export`); OUTLET_STAFF gets 403. Scope is the caller's own
 * shop / outlet; ids outside it are skipped.
 *
 * Body: { customerIds?: number[] (max 5000), format?: 'excel' | 'csv', period?, startDate?, endDate?, merchantId? }
 * Without customerIds a period (or dates) is required, else 400 INVALID_INPUT.
 */
export const POST = withCustomerExportAuth(async (authorizedRequest) => {
  try {
    const { userScope, request } = authorizedRequest;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }

    const parsed = parseCustomersExportBody(body);
    if ('response' in parsed) return parsed.response;

    return await buildCustomersExportResponse(userScope, parsed.options);
  } catch (error) {
    console.error('Error exporting customers:', error);

    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
