import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/plans/[id]
 * Get plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/plans/[id] - Looking for plan with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);
      
      // Get plan using the simplified database API
      const plan = await db.plans.findById(planId);

      if (!plan) {
        console.log('❌ Plan not found in database for planId:', planId);
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Plan found:', plan);

      return NextResponse.json({
        success: true,
        data: plan,
        code: 'PLAN_RETRIEVED_SUCCESS', message: 'Plan retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching plan:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch plan',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/plans/[id]
 * Update plan by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/plans/[id] - Update request body:', body);

      // Check if plan exists
      const existingPlan = await db.plans.findById(planId);
      if (!existingPlan) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Update the plan using the simplified database API
      const updatedPlan = await db.plans.update(planId, body);
      console.log('✅ Plan updated successfully:', updatedPlan);

      return NextResponse.json({
        success: true,
        data: updatedPlan,
        code: 'PLAN_UPDATED_SUCCESS', message: 'Plan updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating plan:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update plan',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/plans/[id]
 * Delete plan by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);

      // Check if plan exists
      const existingPlan = await db.plans.findById(planId);
      if (!existingPlan) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Soft delete by setting isActive to false
      const deletedPlan = await db.plans.update(planId, { isActive: false });
      console.log('✅ Plan soft deleted successfully:', deletedPlan);

      return NextResponse.json({
        success: true,
        data: deletedPlan,
        code: 'PLAN_DELETED_SUCCESS', message: 'Plan deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}