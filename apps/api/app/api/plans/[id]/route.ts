import { NextRequest, NextResponse } from 'next/server';
import { getPlanByPublicId, updatePlan, deletePlan } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { planUpdateSchema } from '@rentalshop/utils';
import type { PlanUpdateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

/**
 * GET /api/plans/[id]
 * Get a specific plan by ID
 */
async function handleGetPlan(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    const { id: idParam } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(idParam)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    // Use the ID directly as string since getPlanByPublicId expects string
    const id = idParam;
    
    // Get plan using database function
    const plan = await getPlanByPublicId(id);

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
async function handleUpdatePlan(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    const { id: idParam } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(idParam)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const id = parseInt(idParam);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = planUpdateSchema.parse(body);

    // Update plan using database function
    const plan = await updatePlan(id, validatedData);

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
async function handleDeletePlan(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    const { id: idParam } = params;
    
    // Check if the ID is numeric
    if (!/^\d+$/.test(idParam)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const id = parseInt(idParam);

    // Delete plan using database function (permanent delete)
    const result = await deletePlan(id);

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

// Export functions with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetPlan(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdatePlan(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleDeletePlan(req, context, params)
  );
  return authenticatedHandler(request);
}
