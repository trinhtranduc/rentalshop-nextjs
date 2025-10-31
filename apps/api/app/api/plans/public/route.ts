import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import type { Plan } from '@rentalshop/types';

/**
 * Helper function to generate pricing object from base price
 */
function generatePlanPricing(basePrice: number) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3 * 0.95, // 5% discount
      discount: 5,
      savings: basePrice * 3 * 0.05
    },
    sixMonths: {
      price: basePrice * 6 * 0.90, // 10% discount
      discount: 10,
      savings: basePrice * 6 * 0.10
    },
    yearly: {
      price: basePrice * 12 * 0.85, // 15% discount
      discount: 15,
      savings: basePrice * 12 * 0.15
    }
  };
}

/**
 * Transform raw Prisma plan to Plan type
 */
function transformPlan(plan: any): Plan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
    features: typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : (plan.features || []),
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    pricing: generatePlanPricing(plan.basePrice),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...(plan.deletedAt && { deletedAt: plan.deletedAt })
  };
}

/**
 * GET /api/plans/public
 * Get all active plans for public display (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get active plans using database function
    const result = await db.plans.search({ isActive: true, limit: 50 });
    
    // Transform raw Prisma data to Plan type
    const plans = result.data.map(transformPlan);

    return NextResponse.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching public plans:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}