import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/plans/[id]/variants
 * Get plan variants
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const planId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(planId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'), { status: 400 });
      }

      // TODO: Implement plan variants functionality when model is added to schema
      return NextResponse.json(
        ResponseBuilder.error('FEATURE_NOT_IMPLEMENTED'),
        { status: 501 }
      );
    } catch (error) {
      console.error('Error fetching plan variants:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * POST /api/plans/[id]/variants
 * Create plan variant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      const planId = parseInt(params.id);
      
      if (isNaN(planId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'), { status: 400 });
      }

      // TODO: Implement plan variants functionality when model is added to schema
      return NextResponse.json(
        ResponseBuilder.error('FEATURE_NOT_IMPLEMENTED'),
        { status: 501 }
      );
    } catch (error) {
      console.error('Error creating plan variant:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}