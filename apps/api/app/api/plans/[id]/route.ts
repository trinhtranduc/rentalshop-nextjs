import { NextRequest, NextResponse } from 'next/server';
import { getPlanByPublicId, updatePlan, deletePlan } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { planUpdateSchema } from '@rentalshop/utils';
import type { PlanUpdateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

/**
 * GET /api/plans/[id]
 * Get a specific plan by ID
 */
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

    // Check if user is ADMIN (only admins can view individual plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { id } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const publicId = parseInt(id);
    
    // Get plan using database function
    const plan = await getPlanByPublicId(publicId);

    if (!plan) {
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/plans/[id]
 * Update a specific plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can update plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { id } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const publicId = parseInt(id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = planUpdateSchema.parse(body);

    // Update plan using database function
    const plan = await updatePlan(publicId, validatedData);

    return NextResponse.json({
      success: true,
      data: plan,
      message: 'Plan updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating plan:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', error: error.errors },
        { status: 400 }
      );
    }

    if (error.message === 'Plan not found') {
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/plans/[id]
 * Delete a specific plan (permanent delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can delete plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { id } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const publicId = parseInt(id);

    // Delete plan using database function (permanent delete)
    const result = await deletePlan(publicId);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Plan deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting plan:', error);
    
    if (error.message === 'Plan not found') {
      return NextResponse.json(
        { success: false, message: 'Plan not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error.message === 'Cannot delete plan with active subscriptions') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete plan with active subscriptions' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
