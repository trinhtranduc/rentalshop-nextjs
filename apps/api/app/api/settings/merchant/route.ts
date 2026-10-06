import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * 
 * Authorization: Only roles with 'merchant.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT
 * - `allowOverlappingOrders` (#518, boolean): role MERCHANT or ADMIN only (403 INSUFFICIENT_PERMISSIONS
 *   otherwise). A body with only that field updates just the setting (no name required).
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
      allowOverlappingOrders
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

    // A body carrying only the setting (new apps' toggle) updates just that field; every other body is the
    // business-info form as before and still needs a name.
    const BUSINESS_FIELDS = ['name', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'businessType', 'taxId', 'website', 'description', 'tenantKey'];
    const settingOnly =
      allowOverlappingOrders !== undefined &&
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
    
    // Only include tenantKey if it's provided (allows clearing tenantKey by passing empty string)
    if (tenantKey !== undefined) {
      updateData.tenantKey = tenantKey || null;
    }
    
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, updateData);

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
