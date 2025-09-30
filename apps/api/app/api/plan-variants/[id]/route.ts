import { NextRequest, NextResponse } from 'next/server';
import { 
  getPlanVariantByPublicId, 
  updatePlanVariant, 
  deletePlanVariant,
  restorePlanVariant,
  permanentlyDeletePlanVariant
} from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { planVariantUpdateSchema } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

async function handleGetPlanVariant(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Use the ID directly as string since getPlanVariantByPublicId expects string
    const variantId = params.id;
    if (!variantId) {
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
        { status: API.STATUS.NOT_FOUND }
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

async function handleUpdatePlanVariant(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Use the ID directly as string since updatePlanVariant expects string
    const variantId = params.id;
    if (!variantId) {
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
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', error: (error as any).errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Plan variant not found') {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
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
 * DELETE /api/plan-variants/[id]
 * Delete a specific plan variant (permanent delete)
 */
async function handleDeletePlanVariant(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    // Use the ID directly as string since delete functions expect string
    const variantId = params.id;
    if (!variantId) {
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
    
    if (error instanceof Error && error.message === 'Plan variant not found') {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error instanceof Error && error.message === 'Cannot delete plan variant with active subscriptions') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete plan variant with active subscriptions' },
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
    handleGetPlanVariant(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdatePlanVariant(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleDeletePlanVariant(req, context, params)
  );
  return authenticatedHandler(request);
}
