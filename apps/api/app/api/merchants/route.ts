import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
// Force TypeScript refresh - address field added
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API, SUBSCRIPTION_STATUS, USER_ROLE, normalizeSubscriptionStatus, getDefaultPricingConfig, type SubscriptionStatus} from '@rentalshop/constants';
import type { BusinessType } from '@rentalshop/types';

export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  try {

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const isActive = searchParams.get('isActive');
    const subscriptionStatus = searchParams.get('subscriptionStatus');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    // Subscription status filtering (stored for post-processing)
    // Validate against enum values for type safety using normalizeSubscriptionStatus
    let subscriptionStatusFilter: SubscriptionStatus | null = null;
    if (subscriptionStatus && subscriptionStatus !== 'all') {
      // Use normalizeSubscriptionStatus for type-safe validation
      subscriptionStatusFilter = normalizeSubscriptionStatus(subscriptionStatus);
    } else if (status === 'trial' || status === 'expired') {
      // Map legacy status values to enum
      if (status === 'trial') {
        subscriptionStatusFilter = SUBSCRIPTION_STATUS.TRIAL;
      } else if (status === 'expired') {
        subscriptionStatusFilter = SUBSCRIPTION_STATUS.EXPIRED;
      }
    }

    // Parse businessType if needed (currently not in query params but keeping for future)
    const businessType = searchParams.get('businessType') as BusinessType | null;

    // Get merchants with pagination and filters
    // db.merchants.search() handles search, businessType, planId, and isActive internally
    const result = await db.merchants.search({
      search: search || undefined,
      businessType: businessType || undefined,
      planId: plan && plan !== 'all' ? parseInt(plan) : undefined,
      isActive: isActive ? isActive === 'true' : (status && status !== 'all' ? (status === 'active') : undefined),
      page,
      limit
    });

    let merchants = result.data;
    let total = result.total;

    // Apply subscription status filter (post-processing)
    if (subscriptionStatusFilter) {
      merchants = merchants.filter((m: any) => {
        const merchantStatus = m.subscription?.status?.toUpperCase();
        return merchantStatus === subscriptionStatusFilter;
      });
      total = merchants.length;
    }

    // Transform data to match frontend expectations using Prisma _count (no N+1 queries!)
    // db.merchants.search() already includes _count in the result, so we use it directly
    const transformedMerchants = merchants.map((merchant: any) => ({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      zipCode: merchant.zipCode,
      country: merchant.country,
      businessType: merchant.businessType,
      taxId: merchant.taxId,
      website: merchant.website,
      description: merchant.description,
      isActive: merchant.isActive,
      planId: merchant.planId,
      subscription: merchant.subscription, // ✅ subscription.plan contains plan info (single source of truth)
      // ✅ Use Prisma _count instead of N+1 queries - reduces queries from 30+ to 1
      outletsCount: merchant._count?.outlets || 0,
      usersCount: merchant._count?.users || 0,
      productsCount: merchant._count?.products || 0,
      customersCount: merchant._count?.customers || 0,
      totalRevenue: merchant.totalRevenue || 0,
      createdAt: merchant.createdAt?.toISOString() || null,
      lastActiveAt: merchant.lastActiveAt?.toISOString() || null
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = (page - 1) * limit + limit < total;

    return NextResponse.json({
      success: true,
      data: {
        merchants: transformedMerchants,
        total: total,
        totalPages,
        page,
        currentPage: page,
        limit,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching merchants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      ResponseBuilder.error('FETCH_MERCHANTS_FAILED', { error: errorMessage }),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  try {

    const body = await request.json();
    const { name, email, phone, address, planId, businessType } = body;
    // subscriptionStatus removed - subscription status is managed via Subscription model

    // Validate required fields
    if (!name || !email || !phone || !planId) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_REQUIRED_FIELD'),
        { status: 400 }
      );
    }

    // Check for duplicate email or phone
    const existingMerchant = await db.merchants.checkDuplicate(email, phone);

    if (existingMerchant) {
      const duplicateField = existingMerchant.email === email ? 'email' : 'phone number';
      const duplicateValue = existingMerchant.email === email ? email : phone;
      
      console.log('❌ Merchant duplicate found:', { field: duplicateField, value: duplicateValue });
      return NextResponse.json(
        {
          success: false,
          code: 'MERCHANT_DUPLICATE',
          message: `A merchant with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`
        },
        { status: 409 }
      );
    }

    // Setup pricing configuration based on business type
    const pricingConfig = getDefaultPricingConfig((businessType as BusinessType) || 'GENERAL');

    // Use transaction for atomic creation
    const result = await db.prisma.$transaction(async (tx) => {
      // Create new merchant
      const merchant = await tx.merchant.create({
        data: {
          name,
          email,
          phone,
          address,
          planId,
          businessType: businessType || 'GENERAL',
          pricingConfig: JSON.stringify(pricingConfig)
        }
      });

      // Create default outlet for the merchant
      const defaultOutlet = await tx.outlet.create({
        data: {
          name: `${merchant.name} - Main Store`,
          address: merchant.address || 'Address to be updated',
          phone: merchant.phone,
          description: 'Default outlet created during merchant setup',
          merchantId: merchant.id,
          isDefault: true
        }
      });

      return { merchant, defaultOutlet };
    });

    const { merchant, defaultOutlet } = result;

    return NextResponse.json(
      ResponseBuilder.success('MERCHANT_CREATED_SUCCESS', {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        isActive: merchant.isActive,
        planId: merchant.planId,
        // subscriptionStatus removed - use subscription.status instead
        outletsCount: 1,
        usersCount: 0,
        productsCount: 0,
        totalRevenue: merchant.totalRevenue,
        createdAt: merchant.createdAt?.toISOString() || null,
        lastActiveAt: merchant.lastActiveAt?.toISOString() || null,
        defaultOutlet: {
          id: defaultOutlet.id,
          name: defaultOutlet.name,
          address: defaultOutlet.address
        }
      })
    );

  } catch (error) {
    console.error('Error creating merchant:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
