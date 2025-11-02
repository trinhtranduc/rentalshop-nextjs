import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import type { Plan } from '@rentalshop/types';

/**
 * Get allowed CORS origins
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  return [
    ...corsOrigins,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://rental-client.up.railway.app',
    'https://rental-admin.up.railway.app',
    'https://dev-apis-development.up.railway.app',
    'https://apis-development.up.railway.app',
    'https://anyrent.shop',
    'https://www.anyrent.shop',
    'https://api.anyrent.shop',
    'https://admin.anyrent.shop',
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop',
    'https://dev-admin.anyrent.shop'
  ];
}

/**
 * Build CORS headers for response
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const allowOrigin = isAllowedOrigin ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

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
 * OPTIONS /api/plans/public
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
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
    }, {
      headers: buildCorsHeaders(request)
    });

  } catch (error) {
    console.error('Error fetching public plans:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}