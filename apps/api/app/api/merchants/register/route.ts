import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, getDefaultPricingConfig, BusinessType } from '@rentalshop/constants';

// Validation schema for merchant registration
const merchantRegistrationSchema = z.object({
  // Merchant details
  merchantName: z.string().min(1, 'Merchant name is required'),
  merchantEmail: z.string().email('Invalid merchant email'),
  merchantPhone: z.string().optional(),
  merchantDescription: z.string().optional(),
  currency: z.enum(['USD', 'VND']).default('USD'),
  businessType: z.enum(['GENERAL', 'CLOTHING', 'VEHICLE', 'EQUIPMENT']).default('GENERAL'),
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY', 'WEEKLY']).default('FIXED'),
  
  // User details (merchant owner)
  userEmail: z.string().email('Invalid user email'),
  userPassword: z.string().min(6, 'Password must be at least 6 characters'),
  userFirstName: z.string().min(1, 'First name is required'),
  userLastName: z.string().min(1, 'Last name is required'),
  userPhone: z.string().optional(),
  
  // Optional outlet details
  outletName: z.string().optional(),
  outletAddress: z.string().optional(),
  outletDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = merchantRegistrationSchema.parse(body);
    
    // Get default pricing config based on business type
    const pricingConfig = getDefaultPricingConfig(validatedData.businessType as BusinessType);
    
    // Use transaction for atomic creation
    const result = await db.prisma.$transaction(async (tx) => {
      // Register merchant with complete setup
      const merchant = await tx.merchant.create({
        data: {
          name: validatedData.merchantName,
          email: validatedData.merchantEmail,
          phone: validatedData.merchantPhone,
          description: validatedData.merchantDescription,
          currency: validatedData.currency,
          businessType: validatedData.businessType,
          pricingType: validatedData.pricingType,
          pricingConfig: JSON.stringify(pricingConfig),
          address: validatedData.outletAddress || 'Address to be updated',
          city: 'City to be updated',
          state: 'State to be updated',
          zipCode: '00000',
          country: 'US'
        }
      });

      // Create merchant owner user
      const user = await tx.user.create({
        data: {
          email: validatedData.userEmail,
          password: validatedData.userPassword,
          firstName: validatedData.userFirstName,
          lastName: validatedData.userLastName,
          phone: validatedData.userPhone,
          role: 'MERCHANT',
          merchantId: merchant.id
        }
      });

      // Create default outlet
      const outlet = await tx.outlet.create({
        data: {
          name: validatedData.outletName || `${merchant.name} - Main Store`,
          address: validatedData.outletAddress || merchant.address || 'Address to be updated',
          phone: validatedData.userPhone || merchant.phone,
          description: 'Default outlet created during merchant setup',
          merchantId: merchant.id,
          isDefault: true
        }
      });

      return { merchant, user, outlet };
    });

    const { merchant, user, outlet } = result;

    // Get free trial plan
    const trialPlan = await db.plans.findById(1); // Assuming plan ID 1 is free trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create subscription with trial
    const subscription = await db.subscriptions.create({
      merchantId: merchant.id,
      planId: trialPlan?.id || 1,
      status: 'TRIAL',
      amount: 0,
      currency: validatedData.currency, // Use merchant's currency
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndDate,
      trialEnd: trialEndDate
    });

    return NextResponse.json(
      ResponseBuilder.success('MERCHANT_REGISTERED_TRIAL_SUCCESS', {
        merchant,
        user,
        subscription,
        outlet,
        trialInfo: {
          planName: trialPlan?.name || 'Free Trial',
          daysRemaining: Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }
      }),
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('Merchant registration error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
