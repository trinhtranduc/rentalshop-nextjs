import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { registerSchema } from '@rentalshop/utils';
import { generateToken, hashPassword } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API, getDefaultPricingConfig, type BusinessType, type PricingType } from '@rentalshop/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Process name - support both firstName/lastName and full name
    let firstName = validatedData.firstName || '';
    let lastName = validatedData.lastName || '';
    
    if (validatedData.name && !firstName && !lastName) {
      // Auto-split full name if firstName/lastName not provided
      const nameParts = validatedData.name.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Determine registration type
    const isMerchantRegistration = validatedData.role === 'MERCHANT' || !!validatedData.businessName;

    if (isMerchantRegistration) {
      // ============================================================================
      // MERCHANT REGISTRATION FLOW
      // ============================================================================
      
      // 1. Check for duplicate merchant email or phone
      const existingMerchant = await db.merchants.checkDuplicate(
        validatedData.email,
        validatedData.phone
      );

      if (existingMerchant) {
        const duplicateField = existingMerchant.email === validatedData.email ? 'email' : 'phone number';
        const duplicateValue = existingMerchant.email === validatedData.email ? validatedData.email : validatedData.phone;
        
        console.log('❌ Merchant duplicate found:', { field: duplicateField, value: duplicateValue });
        return NextResponse.json({
          success: false,
          code: 'MERCHANT_DUPLICATE',
          message: `A merchant with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`
        }, { status: 409 });
      }

      // 2. Create merchant with business configuration
      const merchant = await db.merchants.create({
        name: validatedData.businessName!,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        businessType: validatedData.businessType || 'GENERAL',
        pricingType: validatedData.pricingType || 'FIXED',
        // Lock pricing configuration after registration using constants
        pricingConfig: JSON.stringify(
          validatedData.businessType && validatedData.pricingType
            ? {
                businessType: validatedData.businessType,
                defaultPricingType: validatedData.pricingType,
                businessRules: {
                  requireRentalDates: validatedData.pricingType !== 'FIXED',
                  showPricingOptions: ['VEHICLE'].includes(validatedData.businessType)
                },
                durationLimits: {
                  minDuration: validatedData.pricingType === 'HOURLY' ? 1 : validatedData.pricingType === 'DAILY' ? 1 : validatedData.pricingType === 'WEEKLY' ? 1 : 1,
                  maxDuration: validatedData.pricingType === 'HOURLY' ? 168 : validatedData.pricingType === 'DAILY' ? 30 : validatedData.pricingType === 'WEEKLY' ? 52 : 1,
                  defaultDuration: validatedData.pricingType === 'HOURLY' ? 4 : validatedData.pricingType === 'DAILY' ? 3 : validatedData.pricingType === 'WEEKLY' ? 1 : 1
                }
              }
            : getDefaultPricingConfig(validatedData.businessType as BusinessType || 'GENERAL')
        )
      });

      // 3. Create default outlet
      const outlet = await db.outlets.create({
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
      });

      // 4. Create default category (check if exists first)
      const existingCategory = await db.categories.findFirst({
        where: {
          merchantId: merchant.id,
          name: 'General'
        }
      });

      if (!existingCategory) {
        await db.categories.create({
          name: 'General',
          description: 'Default category for general products',
          merchantId: merchant.id
        });
      }

      // 5. Create merchant user
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await db.users.create({
        email: validatedData.email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        phone: validatedData.phone,
        role: 'MERCHANT',
        merchantId: merchant.id,
        outletId: outlet.id
      });

      // 6. Get or create trial plan
      let trialPlan = await db.plans.findById(1); // Default trial plan
      if (!trialPlan) {
        trialPlan = await db.plans.create({
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
        });
      }

      // 7. Create trial subscription
      const subscriptionStartDate = new Date();
      const trialEndDate = new Date(subscriptionStartDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));
      
      await db.subscriptions.create({
        merchantId: merchant.id,
        planId: trialPlan.id,
        status: 'trial',
        amount: 0,
        currency: 'USD',
        currentPeriodStart: subscriptionStartDate,
        currentPeriodEnd: trialEndDate,
        trialStart: subscriptionStartDate,
        trialEnd: trialEndDate
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        success: true,
        code: 'MERCHANT_ACCOUNT_CREATED_SUCCESS', message: 'Merchant account created successfully with default outlet and trial subscription',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            merchant: {
              id: merchant.id,
              name: merchant.name,
              businessType: merchant.businessType,
              pricingType: merchant.pricingType
            },
            outlet: {
              id: outlet.id,
              name: outlet.name
            }
          },
          token: token,
          subscription: {
            planName: trialPlan.name,
            trialEnd: trialEndDate,
            daysRemaining: Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      }, { status: 201 });

    } else {
      // ============================================================================
      // BASIC USER REGISTRATION FLOW
      // ============================================================================
      
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await db.users.create({
        email: validatedData.email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        phone: validatedData.phone,
        role: validatedData.role || 'CLIENT'
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        success: true,
        code: 'USER_ACCOUNT_CREATED_SUCCESS', message: 'User account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token: token
        }
      }, { status: 201 });
    }
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 