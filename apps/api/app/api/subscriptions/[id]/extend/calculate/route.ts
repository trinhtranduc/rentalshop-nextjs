// ============================================================================
// SUBSCRIPTION EXTENSION PRICE CALCULATION API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder, formatCurrency } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * Calculate extension price for a subscription
 * GET /api/subscriptions/[id]/extend/calculate?newEndDate=2025-02-01
 */
async function handleCalculateExtensionPrice(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve params
    const resolvedParams = await Promise.resolve(params);
    const subscriptionId = parseInt(resolvedParams.id);

    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'),
        { status: 400 }
      );
    }

    // Get newEndDate from query params
    const { searchParams } = new URL(request.url);
    const newEndDateStr = searchParams.get('newEndDate');

    if (!newEndDateStr) {
      return NextResponse.json(
        ResponseBuilder.error('NEW_END_DATE_REQUIRED'),
        { status: 400 }
      );
    }

    const newEndDate = new Date(newEndDateStr);
    if (isNaN(newEndDate.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT'),
        { status: 400 }
      );
    }

    if (newEndDate <= new Date()) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_END_DATE'),
        { status: 400 }
      );
    }

    // Get subscription with plan
    const subscription = await db.subscriptions.findById(subscriptionId);
    
    if (!subscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (!subscription.plan) {
      return NextResponse.json(
        ResponseBuilder.error('PLAN_NOT_FOUND'),
        { status: 400 }
      );
    }

    // Get active addons for merchant
    const addons = await db.planLimitAddons.findActiveByMerchant(subscription.merchantId);
    const totalAddonLimits = await db.planLimitAddons.calculateTotal(subscription.merchantId);

    // Calculate extension duration in days
    const oldEndDate = subscription.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd) 
      : new Date();
    const extensionDays = Math.ceil((newEndDate.getTime() - oldEndDate.getTime()) / (1000 * 60 * 60 * 24));

    if (extensionDays <= 0) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_EXTENSION_DURATION'),
        { status: 400 }
      );
    }

    // Calculate plan price per day
    // Use current billing interval or default to monthly
    const billingInterval = subscription.billingInterval || 'monthly';
    const plan = subscription.plan;
    
    // Get monthly price from plan
    const monthlyPrice = plan.basePrice || 0;
    
    // Calculate current period duration and days
    const currentPeriodStart = subscription.currentPeriodStart 
      ? new Date(subscription.currentPeriodStart)
      : new Date();
    const now = new Date();
    const currentPeriodDays = Math.ceil((oldEndDate.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const usedDays = Math.max(0, Math.ceil((now.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.ceil((oldEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate period price based on billing interval
    const getPeriodPrice = (interval: string): number => {
      switch (interval) {
        case 'monthly': return monthlyPrice;
        case 'quarterly': return monthlyPrice * 3;
        case 'semi_annual': return monthlyPrice * 6 * 0.95; // 5% discount
        case 'annual': return monthlyPrice * 12 * 0.90; // 10% discount
        default: return monthlyPrice;
      }
    };
    
    const periodPrice = getPeriodPrice(billingInterval);
    const dailyPrice = periodPrice / currentPeriodDays;
    
    // Calculate used value and remaining value
    const usedValue = (usedDays / currentPeriodDays) * periodPrice;
    const remainingValue = remainingDays > 0 ? (remainingDays / currentPeriodDays) * periodPrice : 0;
    
    // Calculate extension price
    // Formula: (Extension Days / Period Days) * Period Price
    const extensionPrice = (extensionDays / currentPeriodDays) * periodPrice;
    
    // Total price = extension price only (remaining value is still being used)
    const totalPrice = extensionPrice;

    // Return calculation result
    return NextResponse.json(
      ResponseBuilder.success('EXTENSION_PRICE_CALCULATED', {
        subscriptionId,
        planId: plan.id,
        planName: plan.name,
        billingInterval,
        oldEndDate: oldEndDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        extensionDays,
        currentPeriodDays,
        usedDays,
        remainingDays,
        monthlyPrice,
        periodPrice: Math.round(periodPrice * 100) / 100,
        dailyPrice: Math.round(dailyPrice * 100) / 100,
        usedValue: Math.round(usedValue * 100) / 100,
        remainingValue: Math.round(remainingValue * 100) / 100,
        extensionPrice: Math.round(extensionPrice * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        currency: plan.currency || 'VND',
        breakdown: {
          currentPlan: {
            name: plan.name,
            periodStart: currentPeriodStart.toISOString(),
            periodEnd: oldEndDate.toISOString(),
            periodDays: currentPeriodDays,
            usedDays: usedDays,
            remainingDays: remainingDays,
            periodPrice: periodPrice,
            usedValue: usedValue,
            remainingValue: remainingValue,
            dailyPrice: dailyPrice
          },
          extension: {
            days: extensionDays,
            price: extensionPrice
          },
          total: totalPrice
        },
        formula: {
          step1: `Current Plan (${plan.name}): ${usedDays} days used / ${currentPeriodDays} days = ${formatCurrency(usedValue, plan.currency || 'VND' as any)} used, ${remainingDays} days remaining = ${formatCurrency(remainingValue, plan.currency || 'VND' as any)} remaining (still in use)`,
          step2: `Extension: ${extensionDays} days / ${currentPeriodDays} days × ${formatCurrency(periodPrice, plan.currency || 'VND' as any)} = ${formatCurrency(extensionPrice, plan.currency || 'VND' as any)}`,
          step3: `Total: Extension Price = ${formatCurrency(extensionPrice, plan.currency || 'VND' as any)} (Remaining value ${formatCurrency(remainingValue, plan.currency || 'VND' as any)} continues to be used)`
        },
        addons: {
          count: addons.length,
          items: addons.map(addon => ({
            id: addon.id,
            outlets: addon.outlets,
            users: addon.users,
            products: addon.products,
            customers: addon.customers,
            orders: addon.orders,
            notes: addon.notes,
            isActive: addon.isActive
          })),
          totalLimits: totalAddonLimits
        }
      })
    );
  } catch (error) {
    console.error('Error calculating extension price:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, context) => {
    return handleCalculateExtensionPrice(request, { params });
  })(request);
}
