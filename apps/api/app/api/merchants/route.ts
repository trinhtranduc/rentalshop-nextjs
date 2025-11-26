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
    const minRevenue = searchParams.get('minRevenue');
    const maxRevenue = searchParams.get('maxRevenue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filtering
    const where: any = {};
    
    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { description: { contains: search } }
      ];
    }

    // Status filtering
    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
      // trial/expired will be filtered via subscription.status (post-processing)
    }

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

    // Active status filtering
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Plan filtering
    if (plan && plan !== 'all') {
      where.planId = plan;
    }

    // Revenue range filtering
    if (minRevenue || maxRevenue) {
      where.totalRevenue = {};
      if (minRevenue) {
        where.totalRevenue.gte = parseFloat(minRevenue);
      }
      if (maxRevenue) {
        where.totalRevenue.lte = parseFloat(maxRevenue);
      }
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'subscriptionStatus') {
      // Sort by subscription status (will be handled via subscription relation)
      orderBy.subscription = { status: sortOrder };
    } else if (sortBy === 'planId') {
      orderBy.planId = sortOrder;
          } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else if (sortBy === 'trialEndsAt') {
      orderBy.trialEndsAt = sortOrder;
    } else if (sortBy === 'lastActiveAt') {
      orderBy.lastActiveAt = sortOrder;
    } else if (sortBy === 'totalRevenue') {
      orderBy.totalRevenue = sortOrder;
    } else if (sortBy === 'isActive') {
      orderBy.isActive = sortOrder;
    } else {
      orderBy.name = 'asc'; // Default sorting
    }

    // Get merchants with pagination
    const result = await db.merchants.search({
      page: Math.floor(offset / limit) + 1,
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

    // Get counts for each merchant
    const merchantIds = merchants.map((m: any) => m.id);
    
    // Get outlet counts
    const outletCounts = merchantIds.length > 0 
      ? await Promise.all(merchantIds.map(async (id: string) => {
          const result = await db.outlets.search({ merchantId: id, limit: 1 });
          return { merchantId: id, count: result.total };
        }))
      : [];
    const outletCountMap = outletCounts.reduce((acc, item) => {
      acc[item.merchantId] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get user counts
    const userCounts = merchantIds.length > 0 
      ? await Promise.all(merchantIds.map(async (id: string) => {
          const result = await db.users.search({ merchantId: id, limit: 1 });
          return { merchantId: id, count: result.total };
        }))
      : [];
    const userCountMap = userCounts.reduce((acc, item) => {
      acc[item.merchantId] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get product counts
    const productCounts = merchantIds.length > 0 
      ? await Promise.all(merchantIds.map(async (id: string) => {
          const result = await db.products.search({ merchantId: id, limit: 1 });
          return { merchantId: id, count: result.total };
        }))
      : [];
    const productCountMap = productCounts.reduce((acc, item) => {
      acc[item.merchantId] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Transform data to match frontend expectations with real counts
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
      outletsCount: outletCountMap[merchant.id] || 0,
      usersCount: userCountMap[merchant.id] || 0,
      productsCount: productCountMap[merchant.id] || 0,
      totalRevenue: merchant.totalRevenue || 0,
      createdAt: merchant.createdAt,
      lastActiveAt: merchant.lastActiveAt
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: {
        merchants: transformedMerchants,
        total: total,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1,
        limit,
        offset,
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
        createdAt: merchant.createdAt,
        lastActiveAt: merchant.lastActiveAt,
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
