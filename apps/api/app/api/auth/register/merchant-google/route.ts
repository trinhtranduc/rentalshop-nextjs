import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@rentalshop/database';
import {
  merchantGoogleRegisterSchema,
  ResponseBuilder,
  generateUniqueTenantKey,
  handleApiError,
} from '@rentalshop/utils';
import { hashPassword } from '@rentalshop/auth/server';
import { SUBSCRIPTION_STATUS, USER_ROLE } from '@rentalshop/constants';
import { getDefaultPricingConfig, type BusinessType } from '@rentalshop/constants';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { verifyGoogleIdToken } from '../../../../../lib/verify-google-id-token';
import { buildAuthLoginSuccessResponse } from '../../../../../lib/build-auth-login-response';

function parseName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

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
          customers: 2000,
        }),
        features: JSON.stringify([
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Mobile app access',
          '14-day free trial',
        ]),
        isActive: true,
        sortOrder: 0,
      },
    });
  }

  return plan;
}

function buildPricingConfig(businessType?: string, pricingType?: string): string {
  if (businessType && pricingType) {
    return JSON.stringify({
      businessType,
      defaultPricingType: pricingType,
      businessRules: {
        requireRentalDates: pricingType !== 'FIXED',
        showPricingOptions: businessType === 'VEHICLE',
      },
      durationLimits: {
        minDuration: 1,
        maxDuration: pricingType === 'HOURLY' ? 168 : pricingType === 'DAILY' ? 30 : 1,
        defaultDuration: pricingType === 'HOURLY' ? 4 : pricingType === 'DAILY' ? 3 : 1,
      },
    });
  }

  return JSON.stringify(getDefaultPricingConfig((businessType as BusinessType) || 'GENERAL'));
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildSimpleCorsHeaders(request);

  try {
    if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
      return NextResponse.json(ResponseBuilder.error('GOOGLE_AUTH_NOT_CONFIGURED'), {
        status: 503,
        headers: corsHeaders,
      });
    }

    const body = await request.json();
    const validated = merchantGoogleRegisterSchema.parse(body);

    let google;
    try {
      google = await verifyGoogleIdToken(validated.idToken);
    } catch (e: any) {
      console.error('Google token verify failed:', e?.message);
      return NextResponse.json(ResponseBuilder.error('GOOGLE_TOKEN_INVALID'), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const email = google.email;

    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(ResponseBuilder.error('EMAIL_EXISTS'), {
        status: 409,
        headers: corsHeaders,
      });
    }

    const existingBySub = await db.prisma.user.findUnique({
      where: { googleSub: google.sub },
      select: { id: true },
    });
    if (existingBySub) {
      return NextResponse.json(ResponseBuilder.error('EMAIL_EXISTS'), {
        status: 409,
        headers: corsHeaders,
      });
    }

    const existingMerchant = await db.merchants.checkDuplicate(email, validated.phone);
    if (existingMerchant) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_DUPLICATE'), {
        status: 409,
        headers: corsHeaders,
      });
    }

    let firstName = google.given_name || '';
    let lastName = google.family_name || '';
    if (!firstName && google.name) {
      const p = parseName(google.name);
      firstName = p.firstName;
      lastName = p.lastName;
    }
    if (!firstName) firstName = email.split('@')[0] || 'User';

    await db.prisma.$transaction(async (tx) => {
      const tenantKey = validated.tenantKey?.trim()
        ? (await tx.merchant.findUnique({ where: { tenantKey: validated.tenantKey.trim() } }))
          ? await generateUniqueTenantKey(
              validated.businessName || validated.tenantKey.trim(),
              async (key) => !!(await tx.merchant.findUnique({ where: { tenantKey: key } }))
            )
          : validated.tenantKey.trim()
        : await generateUniqueTenantKey(
            validated.businessName || '',
            async (key) => !!(await tx.merchant.findUnique({ where: { tenantKey: key } }))
          );

      let referredByMerchantId: number | undefined;
      if (validated.referralCode?.trim()) {
        const referringMerchant = await tx.merchant.findUnique({
          where: { tenantKey: validated.referralCode.trim() },
          select: { id: true },
        });
        referredByMerchantId = referringMerchant?.id;
      }

      const merchant = await tx.merchant.create({
        data: {
          name: validated.businessName,
          email,
          phone: validated.phone,
          tenantKey,
          address: validated.address,
          city: undefined,
          state: undefined,
          zipCode: undefined,
          country: validated.country,
          businessType: validated.businessType || 'GENERAL',
          pricingType: validated.pricingType || 'FIXED',
          referredByMerchantId,
          pricingConfig: buildPricingConfig(validated.businessType, validated.pricingType),
        } as any,
      });

      const outlet = await tx.outlet.create({
        data: {
          name: `${merchant.name} - Main Store`,
          address: merchant.address || validated.address || 'Address to be updated',
          phone: merchant.phone || validated.phone,
          city: merchant.city,
          state: merchant.state,
          zipCode: merchant.zipCode,
          country: merchant.country,
          description: 'Default outlet created during registration',
          merchantId: merchant.id,
          isDefault: true,
        },
      });

      await tx.category.create({
        data: {
          name: 'General',
          description: 'Default category for general products',
          merchantId: merchant.id,
          isDefault: true,
        },
      });

      const randomPw = await hashPassword(`google-oauth-${randomUUID()}-not-used`);
      const now = new Date();
      await tx.user.create({
        data: {
          email,
          password: randomPw,
          firstName,
          lastName,
          phone: validated.phone,
          role: USER_ROLE.MERCHANT,
          merchantId: merchant.id,
          outletId: outlet.id,
          emailVerified: true,
          emailVerifiedAt: now,
          googleSub: google.sub,
        },
      });

      const trialPlan = await getOrCreateTrialPlan(tx);
      const subscriptionStartDate = new Date();
      const trialEndDate = new Date(
        subscriptionStartDate.getTime() + trialPlan.trialDays * 24 * 60 * 60 * 1000
      );

      await tx.subscription.create({
        data: {
          merchantId: merchant.id,
          planId: trialPlan.id,
          status: SUBSCRIPTION_STATUS.TRIAL as any,
          amount: 0,
          currency: 'USD',
          currentPeriodStart: subscriptionStartDate,
          currentPeriodEnd: trialEndDate,
          trialStart: subscriptionStartDate,
          trialEnd: trialEndDate,
        },
      });
    });

    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json(ResponseBuilder.error('INTERNAL_SERVER_ERROR'), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return await buildAuthLoginSuccessResponse(request, user, corsHeaders);
  } catch (error: any) {
    console.error('merchant-google register error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode, headers: corsHeaders });
  }
}
