import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '../../../../lib/api-logging-wrapper';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * 
 * Authorization: Only roles with 'merchant.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const PUT = withApiLogging(
  withPermissions(['merchant.manage'])(async (request: NextRequest, { user, userScope }) => {
    try {

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
      tenantKey
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        ResponseBuilder.error('BUSINESS_NAME_REQUIRED'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Email field is disabled - users cannot change their email address
    // This ensures email uniqueness and prevents account hijacking

    // Get the merchant ID from the authenticated user
    const dbUser = await db.users.findById(user.id);

    if (!dbUser || !dbUser.merchant) {
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
    const updateData: any = {
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
    
    // Only include tenantKey if it's provided (allows clearing tenantKey by passing empty string)
    if (tenantKey !== undefined) {
      updateData.tenantKey = tenantKey || null;
    }
    
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, updateData);

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
        isActive: updatedMerchant.isActive,
        planId: updatedMerchant.planId,
        subscriptionStatus: updatedMerchant.subscription?.status,
        totalRevenue: updatedMerchant.totalRevenue,
        createdAt: updatedMerchant.createdAt,
        lastActiveAt: updatedMerchant.lastActiveAt
      })
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
