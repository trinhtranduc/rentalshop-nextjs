import { NextRequest, NextResponse } from 'next/server';
import { getActivePlanVariants } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

export async function GET(
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

    // Check if user is ADMIN (only admins can view plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const planId = params.id;
    if (!planId) {
      return NextResponse.json(
        { success: false, message: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get active plan variants for the plan
    const variants = await getActivePlanVariants(planId);

    return NextResponse.json({
      success: true,
      data: {
        variants,
        total: variants.length
      }
    });

  } catch (error) {
    console.error('Error fetching plan variants:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
