import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/payments
 * Get merchant payments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const merchantPublicId = parseInt(params.id);
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid merchant ID' },
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          { success: false, message: 'Merchant not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // TODO: Implement merchant payments functionality
      return NextResponse.json(
        { success: false, message: 'Merchant payments functionality not yet implemented' },
        { status: 501 }
      );

    } catch (error) {
      console.error('Error fetching merchant payments:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}