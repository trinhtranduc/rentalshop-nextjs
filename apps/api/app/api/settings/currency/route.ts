import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, withAnyAuth } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { isValidCurrency } from '@rentalshop/constants';
import type { CurrencyCode } from '@rentalshop/types';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * PUT /api/settings/currency
 * Update merchant's currency settings
 * Only accessible by users with merchant.view permission (ADMIN, MERCHANT)
 */
export const PUT = withApiLogging(
  withPermissions(['merchant.view'])(async (request: NextRequest, { user, userScope }) => {
    try {

    const body = await request.json();
    const { currency } = body;

    // Validate currency code
    if (!currency) {
      return NextResponse.json(
        ResponseBuilder.error('CURRENCY_REQUIRED'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (!isValidCurrency(currency)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CURRENCY'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Get the merchant ID from the authenticated user
    const dbUser = await db.users.findById(user.id);

    if (!dbUser || !dbUser.merchant) {
      return NextResponse.json(
        ResponseBuilder.error('NO_MERCHANT_ACCESS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Update merchant currency using the centralized database function
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, {
      currency: currency
    });

    return NextResponse.json(
      ResponseBuilder.success('CURRENCY_UPDATED_SUCCESS', {
        id: updatedMerchant.id,
        currency: currency,
        name: updatedMerchant.name
      })
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

/**
 * GET /api/settings/currency
 * Get merchant's current currency settings
 * Only accessible by users with MERCHANT role or ADMIN
 */
export const GET = withApiLogging(
  withAnyAuth(async (request: NextRequest, { user, userScope }) => {
    try {

    // Get the merchant ID from the authenticated user
    const dbUser = await db.users.findById(user.id);

    if (!dbUser || !dbUser.merchant) {
      return NextResponse.json(
        ResponseBuilder.error('NO_MERCHANT_ACCESS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get merchant with full details using db
    const merchant = await db.merchants.findById(dbUser.merchant.id);
    
    const currencyValue = (merchant as any)?.currency || 'USD';
    return NextResponse.json({
      success: true,
      data: {
        currency: currencyValue,
        merchantId: dbUser.merchant.id,
        merchantName: dbUser.merchant.name
      }
    });

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

