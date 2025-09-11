import { NextRequest, NextResponse } from 'next/server';
import { 
  getDeletedPlanVariants,
  restorePlanVariant
} from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export async function GET(request: NextRequest) {
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

    // Check if user is ADMIN (only admins can view deleted plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get deleted plan variants
    const deletedVariants = await getDeletedPlanVariants();

    return NextResponse.json({
      success: true,
      data: {
        variants: deletedVariants,
        total: deletedVariants.length
      }
    });

  } catch (error) {
    console.error('Error fetching deleted plan variants:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user is ADMIN (only admins can restore plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Parse request body
    const body = await request.json();
    const { variantId } = body;

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'Variant ID is required' },
        { status: 400 }
      );
    }

    // Restore plan variant
    const result = await restorePlanVariant(variantId);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Plan variant restored successfully'
    });

  } catch (error) {
    console.error('Error restoring plan variant:', error);
    
    if (error.message === 'Plan variant not found') {
      return NextResponse.json(
        { success: false, message: 'Plan variant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    if (error.message === 'Plan variant is already active') {
      return NextResponse.json(
        { success: false, message: 'Plan variant is already active' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
