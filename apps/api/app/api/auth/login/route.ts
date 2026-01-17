import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword, generateToken, getUserPermissions, ROLE_PERMISSIONS } from '@rentalshop/auth';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { handleApiError, ErrorCode } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * Build CORS headers for response (safe, never throws)
 * This function is guaranteed to return valid CORS headers
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  try {
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
  } catch (error) {
    // Fallback: return permissive CORS headers if anything fails
    console.error('❌ LOGIN: Error building CORS headers, using fallback:', error);
    const origin = request.headers.get('origin') || '*';
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
}

export async function OPTIONS(request: NextRequest) {
  try {
  const corsHeaders = buildCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
  } catch (error: any) {
    console.error('❌ OPTIONS ERROR:', {
      errorName: error?.name,
      errorMessage: error?.message,
    });
    
    // Return basic CORS headers even on error
    const fallbackHeaders = {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
    
    return new NextResponse(null, {
      status: 204,
      headers: fallbackHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  // Build CORS headers first (safe, never throws)
  const corsHeaders = buildCorsHeaders(request);
  
  // 🔍 DIAGNOSTIC LOGGING: Log request origin and environment
  const origin = request.headers.get('origin') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  console.log('🔍 LOGIN REQUEST:', {
    origin,
    userAgent: userAgent.substring(0, 50),
    timestamp: new Date().toISOString(),
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
  
  try {
    // 🔍 DIAGNOSTIC LOGGING: Test Prisma client connection before use
    try {
      const { prisma } = await import('@rentalshop/database');
      console.log('🔍 PRISMA CLIENT STATUS:', {
        isInitialized: !!prisma,
        clientType: prisma?.constructor?.name || 'unknown',
      });
      
      // Test database connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ DATABASE CONNECTION: Successfully connected');
    } catch (dbTestError: any) {
      console.error('❌ DATABASE CONNECTION TEST FAILED:', {
        errorName: dbTestError?.name,
        errorMessage: dbTestError?.message,
        errorCode: dbTestError?.code,
        isPrismaError: dbTestError?.name === 'PrismaClientInitializationError',
      });
      // Don't throw here - let the actual query fail to get better error context
    }
    
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    console.log('🔍 LOGIN ATTEMPT:', {
      email: validatedData.email,
      emailLength: validatedData.email.length,
    });
    
    // Find user in database by email
    console.log('🔍 DATABASE QUERY: Starting findByEmail...');
    const user = await db.users.findByEmail(validatedData.email);
    console.log('🔍 DATABASE QUERY: findByEmail completed', {
      userFound: !!user,
      userId: user?.id,
      userRole: user?.role,
    });

    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Note: Hard delete - deleted users won't exist in database, so no need to check deletedAt
    // Removed deletedAt check since we're using hard delete

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
    // Note: planName and allowWebAccess are NOT included in JWT to keep token small
    // They will be fetched from DB in middleware when needed
    let merchantData = null; // MerchantReference | null
    let outletData = null;   // OutletReference | null
    let subscriptionData = null; // Subscription data
    
    if (user.merchantId) {
      const merchant = await db.merchants.findById(user.merchantId);
      if (merchant) {
        if (merchant.subscription?.plan) {
          
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
          tenantKey: (merchant as any).tenantKey || undefined, // ✅ Include tenantKey for referral code
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
        
        // ✅ Follow OutletReference type: { id, name, address?, phone?, merchantId, defaultBankAccount?, merchant? }
        outletData = {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || undefined,
          phone: outlet.phone || undefined,
          merchantId: outlet.merchantId,
          defaultBankAccount: defaultBankAccount || undefined,
          // ✅ Include merchant data with tenantKey for referral code
          merchant: (outlet as any).merchant ? {
            id: (outlet as any).merchant.id,
            name: (outlet as any).merchant.name,
            tenantKey: (outlet as any).merchant.tenantKey || undefined
          } : undefined
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

    // Get passwordChangedAt from user record to include in token
    // This ensures new tokens are valid after password reset
    const passwordChangedAt = (user as any).passwordChangedAt
      ? Math.floor((user as any).passwordChangedAt.getTime() / 1000) // Convert to Unix timestamp (seconds)
      : null;

    // Get permissionsChangedAt from user record to include in token
    // This ensures new tokens are valid after permissions change
    const permissionsChangedAt = (user as any).permissionsChangedAt
      ? Math.floor((user as any).permissionsChangedAt.getTime() / 1000) // Convert to Unix timestamp (seconds)
      : null;

    // Debug logging for passwordChangedAt and permissionsChangedAt values
    console.log('🔍 LOGIN: passwordChangedAt values:', {
      fromDatabase: (user as any).passwordChangedAt,
      convertedToToken: passwordChangedAt,
      type: typeof passwordChangedAt,
      userId: user.id,
      email: user.email
    });
    console.log('🔍 LOGIN: permissionsChangedAt values:', {
      fromDatabase: (user as any).permissionsChangedAt,
      convertedToToken: permissionsChangedAt,
      type: typeof permissionsChangedAt,
      userId: user.id,
      email: user.email
    });

    // ✅ Get user permissions (supports custom merchant permissions)
    const authUserForPermissions = {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId,
    };

    console.log('🔍 Calling getUserPermissions with:', {
      role: authUserForPermissions.role,
      merchantId: authUserForPermissions.merchantId,
      outletId: authUserForPermissions.outletId
    });

    const permissions = await getUserPermissions(authUserForPermissions as any);

    console.log('🔍 getUserPermissions returned:', {
      permissionsCount: permissions.length,
      permissions: permissions
    });
    
    // ✅ DEBUG: Log permissions that will be sent to frontend
    console.log('🔍 LOGIN: Permissions to be sent to frontend:', {
      userRole: user.role,
      permissionsCount: permissions.length,
      permissions: permissions,
      hasBankAccountsView: permissions.includes('bankAccounts.view'),
      hasBankAccountsManage: permissions.includes('bankAccounts.manage'),
    });

    if (permissions.length === 0) {
      console.error('❌ WARNING: getUserPermissions returned empty array!', {
        userRole: user.role,
        merchantId: user.merchantId,
        availableRoles: Object.keys(ROLE_PERMISSIONS)
      });
    }

    // Generate token with minimal payload to keep JWT small
    // Note: planName and allowWebAccess are NOT in JWT - fetched from DB in middleware when needed
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId,
      sessionId: session.sessionId, // ✅ Include session ID for single session enforcement
      passwordChangedAt, // ✅ Include passwordChangedAt to prevent token invalidation after login
      permissionsChangedAt, // ✅ Include permissionsChangedAt to prevent token invalidation after permissions change
    } as any);

    // Generate public product link and affiliate link
    const getBaseUrl = () => {
      return process.env.CLIENT_URL || process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop';
    };
    
    const baseUrl = getBaseUrl();
    
    // Get tenantKey from merchant (either from user's merchant or outlet's merchant)
    const tenantKey = merchantData?.tenantKey || outletData?.merchant?.tenantKey;
    
    // Generate links
    const publicProductLink = tenantKey ? `${baseUrl}/${tenantKey}/products` : undefined;
    const affiliateLink = tenantKey ? `${baseUrl}/register?referralCode=${tenantKey}` : undefined;

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
          // ✅ Permissions array for frontend UI control
          permissions: permissions, // Array of permission strings
          // ✅ Optional: merchant object (null for ADMIN users without merchant)
          // Note: subscription is included in merchant object, not duplicated at user level
          merchant: merchantData,  // MerchantReference | null (includes subscription)
          // ✅ Optional: outlet object (null for ADMIN/MERCHANT users without outlet)
          outlet: outletData,      // OutletReference | null
          // ✅ Public product link and affiliate link
          publicProductLink,       // Link to public product page: {baseUrl}/{tenantKey}/products
          affiliateLink,           // Link for affiliate/referral: {baseUrl}/register?referralCode={tenantKey}
        },
        token,
      },
    };
    
    return NextResponse.json(result, { headers: corsHeaders });
    
  } catch (error: any) {
    // 🔍 DIAGNOSTIC LOGGING: Detailed error information
    console.error('❌ LOGIN ERROR DETAILS:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack?.substring(0, 500),
      isPrismaError: error?.name === 'PrismaClientInitializationError',
      isDatabaseError: error?.message?.includes('database') || error?.message?.includes('Can\'t reach'),
      origin,
      timestamp: new Date().toISOString(),
    });
    
    try {
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    
    console.log('🔍 ERROR RESPONSE:', {
      statusCode,
      errorCode: response.code,
      errorMessage: response.message,
    });
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: corsHeaders
    });
    } catch (handleError: any) {
      // If handleApiError itself throws, return generic error with CORS headers
      console.error('❌ LOGIN: Error in handleApiError, using fallback:', {
        originalError: error?.message,
        handleError: handleError?.message,
      });
      
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
} 
