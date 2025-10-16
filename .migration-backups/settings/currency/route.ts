import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { isValidCurrency } from '@rentalshop/constants';
import type { CurrencyCode } from '@rentalshop/types';

/**
 * PUT /api/settings/currency
 * Update merchant's currency settings
 * Only accessible by users with MERCHANT role or ADMIN
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 CURRENCY API: PUT /api/settings/currency called');
    console.log('🔍 CURRENCY API: User:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: userScope.merchantId
    });

    const body = await request.json();
    const { currency } = body;

    // Validate currency code
    if (!currency) {
      return NextResponse.json(
        { success: false, error: 'Currency is required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (!isValidCurrency(currency)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid currency code. Supported currencies: USD, VND' 
        },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Get the merchant ID from the authenticated user
    console.log('🔍 CURRENCY API: Looking up user in database with id:', user.id);
    const dbUser = await db.users.findById(user.id);

    console.log('🔍 CURRENCY API: Database query result:', {
      userFound: !!dbUser,
      hasMerchant: !!(dbUser?.merchant),
      merchantId: dbUser?.merchant?.id
    });

    if (!dbUser || !dbUser.merchant) {
      console.log('🔍 CURRENCY API: User or merchant not found, returning 403');
      return NextResponse.json(
        { success: false, error: 'User does not have merchant access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Update merchant currency using the centralized database function
    console.log('🔍 CURRENCY API: Calling updateMerchant with id:', dbUser.merchant.id);
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, {
      currency: currency
    });

    console.log('🔍 CURRENCY API: Update successful, new currency:', currency);
    return NextResponse.json({
      success: true,
      message: 'Currency updated successfully',
      data: {
        id: updatedMerchant.id,
        currency: currency,
        name: updatedMerchant.name
      }
    });

  } catch (error) {
    console.error('🔍 CURRENCY API: Error updating currency:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * GET /api/settings/currency
 * Get merchant's current currency settings
 * Only accessible by users with MERCHANT role or ADMIN
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 CURRENCY API: GET /api/settings/currency called');
    console.log('🔍 CURRENCY API: User:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: userScope.merchantId
    });

    // Get the merchant ID from the authenticated user
    const dbUser = await db.users.findById(user.id);

    if (!dbUser || !dbUser.merchant) {
      return NextResponse.json(
        { success: false, error: 'User does not have merchant access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get merchant with full details using db
    const merchant = await db.merchants.findById(dbUser.merchant.id);
    
    const currencyValue = (merchant as any)?.currency || 'USD';
    console.log('🔍 CURRENCY API: Returning currency:', currencyValue);
    return NextResponse.json({
      success: true,
      data: {
        currency: currencyValue,
        merchantId: dbUser.merchant.id,
        merchantName: dbUser.merchant.name
      }
    });

  } catch (error) {
    console.error('🔍 CURRENCY API: Error fetching currency:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

