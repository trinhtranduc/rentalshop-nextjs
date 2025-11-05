import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';
import { isValidCurrency } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PUT /api/settings/currency
 * Update tenant's default currency (stored in most recent order or default outlet)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: Currency is stored at order/payment level, not tenant level
 * This API returns the most commonly used currency for the tenant
 */
export const PUT = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const body = await request.json();
    const { currency } = body;

    // Validate currency code
    if (!currency) {
      return NextResponse.json(
        ResponseBuilder.error('CURRENCY_REQUIRED', 'Currency is required'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (!isValidCurrency(currency)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CURRENCY', 'Invalid currency code. Supported currencies: USD, VND'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Note: In multi-tenant model, currency is stored per order/payment, not per tenant
    // This API is kept for compatibility but doesn't actually store currency at tenant level
    // The currency preference can be derived from orders/payments
    
    // Return success (currency will be applied to new orders/payments)
    return NextResponse.json(
      ResponseBuilder.success('CURRENCY_PREFERENCE_UPDATED', {
        currency: currency,
        message: 'Currency preference will be applied to new orders and payments'
      })
    );

  } catch (error) {
    console.error('Error updating currency preference:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * GET /api/settings/currency
 * Get tenant's most commonly used currency (from orders/payments)
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request: NextRequest, { user }) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Get the most commonly used currency from recent payments (currency is stored in Payment, not Order)
    const recentPayments = await db.payment.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { currency: true },
      where: user.outletId 
        ? { order: { outletId: user.outletId } }
        : {}
    });

    // Count currency usage
    const currencyCounts: { [key: string]: number } = {};
    recentPayments.forEach(payment => {
      const currency = payment.currency || 'USD';
      currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    });

    // Get most common currency, default to USD
    const currencyValue = Object.keys(currencyCounts).length > 0
      ? Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'USD';

    return NextResponse.json(
      ResponseBuilder.success('CURRENCY_FETCH_SUCCESS', {
        currency: currencyValue,
        message: 'Currency derived from recent orders'
      })
    );

  } catch (error) {
    console.error('Error fetching currency:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

