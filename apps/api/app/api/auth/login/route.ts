import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword, generateToken } from '@rentalshop/auth';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { handleApiError, ErrorCode } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * Build CORS headers for response
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://anyrent.shop',
    'https://www.anyrent.shop',
    'https://api.anyrent.shop',
    'https://admin.anyrent.shop',
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop',
    'https://dev-admin.anyrent.shop',
    ...(process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  ];
  
  const isAllowed = allowedOrigins.includes(origin);
  const allowOrigin = isAllowed ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);
  
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user in database by email
    const user = await db.users.findByEmail(validatedData.email);

    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('ACCOUNT_DEACTIVATED'),
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Verify password FIRST - only check email verification AFTER password is correct
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Check if email verification is required AND if email is not verified
    // NOTE: Only MERCHANT users need email verification
    // OUTLET_ADMIN and OUTLET_STAFF can use any email without verification
    const emailVerificationEnabled = process.env.ENABLE_EMAIL_VERIFICATION === 'true';
    const isMerchantUser = user.role === USER_ROLE.MERCHANT;
    if (emailVerificationEnabled && isMerchantUser && !user.emailVerified) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_NOT_VERIFIED'),
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Get merchant's active subscription plan (for platform access control)
    let planName = 'Basic'; // Default plan
    let merchantData = null; // MerchantReference | null
    let outletData = null;   // OutletReference | null
    let subscriptionData = null; // Subscription data
    
    if (user.merchantId) {
      const merchant = await db.merchants.findById(user.merchantId);
      if (merchant) {
        if (merchant.subscription?.plan) {
          planName = merchant.subscription.plan.name;
          
          // ✅ Return complete subscription data
          subscriptionData = {
            id: merchant.subscription.id,
            merchantId: merchant.subscription.merchantId,
            planId: merchant.subscription.planId,
            status: merchant.subscription.status,
            currentPeriodStart: merchant.subscription.currentPeriodStart,
            currentPeriodEnd: merchant.subscription.currentPeriodEnd,
            trialStart: merchant.subscription.trialStart || undefined,
            trialEnd: merchant.subscription.trialEnd || undefined,
            cancelAtPeriodEnd: merchant.subscription.cancelAtPeriodEnd,
            canceledAt: merchant.subscription.canceledAt || undefined,
            cancelReason: merchant.subscription.cancelReason || undefined,
            amount: merchant.subscription.amount,
            currency: merchant.subscription.currency,
            interval: merchant.subscription.interval,
            intervalCount: merchant.subscription.intervalCount,
            // Include plan details
            plan: {
              id: merchant.subscription.plan.id,
              name: merchant.subscription.plan.name,
              description: merchant.subscription.plan.description,
              basePrice: merchant.subscription.plan.basePrice,
              currency: merchant.subscription.plan.currency,
              trialDays: merchant.subscription.plan.trialDays,
              features: merchant.subscription.plan.features,
              limits: merchant.subscription.plan.limits,
              isActive: merchant.subscription.plan.isActive,
              isPopular: merchant.subscription.plan.isPopular,
            }
          };
        }
        // ✅ Return complete merchant data for Settings page
        merchantData = {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email || undefined,
          phone: merchant.phone || undefined,
          address: merchant.address || undefined,
          city: merchant.city || undefined,
          state: merchant.state || undefined,
          zipCode: merchant.zipCode || undefined,
          country: merchant.country || undefined,
          businessType: merchant.businessType || undefined,
          pricingType: merchant.pricingType || undefined,
          taxId: merchant.taxId || undefined,
          currency: (merchant as any).currency || 'USD',
          // ✅ Include subscription data in merchant object
          subscription: subscriptionData,
        };
      }
    }

    // Get outlet data if user has outlet assignment
    if (user.outletId) {
      const outlet = await db.outlets.findById(user.outletId);
      if (outlet) {
        // Get default bank account for outlet
        const { getDefaultBankAccount } = await import('@rentalshop/database');
        const defaultBankAccount = await getDefaultBankAccount(user.outletId);
        
        // ✅ Follow OutletReference type: { id, name, address?, merchantId, defaultBankAccount? }
        outletData = {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || undefined,
          merchantId: outlet.merchantId,
          defaultBankAccount: defaultBankAccount || undefined
        };
      }
    }

    // ✅ Create new session and invalidate all previous sessions (single session enforcement)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const session = await db.sessions.createUserSession(
      user.id,
      ipAddress,
      userAgent
    );

    // Generate token with plan name and sessionId for platform access control
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId,
      planName, // ✅ Include plan name in JWT
      sessionId: session.sessionId, // ✅ Include session ID for single session enforcement
    } as any);

    const result = {
      success: true,
      code: 'LOGIN_SUCCESS',
        message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.firstName + ' ' + user.lastName,
          phone: user.phone || undefined,
          role: user.role,
          merchantId: user.merchantId,
          outletId: user.outletId,
          emailVerified: (user as any).emailVerified || false,
          emailVerifiedAt: (user as any).emailVerifiedAt || undefined,
          // ✅ Optional: merchant object (null for ADMIN users without merchant)
          merchant: merchantData,  // MerchantReference | null
          // ✅ Optional: outlet object (null for ADMIN/MERCHANT users without outlet)
          outlet: outletData,      // OutletReference | null
          // ✅ Optional: subscription object (null for ADMIN users or merchants without subscription)
          subscription: subscriptionData, // Subscription | null
        },
        token,
      },
    };
    
    return NextResponse.json(result, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: corsHeaders
    });
  }
} 
