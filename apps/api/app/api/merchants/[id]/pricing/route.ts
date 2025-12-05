import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import type { BusinessType, PricingType, MerchantPricingConfig } from '@rentalshop/types';

// ============================================================================
// GET MERCHANT PRICING CONFIGURATION
// ============================================================================
// 
// **Why OUTLET_ADMIN and OUTLET_STAFF need access:**
// - They create orders and need to know merchant pricing rules
// - They need to calculate rental prices (HOURLY, DAILY, WEEKLY)
// - They work for the merchant, so should have READ access
// - Read-only access, cannot modify pricing (PUT is restricted)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  
  /**
   * GET /api/merchants/[id]/pricing
   * Get merchant pricing configuration
   * 
   * Authorization: All roles with 'analytics.view' permission can access
   * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
   * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
   * 
   * **Why OUTLET_ADMIN and OUTLET_STAFF need access:**
   * - They create orders and need to know merchant pricing rules
   * - They need to calculate rental prices (HOURLY, DAILY, WEEKLY)
   * - They work for the merchant, so should have READ access
   * - Read-only access, cannot modify pricing (PUT is restricted)
   */
  return withPermissions(['analytics.view'])(async (req, { user, userScope }) => {
    try {
      console.log(`🔍 GET /api/merchants/${merchantId}/pricing - User: ${user.email} (${user.role})`);
      
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Parse pricing config
      let pricingConfig: MerchantPricingConfig;
      try {
        pricingConfig = JSON.parse(merchant.pricingConfig || '{}');
      } catch (error) {
        // Fallback to default if parsing fails
        pricingConfig = {
          businessType: 'GENERAL',
          defaultPricingType: 'FIXED',
          businessRules: {
            requireRentalDates: false,
            showPricingOptions: false
          },
          durationLimits: {
            minDuration: 1,
            maxDuration: 1,
            defaultDuration: 1
          }
        };
      }

      return NextResponse.json({
        success: true,
        data: {
          merchantId: merchant.id,
          merchantName: merchant.name,
          businessType: merchant.businessType,
          pricingConfig
        }
      });

    } catch (error: any) {
      console.error('❌ Error fetching merchant pricing:', error);
      return NextResponse.json(
        ResponseBuilder.error('FETCH_PRICING_FAILED'),
        { status: 500 }
      );
    }
  })(request);
}

// ============================================================================
// UPDATE MERCHANT PRICING CONFIGURATION
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  
  /**
   * PUT /api/merchants/[id]/pricing
   * Update merchant pricing configuration
   * 
   * Authorization: Only roles with 'merchant.manage' permission can access
   * - Automatically includes: ADMIN, MERCHANT
   * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
   */
  return withPermissions(['merchant.manage'])(async (req, { user, userScope }) => {
    try {
      const body = await request.json();
      
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const existingMerchant = validation.merchant!;

      // Validate required fields
      const { businessType, defaultPricingType, businessRules, durationLimits } = body;
      
      if (!businessType || !defaultPricingType || !businessRules || !durationLimits) {
        return NextResponse.json(
          ResponseBuilder.error('MISSING_REQUIRED_FIELD'),
          { status: 400 }
        );
      }

      // Validate business type
      if (!['CLOTHING', 'VEHICLE', 'EQUIPMENT', 'GENERAL'].includes(businessType)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_BUSINESS_TYPE'),
          { status: 400 }
        );
      }

      // Validate pricing type
      if (!['FIXED', 'HOURLY', 'DAILY', 'WEEKLY'].includes(defaultPricingType)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRICING_TYPE'),
          { status: 400 }
        );
      }

      // Prepare pricing configuration
      const pricingConfig: MerchantPricingConfig = {
        businessType: businessType as BusinessType,
        defaultPricingType: defaultPricingType as PricingType,
        businessRules: {
          requireRentalDates: Boolean(businessRules.requireRentalDates),
          showPricingOptions: Boolean(businessRules.showPricingOptions)
        },
        durationLimits: {
          minDuration: parseInt(durationLimits.minDuration) || 1,
          maxDuration: parseInt(durationLimits.maxDuration) || 365,
          defaultDuration: parseInt(durationLimits.defaultDuration) || 1
        }
      };

      // Update merchant
      const merchant = await db.merchants.update(merchantId, {
        businessType: businessType,
        pricingConfig: JSON.stringify(pricingConfig)
      });

      return NextResponse.json({
        success: true,
        code: 'PRICING_CONFIG_UPDATED_SUCCESS',
        message: 'Pricing configuration updated successfully',
        data: {
          merchantId: merchant.id,
          merchantName: merchant.name,
          businessType: merchant.businessType,
          pricingConfig,
          updatedAt: merchant.updatedAt?.toISOString() || null
        }
      });

    } catch (error: any) {
      console.error('Error updating merchant pricing:', error);
      return NextResponse.json(
        ResponseBuilder.error('UPDATE_PRICING_FAILED'),
        { status: 500 }
      );
    }
  })(request);
}
