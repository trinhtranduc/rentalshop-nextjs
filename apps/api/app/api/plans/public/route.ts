import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import type { Plan } from '@rentalshop/types';
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { handleCorsPreflight } from '@/lib/cors';

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
      price: basePrice * 3, // 0% discount
      discount: 0,
      savings: 0
    },
    semi_annual: {
      price: basePrice * 6 * 0.95, // 5% discount
      discount: 5,
      savings: basePrice * 6 * 0.05
    },
    annual: {
      price: basePrice * 12 * 0.90, // 10% discount
      discount: 10,
      savings: basePrice * 12 * 0.10
    }
  };
}

/**
 * Transform raw Prisma plan to Plan type
 */
function transformPlan(plan: any): Plan {
  try {
    // Parse limits safely
    let parsedLimits;
    if (typeof plan.limits === 'string') {
      try {
        parsedLimits = JSON.parse(plan.limits);
      } catch {
        parsedLimits = {};
      }
    } else {
      parsedLimits = plan.limits || {};
    }

    // Parse features safely
    let parsedFeatures;
    if (typeof plan.features === 'string') {
      try {
        parsedFeatures = JSON.parse(plan.features || '[]');
      } catch {
        parsedFeatures = [];
      }
    } else {
      parsedFeatures = plan.features || [];
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency || 'USD',
      trialDays: plan.trialDays || 0,
      limits: parsedLimits,
      features: parsedFeatures,
      isActive: plan.isActive ?? true,
      isPopular: plan.isPopular ?? false,
      sortOrder: plan.sortOrder ?? 0,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      ...(plan.deletedAt && { deletedAt: plan.deletedAt })
    };
  } catch (error) {
    // Error will be logged by caller's error handler
    throw new Error(`Failed to transform plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * OPTIONS /api/plans/public
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, 'GET, OPTIONS', 'Content-Type, Authorization');
}

/**
 * GET /api/plans/public
 * Get all active plans for public display (no authentication required)
 */
export const GET = withApiLogging(async (request: NextRequest) => {
  try {
    // Get active plans using database function
    const result = await db.plans.search({ isActive: true, limit: 50 });
    
    // Validate result structure
    if (!result || !result.data || !Array.isArray(result.data)) {
      throw new Error('Invalid data structure received from database');
    }
    
    // Transform raw Prisma data to Plan type
    const plans = result.data.map(transformPlan).filter(plan => plan !== null);

    // ✅ CORS headers automatically added by withApiLogging wrapper
    return NextResponse.json(
      ResponseBuilder.success('PLANS_RETRIEVED_SUCCESS', plans)
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // ✅ CORS headers automatically added by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);