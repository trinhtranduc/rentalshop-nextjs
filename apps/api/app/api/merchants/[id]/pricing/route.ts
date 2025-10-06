import { handleApiError } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import type { BusinessType, PricingType, MerchantPricingConfig } from '@rentalshop/types';

// ============================================================================
// GET MERCHANT PRICING CONFIGURATION
// ============================================================================

export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(async (
  request: NextRequest, 
  { user, userScope }, 
  params: { id: string }
) => {
  try {
    console.log('🔍 Params:', params);
    console.log('🔍 User:', user);
    console.log('🔍 UserScope:', userScope);
    
    const merchantId = parseInt(params?.id || '0');
    console.log(`🔍 GET /api/merchants/${merchantId}/pricing - User: ${user?.email} (${user?.role})`);
    
    // Validate merchant access
    if (user.role === 'MERCHANT' && userScope?.merchantId !== merchantId) {
      console.log('❌ Access denied: merchant scope mismatch');
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    console.log('🔍 Fetching merchant data...');
    const merchant = await db.merchants.findById(merchantId);
    console.log('📦 Merchant data:', merchant ? 'Found' : 'Not found');

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
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

  } catch (error) {
    console.error('❌ Error fetching merchant pricing config:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pricing configuration', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// ============================================================================
// UPDATE MERCHANT PRICING CONFIGURATION
// ============================================================================

export const PUT = withAuthRoles(['ADMIN', 'MERCHANT'])(async (
  request: NextRequest, 
  { user, userScope }, 
  params: { id: string }
) => {
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

    // Validate duration limits
    if (durationLimits.minDuration < 1 || durationLimits.maxDuration < durationLimits.minDuration) {
      return NextResponse.json(
        { success: false, message: 'Invalid duration limits' },
        { status: 400 }
      );
    }

    // Check if merchant exists
    const existingMerchant = await db.merchants.findById(merchantId);

    if (!existingMerchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
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

  } catch (error) {
    console.error('Error updating merchant pricing config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update pricing configuration' },
      { status: 500 }
    );
  }
});
