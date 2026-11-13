import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { ROLE_PERMISSIONS } from '@rentalshop/auth';
import { generateToken, generateMobileToken, generateRefreshableToken, getUserPermissions } from '@rentalshop/auth/server';
import { ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE, isOutletRole } from '@rentalshop/constants';
import { detectPlatform } from './platform-detector';
import { detectClientPlatform } from './client-platform';
import { merchantTimeZoneField } from './shop-timezone';
import { merchantDepositField } from './installments';
import { activeModuleKeysSafe } from './merchant-modules';

type LoginUserRow = NonNullable<Awaited<ReturnType<typeof db.users.findByEmail>>>;

export interface LoginResponseOptions {
  /**
   * Issue a refresh token bound to the new session and a 1-hour access token (#344).
   * Used by /api/mobile/auth/login; the session is always a sliding mobile session.
   */
  issueRefreshToken?: { deviceId?: string };
}

/**
 * Shared login success path: email verification check, merchant/outlet payload, session, JWT.
 * Used by password login and Google OAuth after the user is authenticated.
 */
export async function buildAuthLoginSuccessResponse(
  request: NextRequest,
  user: LoginUserRow,
  corsHeaders: Record<string, string>,
  options: LoginResponseOptions = {}
): Promise<NextResponse> {
  // #824: a user of a disabled outlet cannot sign in (password, mobile and Google login all pass here)
  if (isOutletRole(user.role) && (user as any).outlet?.isActive === false) {
    return NextResponse.json(ResponseBuilder.error('OUTLET_DEACTIVATED'), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const emailVerificationEnabled = process.env.ENABLE_EMAIL_VERIFICATION === 'true';
  const isMerchantUser = user.role === USER_ROLE.MERCHANT;
  if (emailVerificationEnabled && isMerchantUser && !user.emailVerified) {
    return NextResponse.json(
      ResponseBuilder.error('EMAIL_NOT_VERIFIED'),
      {
        status: 403,
        headers: corsHeaders,
      }
    );
  }

  let merchantData = null;
  let outletData = null;
  let subscriptionData = null;

  if (user.merchantId) {
    const merchant = await db.merchants.findById(user.merchantId);
    if (merchant) {
      if (merchant.subscription?.plan) {
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
          },
        };
      }
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
        // Older merchants have no key; give them one so the product link and referral code exist
        tenantKey: (merchant as any).tenantKey || (await db.merchants.ensureTenantKey(merchant.id)) || undefined,
        // #518 "Cho tạo đơn khi trùng lịch" (additive; true = no availability check on save)
        allowOverlappingOrders: (merchant as { allowOverlappingOrders?: boolean }).allowOverlappingOrders !== false,
        // #567 shop time zone (additive; missing = Asia/Ho_Chi_Minh for every client)
        ...merchantTimeZoneField(merchant),
        // #1199 "Cách thu cọc" (additive; ONE_TIME for every shop that never set it)
        ...merchantDepositField(merchant),
        // #907 active feature modules (additive; [] when none)
        modules: await activeModuleKeysSafe(merchant.id),
        subscription: subscriptionData,
      };
    }
  }

  if (user.outletId) {
    const outlet = await db.outlets.findById(user.outletId);
    if (outlet) {
      const { getDefaultBankAccount } = await import('@rentalshop/database');
      const defaultBankAccount = await getDefaultBankAccount(user.outletId);

      outletData = {
        id: outlet.id,
        name: outlet.name,
        address: outlet.address || undefined,
        phone: outlet.phone || undefined,
        merchantId: outlet.merchantId,
        printBankQr: outlet.printBankQr ?? false, // #628 bill bank QR switch
        defaultBankAccount: defaultBankAccount || undefined,
        merchant: (outlet as any).merchant
          ? {
              id: (outlet as any).merchant.id,
              name: (outlet as any).merchant.name,
              tenantKey:
                (outlet as any).merchant.tenantKey ||
                (await db.merchants.ensureTenantKey((outlet as any).merchant.id)) ||
                undefined,
            }
          : undefined,
      };
    }
  }

  const ipAddress =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  // Detect platform for session and token expiry
  const platformInfo = detectPlatform(request);
  const issueRefreshToken = options.issueRefreshToken !== undefined;
  const isMobile = issueRefreshToken || platformInfo.platform === 'mobile';
  // One phone session + one web session per account (#660): a login replaces only its own kind.
  // The mobile login route is always a phone; unknown clients (null) replace every session.
  const sessionPlatform = issueRefreshToken ? 'mobile' : detectClientPlatform(request.headers);
  // Mobile sessions slide: 30 days idle, 90 days absolute (= mobile JWT lifetime).
  // Web sessions keep a fixed 7 days.
  const session = isMobile
    ? await db.sessions.createUserSession(user.id, ipAddress, userAgent, 30, {
        absoluteDays: 90,
        platform: sessionPlatform,
      })
    : await db.sessions.createUserSession(user.id, ipAddress, userAgent, 7, { platform: sessionPlatform });

  const passwordChangedAt = (user as any).passwordChangedAt
    ? Math.floor((user as any).passwordChangedAt.getTime() / 1000)
    : null;

  const permissionsChangedAt = (user as any).permissionsChangedAt
    ? Math.floor((user as any).permissionsChangedAt.getTime() / 1000)
    : null;

  const authUserForPermissions = {
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId,
    outletId: user.outletId,
  };

  const permissions = await getUserPermissions(authUserForPermissions as any);

  if (permissions.length === 0) {
    console.error('❌ WARNING: getUserPermissions returned empty array!', {
      userRole: user.role,
      merchantId: user.merchantId,
      availableRoles: Object.keys(ROLE_PERMISSIONS),
    });
  }

  const token = (() => {
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId,
      sessionId: session.sessionId,
      passwordChangedAt,
      permissionsChangedAt,
    } as any;

    // Clients holding a refresh token get a 1-hour token and refresh it (#344)
    if (issueRefreshToken) {
      return generateRefreshableToken(tokenPayload);
    }

    // Mobile gets a 90-day token (store builds cannot refresh); the session check still applies
    if (isMobile) {
      console.log('📱 LOGIN: Mobile platform detected, issuing 90-day token');
      return generateMobileToken(tokenPayload);
    }

    // Web gets standard 7-day token (has proactive refresh logic)
    return generateToken(tokenPayload);
  })();

  // Created after createUserSession, which revokes the refresh tokens of the sessions it replaced
  const refreshToken = issueRefreshToken
    ? await db.refreshTokens.create(user.id, {
        deviceId: options.issueRefreshToken?.deviceId,
        userAgent,
        ipAddress,
        sessionId: session.sessionId,
      })
    : undefined;

  const getBaseUrl = () =>
    process.env.CLIENT_URL || process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop';

  const baseUrl = getBaseUrl();
  const tenantKey = merchantData?.tenantKey || outletData?.merchant?.tenantKey;
  const publicProductLink = tenantKey ? `${baseUrl}/${tenantKey}/products` : undefined;
  const affiliateLink = tenantKey ? `${baseUrl}/register?referralCode=${tenantKey}` : undefined;

  const result = {
    success: true,
    code: 'LOGIN_SUCCESS',
    message: ResponseBuilder.success('LOGIN_SUCCESS').message,
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
        permissions,
        merchant: merchantData,
        outlet: outletData,
        publicProductLink,
        affiliateLink,
      },
      token,
      ...(refreshToken ? { refreshToken, expiresIn: '1h', refreshExpiresIn: '30d' } : {}),
    },
  };

  return NextResponse.json(result, { headers: corsHeaders });
}
