import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { registerSchema } from '@rentalshop/utils';
import { generateToken, hashPassword } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, getDefaultPricingConfig, type BusinessType, type PricingType } from '@rentalshop/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    // Prevent duplicate email early with clear error code
    const existingUser = await db.users.findByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_ALREADY_EXISTS', 'Email already exists'),
        { status: 409 }
      );
    }
    
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
      // MERCHANT REGISTRATION FLOW (WITH TRANSACTION)
      // ============================================================================
      
      // PRE-CHECKS: Validate before transaction to avoid partial creation
      
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

      // 2. Check if user email already exists
      const existingUser = await db.users.findByEmail(validatedData.email);
      if (existingUser) {
        console.log('❌ User email already exists:', validatedData.email);
        return NextResponse.json({
          success: false,
          code: 'EMAIL_EXISTS',
          message: `A user with email ${validatedData.email} already exists. Please use a different email.`
        }, { status: 409 });
      }

      // ALL CHECKS PASSED - Start transaction for atomic creation
      console.log('🔄 Starting transaction for merchant registration...');
      
      const result = await db.prisma.$transaction(async (tx) => {
        // 3. Create merchant with business configuration
        console.log('📝 Step 1: Creating merchant with data:', {
          name: validatedData.businessName,
          email: validatedData.email,
          phone: validatedData.phone
        });
        
        const merchant = await tx.merchant.create({
          data: {
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
                      minDuration: validatedData.pricingType === 'HOURLY' ? 1 : 1,
                      maxDuration: validatedData.pricingType === 'HOURLY' ? 168 : validatedData.pricingType === 'DAILY' ? 30 : 1,
                      defaultDuration: validatedData.pricingType === 'HOURLY' ? 4 : validatedData.pricingType === 'DAILY' ? 3 : 1
                    }
                  }
                : getDefaultPricingConfig(validatedData.businessType as BusinessType || 'GENERAL')
            )
          }
        });

        console.log('✅ Step 1 Complete: Merchant created:', { id: merchant.id, name: merchant.name });

        // 4. Create default outlet
        console.log('📝 Step 2: Creating outlet with merchantId:', merchant.id);
        
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

        console.log('✅ Step 2 Complete: Outlet created:', { id: outlet.id, name: outlet.name });

               // 5. Create default category
               console.log('📝 Step 3: Creating default category...');
               
               const category = await tx.category.create({
                 data: {
                   name: 'General',
                   description: 'Default category for general products',
                   merchantId: merchant.id,
                   isDefault: true
                 }
               });

        console.log('✅ Step 3 Complete: Category created:', { id: category.id, name: category.name });

        // 6. Create merchant user
        console.log('📝 Step 4: Creating merchant user...');
        
        const hashedPassword = await hashPassword(validatedData.password);
        const user = await tx.user.create({
          data: {
            email: validatedData.email,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            phone: validatedData.phone,
            role: 'MERCHANT',
            merchantId: merchant.id,
            outletId: outlet.id
          }
        });

        console.log('✅ Step 4 Complete: User created:', { id: user.id, email: user.email });
        console.log('🎉 Transaction complete - All entities created successfully!');

        // Return created entities from transaction
        return { merchant, outlet, category, user };
      }); // End transaction

      console.log('✅ Transaction committed successfully!');

      // Extract results from transaction
      const { merchant, outlet, category, user } = result;

      // 7. Get or create trial plan (outside transaction - can reuse existing)
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

      // 8. Create trial subscription
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

      console.log('✅ Registration complete for merchant:', merchant.name);

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        success: true,
        code: 'MERCHANT_ACCOUNT_CREATED_SUCCESS', 
        message: 'Merchant account created successfully with default outlet and trial subscription',
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
        code: 'USER_ACCOUNT_CREATED_SUCCESS',
        message: 'User account created successfully',
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