import { NextRequest, NextResponse } from 'next/server';
import { getActivePlanVariants } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

async function handleGetPlanVariants(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetPlanVariants(req, context, params)
  );
  return authenticatedHandler(request);
}
