import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
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
    console.error('Error transforming plan:', error, plan);
    throw new Error(`Failed to transform plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
    
    // Validate result structure
    if (!result || !result.data || !Array.isArray(result.data)) {
      console.error('Invalid result structure from db.plans.search:', result);
      throw new Error('Invalid data structure received from database');
    }
    
    // Transform raw Prisma data to Plan type
    const plans = result.data.map(transformPlan).filter(plan => plan !== null);

    return NextResponse.json(
      ResponseBuilder.success('PLANS_RETRIEVED_SUCCESS', plans),
      {
        headers: buildCorsHeaders(request)
      }
    );

  } catch (error) {
    console.error('Error fetching public plans:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { 
      status: statusCode,
      headers: buildCorsHeaders(request)
    });
  }
}