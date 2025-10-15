import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const runtime = 'nodejs';

/**
 * GET /api/orders/by-number/[orderNumber]
 * Get order by order number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { orderNumber } = params;
      console.log('🔍 GET /api/orders/by-number/[orderNumber] - Looking for order with number:', orderNumber);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Get order by order number using the simplified database API
      const order = await db.orders.findByNumber(orderNumber);

      if (!order) {
        console.log('❌ Order not found in database for orderNumber:', orderNumber);
        return NextResponse.json(
          { success: false, message: 'Order not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Order found:', order);

      return NextResponse.json({
        success: true,
        data: order,
        code: 'ORDER_RETRIEVED_SUCCESS',
        message: 'Order retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching order:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}