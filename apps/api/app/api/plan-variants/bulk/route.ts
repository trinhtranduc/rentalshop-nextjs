import { NextRequest, NextResponse } from 'next/server';
import { 
  disableAllPlanVariants,
  enableAllPlanVariants,
  applyDiscountToAllVariants
} from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function POST(request: NextRequest) {
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

    // Check if user is ADMIN (only admins can perform bulk operations)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, planId, discount } = body;

    if (!action || !planId) {
      return NextResponse.json(
        { success: false, message: 'Action and planId are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'disable_all':
        result = await disableAllPlanVariants(planId);
        break;
      
      case 'enable_all':
        result = await enableAllPlanVariants(planId);
        break;
      
      case 'apply_discount':
        if (discount === undefined || discount < 0 || discount > 100) {
          return NextResponse.json(
            { success: false, message: 'Valid discount percentage (0-100) is required' },
            { status: 400 }
          );
        }
        result = await applyDiscountToAllVariants(planId, discount);
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Supported actions: disable_all, enable_all, apply_discount' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk operation '${action}' completed successfully`
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
