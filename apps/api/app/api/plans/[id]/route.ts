import { NextRequest, NextResponse } from 'next/server';
import { getPlanByPublicId, updatePlan, deletePlan } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';
import { planUpdateSchema } from '@rentalshop/utils';
import type { PlanUpdateInput } from '@rentalshop/types';

/**
 * GET /api/plans/[id]
 * Get a specific plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is ADMIN (only admins can view individual plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
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
        { status: 404 }
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
      { status: 500 }
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
    // Verify authentication and authorization
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is ADMIN (only admins can update plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
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
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
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
    // Verify authentication and authorization
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is ADMIN (only admins can delete plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
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
        { status: 404 }
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
      { status: 500 }
    );
  }
}
