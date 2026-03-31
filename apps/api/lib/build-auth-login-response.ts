import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { ROLE_PERMISSIONS } from '@rentalshop/auth';
import { generateToken, getUserPermissions } from '@rentalshop/auth/server';
import { ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

type LoginUserRow = NonNullable<Awaited<ReturnType<typeof db.users.findByEmail>>>;

/**
 * Shared login success path: email verification check, merchant/outlet payload, session, JWT.
 * Used by password login and Google OAuth after the user is authenticated.
 */
export async function buildAuthLoginSuccessResponse(
  request: NextRequest,
  user: LoginUserRow,
  corsHeaders: Record<string, string>
): Promise<NextResponse> {
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
        tenantKey: (merchant as any).tenantKey || undefined,
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
        defaultBankAccount: defaultBankAccount || undefined,
        merchant: (outlet as any).merchant
          ? {
              id: (outlet as any).merchant.id,
              name: (outlet as any).merchant.name,
              tenantKey: (outlet as any).merchant.tenantKey || undefined,
            }
          : undefined,
      };
    }
  }

  const ipAddress =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  const session = await db.sessions.createUserSession(user.id, ipAddress, userAgent);

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

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId,
    outletId: user.outletId,
    sessionId: session.sessionId,
    passwordChangedAt,
    permissionsChangedAt,
  } as any);

  const getBaseUrl = () =>
    process.env.CLIENT_URL || process.env.NEXT_PUBLIC_CLIENT_URL || 'https://dev.anyrent.shop';

  const baseUrl = getBaseUrl();
  const tenantKey = merchantData?.tenantKey || outletData?.merchant?.tenantKey;
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
        permissions,
        merchant: merchantData,
        outlet: outletData,
        publicProductLink,
        affiliateLink,
      },
      token,
    },
  };

  return NextResponse.json(result, { headers: corsHeaders });
}
