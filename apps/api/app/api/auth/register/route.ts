import { NextRequest, NextResponse } from 'next/server';
import { db, createEmailVerification } from '@rentalshop/database';
import { registerSchema, sendVerificationEmail, generateUniqueTenantKey } from '@rentalshop/utils';
import { hashPassword } from '@rentalshop/auth';
import { SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { getDefaultPricingConfig, type BusinessType } from '@rentalshop/constants';

/**
 * Parse name into firstName and lastName
 */
function parseName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

/**
 * Get or create Trial plan
 */
async function getOrCreateTrialPlan(tx: any) {
  let plan = await tx.plan.findFirst({ where: { name: 'Trial' } });
  
  if (!plan) {
    plan = await tx.plan.create({
      data: {
        name: 'Trial',
        description: 'Free trial plan for new merchants',
        basePrice: 0,
        currency: 'USD',
        trialDays: 14,
        limits: JSON.stringify({
          outlets: 1,
          users: 3,
          products: 500,
          customers: 2000
        }),
        features: JSON.stringify([
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Mobile app access',
          '14-day free trial'
        ]),
        isActive: true,
        sortOrder: 0
      }
    });
  }
  
  return plan;
}

/**
 * Send email verification (non-critical, don't fail registration if it fails)
 */
async function sendVerificationEmailSafe(userId: number, email: string, firstName: string, lastName: string) {
  try {
    const verification = await createEmailVerification(userId, email);
    const userName = `${firstName} ${lastName}`.trim() || email;
    const result = await sendVerificationEmail(email, userName, verification.token);
    
    if (!result.success) {
      console.warn('⚠️ Failed to send verification email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    // Don't throw - email verification failure shouldn't block registration
  }
}

/**
 * Build pricing config JSON
 */
function buildPricingConfig(businessType?: string, pricingType?: string): string {
  if (businessType && pricingType) {
    return JSON.stringify({
      businessType,
      defaultPricingType: pricingType,
      businessRules: {
        requireRentalDates: pricingType !== 'FIXED',
        showPricingOptions: businessType === 'VEHICLE'
      },
      durationLimits: {
        minDuration: 1,
        maxDuration: pricingType === 'HOURLY' ? 168 : pricingType === 'DAILY' ? 30 : 1,
        defaultDuration: pricingType === 'HOURLY' ? 4 : pricingType === 'DAILY' ? 3 : 1
      }
    });
  }
  
  return JSON.stringify(getDefaultPricingConfig((businessType as BusinessType) || 'GENERAL'));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);
    
    // Check email exists early
    const existingUser = await db.users.findByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_EXISTS'),
        { status: 409 }
      );
    }
    
    // Parse name
    let firstName = validatedData.firstName || '';
    let lastName = validatedData.lastName || '';
    if (validatedData.name && !firstName && !lastName) {
      const parsed = parseName(validatedData.name);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
    }
    
    const isMerchantRegistration = validatedData.role === USER_ROLE.MERCHANT || !!validatedData.businessName;
    
    if (isMerchantRegistration) {
      // MERCHANT REGISTRATION
      
      // Check merchant duplicate
      const existingMerchant = await db.merchants.checkDuplicate(
        validatedData.email,
        validatedData.phone
      );
      
      if (existingMerchant) {
        const field = existingMerchant.email === validatedData.email ? 'email' : 'phone number';
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_DUPLICATE'),
          { status: 409 }
        );
      }
      
      // Create merchant in transaction
      const result = await db.prisma.$transaction(async (tx) => {
        // Generate tenant key
        const tenantKey = validatedData.tenantKey?.trim() 
          ? (await tx.merchant.findUnique({ where: { tenantKey: validatedData.tenantKey.trim() } })
              ? await generateUniqueTenantKey(
                  validatedData.businessName || validatedData.tenantKey.trim(),
                  async (key) => !!(await tx.merchant.findUnique({ where: { tenantKey: key } }))
                )
              : validatedData.tenantKey.trim())
          : await generateUniqueTenantKey(
              validatedData.businessName || '',
              async (key) => !!(await tx.merchant.findUnique({ where: { tenantKey: key } }))
            );
        
        // Find referring merchant if referral code provided
        let referredByMerchantId: number | undefined;
        if (validatedData.referralCode?.trim()) {
          const referringMerchant = await tx.merchant.findUnique({
            where: { tenantKey: validatedData.referralCode.trim() },
            select: { id: true }
          });
          referredByMerchantId = referringMerchant?.id;
        }
        
        // Create merchant
        const merchant = await tx.merchant.create({
          data: {
            name: validatedData.businessName!,
            email: validatedData.email,
            phone: validatedData.phone,
            tenantKey,
            address: validatedData.address,
            city: validatedData.city,
            state: validatedData.state,
            zipCode: validatedData.zipCode,
            country: validatedData.country,
            businessType: validatedData.businessType || 'GENERAL',
            pricingType: validatedData.pricingType || 'FIXED',
            referredByMerchantId,
            pricingConfig: buildPricingConfig(validatedData.businessType, validatedData.pricingType)
          } as any
        });
        
        // Create outlet
        const outlet = await tx.outlet.create({
          data: {
            name: `${merchant.name} - Main Store`,
            address: merchant.address || validatedData.address || 'Address to be updated',
            phone: merchant.phone || validatedData.phone,
            city: merchant.city || validatedData.city,
            state: merchant.state || validatedData.state,
            zipCode: merchant.zipCode || validatedData.zipCode,
            country: merchant.country || validatedData.country,
            description: 'Default outlet created during registration',
            merchantId: merchant.id,
            isDefault: true
          }
        });
        
        // Create category
        const category = await tx.category.create({
          data: {
            name: 'General',
            description: 'Default category for general products',
            merchantId: merchant.id,
            isDefault: true
          }
        });
        
        // Create user
        const hashedPassword = await hashPassword(validatedData.password);
        const user = await tx.user.create({
          data: {
            email: validatedData.email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: validatedData.phone,
            role: USER_ROLE.MERCHANT,
            merchantId: merchant.id,
            outletId: outlet.id,
            emailVerified: false,
            emailVerifiedAt: null
          }
        });
        
        // Get or create trial plan
        const trialPlan = await getOrCreateTrialPlan(tx);
        
        // Create subscription
        const subscriptionStartDate = new Date();
        const trialEndDate = new Date(subscriptionStartDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));
        
        const subscription = await tx.subscription.create({
          data: {
            merchantId: merchant.id,
            planId: trialPlan.id,
            status: SUBSCRIPTION_STATUS.TRIAL as any,
            amount: 0,
            currency: 'USD',
            currentPeriodStart: subscriptionStartDate,
            currentPeriodEnd: trialEndDate,
            trialStart: subscriptionStartDate,
            trialEnd: trialEndDate
          }
        });
        
        return { merchant, outlet, category, user, subscription, trialPlan, trialEndDate };
      });
      
      // Send verification email (outside transaction)
      await sendVerificationEmailSafe(
        result.user.id,
        result.user.email,
        result.user.firstName,
        result.user.lastName
      );
      
      return NextResponse.json(
        ResponseBuilder.success('MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION', {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            emailVerified: false,
            merchant: {
              id: result.merchant.id,
              name: result.merchant.name,
              businessType: result.merchant.businessType,
              pricingType: result.merchant.pricingType
            },
            outlet: {
              id: result.outlet.id,
              name: result.outlet.name
            }
          },
          subscription: {
            planName: result.trialPlan.name,
            trialEnd: result.trialEndDate,
            daysRemaining: Math.ceil(
              (result.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          },
          requiresEmailVerification: true
        }),
        { status: 201 }
      );
      
    } else {
      // BASIC USER REGISTRATION
      
      const result = await db.prisma.$transaction(async (tx) => {
        const hashedPassword = await hashPassword(validatedData.password);
        const user = await tx.user.create({
          data: {
            email: validatedData.email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: validatedData.phone,
            role: (validatedData.role as any) || USER_ROLE.OUTLET_STAFF,
            emailVerified: false,
            emailVerifiedAt: null
          }
        });
        return { user };
      });
      
      // Send verification email (outside transaction)
      await sendVerificationEmailSafe(
        result.user.id,
        result.user.email,
        result.user.firstName,
        result.user.lastName
      );
      
      return NextResponse.json(
        ResponseBuilder.success('USER_ACCOUNT_CREATED_PENDING_VERIFICATION', {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            emailVerified: false
          },
          requiresEmailVerification: true
        }),
        { status: 201 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    
    // Transaction automatically rolls back on error
    if (error?.code === 'P2002' && error?.meta?.target?.includes('id')) {
      console.error('🚨 Database sequence out of sync! Run: yarn db:fix-sequences');
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
