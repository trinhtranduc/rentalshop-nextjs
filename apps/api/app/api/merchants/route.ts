import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
// Force TypeScript refresh - address field added
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';
import { getDefaultPricingConfig } from '@rentalshop/constants';
import type { BusinessType } from '@rentalshop/types';

export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
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
      } else if (status === 'trial') {
        where.subscriptionStatus = 'trial';
      } else if (status === 'expired') {
        where.subscriptionStatus = 'expired';
      }
    }

    // Direct status filtering
    if (subscriptionStatus && subscriptionStatus !== 'all') {
      where.subscriptionStatus = subscriptionStatus;
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
      orderBy.subscriptionStatus = sortOrder;
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

    const merchants = result.data;
    const total = result.total;

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
      subscriptionStatus: merchant.subscriptionStatus,
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
      { success: false, message: 'Failed to fetch merchants', error: errorMessage },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
  try {

    const body = await request.json();
    const { name, email, phone, address, planId, subscriptionStatus, businessType } = body;

    // Validate required fields
    if (!name || !email || !phone || !planId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingMerchant = await db.merchants.findByEmail(email);

    if (existingMerchant) {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 400 }
      );
    }

    // Setup pricing configuration based on business type
    const pricingConfig = getDefaultPricingConfig((businessType as BusinessType) || 'GENERAL');

    // Create new merchant
    const merchant = await db.merchants.create({
        name,
        email,
        phone,
        address,
        planId,
        subscriptionStatus: subscriptionStatus || 'trial',
        // isActive: true, // TODO: Add isActive field to MerchantCreateData type
        // totalRevenue: 0, // TODO: Add totalRevenue field to MerchantCreateData type
        businessType: businessType || 'GENERAL',
        pricingConfig: JSON.stringify(pricingConfig)
      });

    // Create default outlet for the merchant
    const defaultOutlet = await db.outlets.create({
      name: `${merchant.name} - Main Store`,
      address: merchant.address || 'Address to be updated',
      phone: merchant.phone,
      description: 'Default outlet created during merchant setup',
      merchantId: merchant.id,
      // isActive: true, // TODO: Add isActive field to OutletCreateData type
      isDefault: true
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant created successfully with default outlet',
      data: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        isActive: merchant.isActive,
        planId: merchant.planId,
        subscriptionStatus: merchant.subscriptionStatus,
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
      }
    });

  } catch (error) {
    console.error('Error creating merchant:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
