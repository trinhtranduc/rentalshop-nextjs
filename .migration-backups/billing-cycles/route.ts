import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';

/**
 * GET /api/billing-cycles - Get billing cycles
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/billing-cycles - User: ${user.email}`);
  
  try {
    // TODO: Implement billing cycle functionality when model is added to schema
    return NextResponse.json(
      { success: false, message: 'Billing cycle functionality not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error fetching billing cycles:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch billing cycles' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/billing-cycles - Create billing cycle
 * REFACTORED: Now uses unified withAuthRoles pattern  
 */
export const POST = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  console.log(`📝 POST /api/billing-cycles - Admin: ${user.email}`);
  
  try {
    // TODO: Implement billing cycle functionality when model is added to schema
    return NextResponse.json(
      { success: false, message: 'Billing cycle functionality not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating billing cycle:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
