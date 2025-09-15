import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Get merchant with related data including plan and subscription info
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      include: {
        subscription: {
          select: {
            id: true,
            publicId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            trialEnd: true,
            amount: true,
            currency: true,
            interval: true,
            intervalCount: true,
            discount: true,
            savings: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
            plan: {
              select: {
                id: true,
                publicId: true,
                name: true,
                description: true,
                basePrice: true,
                currency: true,
                trialDays: true,
                limits: true,
                features: true,
                isActive: true,
                isPopular: true
              }
            }
          } as any
        },
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true
          }
        },
      }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get basic order statistics without fetching all orders
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      where: {
        outlet: {
          merchantId: merchant.id
        }
      },
      _count: {
        status: true
      }
    });

    const orderCounts = orderStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      totalOrders: Object.values(orderCounts).reduce((sum, count) => sum + count, 0),
      activeOrders: (orderCounts['RESERVED'] || 0) + (orderCounts['PICKUPED'] || 0),
      completedOrders: (orderCounts['COMPLETED'] || 0) + (orderCounts['RETURNED'] || 0),
      cancelledOrders: orderCounts['CANCELLED'] || 0
    };

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get current subscription info
    const currentSubscription = (merchant as any).subscription || null;
    
    // Transform data for frontend (using type assertion to handle schema fields)
    const merchantData = merchant as any;
    const transformedMerchant = {
      id: merchantData.publicId,
      name: merchantData.name,
      email: merchantData.email,
      phone: merchantData.phone,
      address: merchantData.address || null,
      city: merchantData.city || null,
      state: merchantData.state || null,
      zipCode: merchantData.zipCode || null,
      country: merchantData.country || null,
      businessType: merchantData.businessType || null,
      taxId: merchantData.taxId || null,
      website: merchantData.website || null,
      description: merchantData.description || null,
      isActive: merchantData.isActive,
      planId: merchantData.planId,
      subscriptionStatus: merchantData.subscriptionStatus,
      trialEndsAt: (currentSubscription as any)?.trialEnd || null,
      outletsCount: (merchant as any)._count?.outlets || 0,
      usersCount: (merchant as any)._count?.users || 0,
      productsCount: (merchant as any)._count?.products || 0,
      totalRevenue: merchantData.totalRevenue || 0,
      createdAt: merchantData.createdAt,
      lastActiveAt: merchantData.lastActiveAt,
      currentSubscription: currentSubscription ? {
        id: currentSubscription.publicId,
        status: currentSubscription.status,
        startDate: currentSubscription.currentPeriodStart,
        endDate: currentSubscription.currentPeriodEnd,
        trialEndDate: currentSubscription.trialEnd,
        nextBillingDate: currentSubscription.currentPeriodEnd,
        amount: currentSubscription.amount,
        currency: currentSubscription.currency,
        autoRenew: !currentSubscription.cancelAtPeriodEnd,
        interval: currentSubscription.interval,
        intervalCount: currentSubscription.intervalCount,
        discount: currentSubscription.discount,
        savings: currentSubscription.savings,
        plan: currentSubscription.plan ? {
          id: currentSubscription.plan.publicId,
          name: currentSubscription.plan.name,
          description: currentSubscription.plan.description,
          basePrice: currentSubscription.plan.basePrice,
          currency: currentSubscription.plan.currency,
          trialDays: currentSubscription.plan.trialDays,
          limits: currentSubscription.plan.limits ? JSON.parse(currentSubscription.plan.limits) : {
            outlets: 0,
            users: 0,
            products: 0,
            customers: 0
          },
          features: currentSubscription.plan.features ? JSON.parse(currentSubscription.plan.features) : [],
          isActive: currentSubscription.plan.isActive,
          isPopular: currentSubscription.plan.isPopular
        } : null
      } : {
        // Fallback for merchants without active subscriptions
        id: null,
        status: merchantData.subscriptionStatus || 'inactive',
        startDate: null,
        endDate: null,
        trialEndDate: merchantData.trialEndsAt,
        nextBillingDate: null,
        amount: 0,
        currency: 'USD',
        autoRenew: false,
        interval: 'month',
        intervalCount: 1,
        discount: 0,
        savings: 0,
        plan: null
      }
    };


    return NextResponse.json({
      success: true,
      data: {
        merchant: transformedMerchant,
        stats: {
          totalOutlets: (merchant as any)._count.outlets,
          totalUsers: (merchant as any)._count.users,
          totalProducts: (merchant as any)._count.products,
          totalOrders: stats.totalOrders,
          totalRevenue: merchant.totalRevenue || 0,
          activeOrders: stats.activeOrders,
          completedOrders: stats.completedOrders,
          cancelledOrders: stats.cancelledOrders
        }
      }
    });

  } catch (error) {
    console.error('Error fetching merchant details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchant details', error: errorMessage },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Soft delete by setting isActive to false
    const deletedMerchant = await prisma.merchant.update({
      where: { publicId: merchantId },
      data: {
        isActive: false,
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant deactivated successfully',
      data: {
        id: deletedMerchant.publicId,
        name: deletedMerchant.name,
        isActive: deletedMerchant.isActive
      }
    });

  } catch (error) {
    console.error('Error deactivating merchant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate merchant', error: errorMessage },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      zipCode, 
      country, 
      businessType, 
      taxId, 
      website, 
      description, 
      planId, 
      subscriptionStatus, 
      isActive 
    } = body;

    // Check if email already exists (if changing email)
    if (email) {
      const existingMerchant = await prisma.merchant.findFirst({
        where: {
          email,
          NOT: { publicId: merchantId }
        }
      });

      if (existingMerchant) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update merchant
    const updatedMerchant = await prisma.merchant.update({
      where: { publicId: merchantId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(country !== undefined && { country }),
        ...(businessType !== undefined && { businessType }),
        ...(taxId !== undefined && { taxId }),
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description }),
        ...(planId && { planId }),
        ...(subscriptionStatus && { subscriptionStatus }),
        ...(isActive !== undefined && { isActive }),
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant updated successfully',
      data: {
        id: updatedMerchant.publicId,
        name: updatedMerchant.name,
        email: updatedMerchant.email,
        phone: updatedMerchant.phone,
        address: updatedMerchant.address,
        city: updatedMerchant.city,
        state: updatedMerchant.state,
        zipCode: updatedMerchant.zipCode,
        country: updatedMerchant.country,
        businessType: updatedMerchant.businessType,
        taxId: updatedMerchant.taxId,
        website: updatedMerchant.website,
        description: updatedMerchant.description,
        isActive: updatedMerchant.isActive,
        planId: updatedMerchant.planId,
        subscriptionStatus: updatedMerchant.subscriptionStatus,
        totalRevenue: updatedMerchant.totalRevenue,
        createdAt: updatedMerchant.createdAt,
        lastActiveAt: updatedMerchant.lastActiveAt
      }
    });

  } catch (error) {
    console.error('Error updating merchant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to update merchant', error: errorMessage },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
