import { handleApiError } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
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
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (req, { user, userScope }) => {
    try {
      const merchantId = parseInt(params.id);
      console.log(`🔍 GET /api/merchants/${merchantId}/pricing - User: ${user.email} (${user.role})`);
      
      // Validate merchant access - all outlet users have merchantId in scope
      if (['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'].includes(user.role) && userScope.merchantId !== merchantId) {
        console.log('❌ Access denied: merchant scope mismatch');
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }

      const merchant = await db.merchants.findById(merchantId);

      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
        );
      }

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
        { success: false, message: 'Failed to fetch pricing configuration' },
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
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (req, { user, userScope }) => {
    try {
      const merchantId = parseInt(params.id);
      const body = await request.json();
      
      // Validate merchant access
      if (user.role === 'MERCHANT' && userScope.merchantId !== merchantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 403 }
        );
      }

      // Validate required fields
      const { businessType, defaultPricingType, businessRules, durationLimits } = body;
      
      if (!businessType || !defaultPricingType || !businessRules || !durationLimits) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate business type
      if (!['CLOTHING', 'VEHICLE', 'EQUIPMENT', 'GENERAL'].includes(businessType)) {
        return NextResponse.json(
          { success: false, message: 'Invalid business type' },
          { status: 400 }
        );
      }

      // Validate pricing type
      if (!['FIXED', 'HOURLY', 'DAILY', 'WEEKLY'].includes(defaultPricingType)) {
        return NextResponse.json(
          { success: false, message: 'Invalid pricing type' },
          { status: 400 }
        );
      }

      // Check if merchant exists
      const existingMerchant = await db.merchants.findById(merchantId);

      if (!existingMerchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
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
        message: 'Pricing configuration updated successfully',
        data: {
          merchantId: merchant.id,
          merchantName: merchant.name,
          businessType: merchant.businessType,
          pricingConfig,
          updatedAt: merchant.updatedAt
        }
      });

    } catch (error: any) {
      console.error('Error updating merchant pricing:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update pricing configuration' },
        { status: 500 }
      );
    }
  })(request);
}
