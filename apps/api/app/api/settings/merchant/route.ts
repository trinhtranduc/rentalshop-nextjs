import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';
import { readOldAppsMode } from '../../../../lib/block-pricing-settings';
import { isValidTimeZone, merchantTimeZoneField, recordShopTimeZoneChange } from '../../../../lib/shop-timezone';
import { merchantDepositField } from '../../../../lib/installments';

/** #567 `timezone`: an IANA id that Intl accepts (Asia/Ho_Chi_Minh, Asia/Tokyo, America/New_York, …). */
const timezoneSchema = z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown time zone');

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * 
 * Authorization: Only roles with 'merchant.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT
 * - `allowOverlappingOrders` (#518, boolean): role MERCHANT or ADMIN only (403 INSUFFICIENT_PERMISSIONS
 *   otherwise). A body with only that field updates just the setting (no name required).
 * - `onlineBookingEnabled` (#1124, boolean "Nhận đặt online"): role MERCHANT or ADMIN only, like allowOverlappingOrders.
 * - `showPublicPrice` (#1174, boolean "Hiện giá trên trang shop"): role MERCHANT or ADMIN only, like onlineBookingEnabled.
 * - `blockPricing` (#1189, `{ oldApps: 'recompute' | 'block' }` "Với app cũ"): role MERCHANT only (403
 *   INSUFFICIENT_PERMISSIONS otherwise, ADMIN included). Stored in `Merchant.settings.blockPricing.oldApps`, merged into
 *   the other keys of `settings`; any other value is 400 INVALID_INPUT. A body with only that field updates just it.
 *   GET /api/users/profile returns it as `merchant.blockPricing` (additive).
 * - `timezone` (#567, IANA id): role MERCHANT only (ADMIN changes it via PUT /api/merchants/[id]; others
 *   403 INSUFFICIENT_PERMISSIONS). Unknown zone → 400 INVALID_TIMEZONE. A body with only the shop settings
 *   updates just those (no name required). A change is written to the audit log (entity Merchant).
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const PUT = withPermissions(['merchant.manage'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 MERCHANT API: PUT /api/settings/merchant called');
    console.log('🔍 MERCHANT API: Request method:', request.method);
    console.log('🔍 MERCHANT API: Request URL:', request.url);
    console.log('🔍 MERCHANT API: Request headers:', Object.fromEntries(request.headers.entries()));
    
    console.log('🔍 MERCHANT API: Authentication successful:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    console.log('🔍 MERCHANT API: Role check passed, proceeding with request');

    const body = await request.json();
    const { 
      name, 
      phone, 
      address, 
      city, 
      state, 
      zipCode, 
      country, 
      businessType, 
      taxId, 
      website, 
      description,
      tenantKey,
      allowOverlappingOrders,
      onlineBookingEnabled,
      showPublicPrice,
      timezone,
      blockPricing
    } = body;

    // #518 "Cho tạo đơn khi trùng lịch": boolean, and only the shop owner (or platform ADMIN) may change it,
    // even when a custom role was granted merchant.manage.
    if (allowOverlappingOrders !== undefined) {
      if (typeof allowOverlappingOrders !== 'boolean') {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }
      if (user.role !== USER_ROLE.MERCHANT && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // #1124 "Nhận đặt online": boolean, shop owner (or platform ADMIN) only
    if (onlineBookingEnabled !== undefined) {
      if (typeof onlineBookingEnabled !== 'boolean') {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }
      if (user.role !== USER_ROLE.MERCHANT && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // #1174 "Hiện giá trên trang shop": boolean, shop owner (or platform ADMIN) only
    if (showPublicPrice !== undefined) {
      if (typeof showPublicPrice !== 'boolean') {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }
      if (user.role !== USER_ROLE.MERCHANT && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // #1189 "Với app cũ": 'recompute' (server prices day-block lines for installed apps) or 'block'; shop owner only
    if (blockPricing !== undefined) {
      const mode = (blockPricing as { oldApps?: unknown } | null)?.oldApps;
      if (mode !== 'recompute' && mode !== 'block') {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }
      if (user.role !== USER_ROLE.MERCHANT) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // #567 shop time zone: a valid IANA id, and only the shop owner may change it here.
    if (timezone !== undefined) {
      if (!timezoneSchema.safeParse(timezone).success) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_TIMEZONE'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }
      if (user.role !== USER_ROLE.MERCHANT) {
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // A body carrying only shop settings (new apps' toggle, the time zone picker) updates just those fields;
    // every other body is the business-info form as before and still needs a name.
    const BUSINESS_FIELDS = ['name', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'businessType', 'taxId', 'website', 'description', 'tenantKey'];
    const settingOnly =
      (allowOverlappingOrders !== undefined || onlineBookingEnabled !== undefined || showPublicPrice !== undefined || timezone !== undefined || blockPricing !== undefined) &&
      BUSINESS_FIELDS.every((field) => body[field] === undefined);

    // Validate required fields
    if (!name && !settingOnly) {
      return NextResponse.json(
        ResponseBuilder.error('BUSINESS_NAME_REQUIRED'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Email field is disabled - users cannot change their email address
    // This ensures email uniqueness and prevents account hijacking

    // Get the merchant ID from the authenticated user
    console.log('🔍 MERCHANT API: Looking up user in database with id:', user.id);
    const dbUser = await db.users.findById(user.id);

    console.log('🔍 MERCHANT API: Database query result:', {
      userFound: !!dbUser,
      hasMerchant: !!(dbUser?.merchant),
      merchantId: dbUser?.merchant?.id,
      merchantPublicId: dbUser?.merchant?.id
    });

    if (!dbUser || !dbUser.merchant) {
      console.log('🔍 MERCHANT API: User or merchant not found, returning 403');
      return NextResponse.json(
        ResponseBuilder.error('NO_MERCHANT_ACCESS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Validate tenantKey if provided
    if (tenantKey !== undefined) {
      // Validate format: alphanumeric + hyphen only
      if (tenantKey && !/^[a-z0-9\-]+$/i.test(tenantKey)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_TENANT_KEY'),
          { status: API.STATUS.BAD_REQUEST }
        );
      }

      // Check if tenantKey is already taken by another merchant
      if (tenantKey) {
        const existingMerchant = await db.merchants.findByTenantKey(tenantKey);
        if (existingMerchant && existingMerchant.id !== dbUser.merchant.id) {
          return NextResponse.json(
            ResponseBuilder.error('TENANT_KEY_ALREADY_EXISTS'),
            { status: API.STATUS.CONFLICT }
          );
        }
      }
    }

    // Update merchant using the centralized database function
    console.log('🔍 MERCHANT API: Calling updateMerchant with id:', dbUser.merchant.id);
    const updateData: any = settingOnly
      ? {}
      : {
          name,
          phone,
          address,
          city,
          state,
          zipCode,
          country,
          businessType,
          taxId,
          website,
          description
        };
    if (allowOverlappingOrders !== undefined) {
      updateData.allowOverlappingOrders = allowOverlappingOrders;
    }
    if (onlineBookingEnabled !== undefined) {
      updateData.onlineBookingEnabled = onlineBookingEnabled;
    }
    if (showPublicPrice !== undefined) {
      updateData.showPublicPrice = showPublicPrice;
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }
    if (blockPricing !== undefined) {
      // Keep the other keys of `settings` (e.g. installments); only blockPricing.oldApps changes
      const stored = ((dbUser.merchant as { settings?: Record<string, unknown> | null }).settings ?? {}) as Record<string, unknown>;
      updateData.settings = {
        ...stored,
        blockPricing: { ...((stored.blockPricing as Record<string, unknown> | undefined) ?? {}), oldApps: (blockPricing as { oldApps: string }).oldApps },
      };
    }
    
    // Only include tenantKey if it's provided (allows clearing tenantKey by passing empty string)
    if (tenantKey !== undefined) {
      updateData.tenantKey = tenantKey || null;
    }
    
    const previousTimeZone = (dbUser.merchant as { timezone?: string | null }).timezone;
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, updateData);

    // #567: a zone change moves every day label of the shop; keep who changed it and when (Q2 decision).
    if (timezone !== undefined && timezone !== previousTimeZone) {
      await recordShopTimeZoneChange(request, user, dbUser.merchant.id, updatedMerchant?.name, previousTimeZone, timezone);
    }

    console.log('🔍 MERCHANT API: Update successful, returning response');
    return NextResponse.json(
      ResponseBuilder.success('MERCHANT_INFO_UPDATED_SUCCESS', {
        id: updatedMerchant.id,
        name: updatedMerchant.name,
        email: updatedMerchant.email,
        phone: updatedMerchant.phone,
        address: updatedMerchant.address,
        city: updatedMerchant.city,
        state: updatedMerchant.state,
        zipCode: updatedMerchant.zipCode,
        country: updatedMerchant.country,
        businessType: updatedMerchant.businessType,
        taxId: updatedMerchant.taxId,
        website: updatedMerchant.website,
        description: updatedMerchant.description,
        tenantKey: updatedMerchant.tenantKey,
        allowOverlappingOrders: (updatedMerchant as { allowOverlappingOrders?: boolean }).allowOverlappingOrders !== false,
        // #1124 additive; false when off or missing
        onlineBookingEnabled: (updatedMerchant as { onlineBookingEnabled?: boolean }).onlineBookingEnabled === true,
        showPublicPrice: (updatedMerchant as { showPublicPrice?: boolean }).showPublicPrice !== false,
        // #1189 additive; 'recompute' when unset
        blockPricing: { oldApps: readOldAppsMode((updatedMerchant as { settings?: unknown }).settings) },
        ...merchantTimeZoneField(updatedMerchant),
        ...merchantDepositField(updatedMerchant),
        isActive: updatedMerchant.isActive,
        planId: updatedMerchant.planId,
        subscriptionStatus: updatedMerchant.subscription?.status,
        totalRevenue: updatedMerchant.totalRevenue,
        createdAt: updatedMerchant.createdAt,
        lastActiveAt: updatedMerchant.lastActiveAt
      })
    );

  } catch (error) {
    console.error('🔍 MERCHANT API: Error updating merchant information:', error);
    console.error('🔍 MERCHANT API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
