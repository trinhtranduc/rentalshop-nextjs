import { NextRequest, NextResponse } from 'next/server';
import { 
  getPlanVariantByPublicId, 
  updatePlanVariant, 
  deletePlanVariant,
  restorePlanVariant,
  permanentlyDeletePlanVariant
} from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { planVariantUpdateSchema } from '@rentalshop/utils';

export async function GET(
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

    // Check if user is ADMIN (only admins can view plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const variantId = parseInt(params.id);
    if (isNaN(variantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid variant ID' },
        { status: 400 }
      );
    }

    // Get plan variant by public ID
    const variant = await getPlanVariantByPublicId(variantId);

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: variant
    });

  } catch (error) {
    console.error('Error fetching plan variant:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check if user is ADMIN (only admins can update plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const variantId = parseInt(params.id);
    if (isNaN(variantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid variant ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = planVariantUpdateSchema.parse(body);

    // Update plan variant using database function
    const variant = await updatePlanVariant(variantId, validatedData);

    return NextResponse.json({
      success: true,
      data: variant,
      message: 'Plan variant updated successfully'
    });

  } catch (error) {
    console.error('Error updating plan variant:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', error: error.errors },
        { status: 400 }
      );
    }

    if (error.message === 'Plan variant not found') {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
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
 * DELETE /api/plan-variants/[id]
 * Delete a specific plan variant (permanent delete)
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

    // Check if user is ADMIN (only admins can delete plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const variantId = parseInt(params.id);
    if (isNaN(variantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid variant ID' },
        { status: 400 }
      );
    }

    // Check if permanent delete is requested
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    let result;
    if (permanent) {
      // Permanently delete plan variant
      result = await permanentlyDeletePlanVariant(variantId);
    } else {
      // Soft delete plan variant
      result = await deletePlanVariant(variantId);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: permanent ? 'Plan variant permanently deleted' : 'Plan variant deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting plan variant:', error);
    
    if (error.message === 'Plan variant not found') {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Cannot delete plan variant with active subscriptions') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete plan variant with active subscriptions' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
