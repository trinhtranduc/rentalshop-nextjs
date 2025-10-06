import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[orderId]
 * Get order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { orderId } = params;
      console.log('🔍 GET /api/orders/[orderId] - Looking for order with ID:', orderId);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid order ID format' },
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          { success: false, message: 'User must be associated with a merchant' },
          { status: 400 }
        );
      }
      
      // Get order using the simplified database API
      const order = await db.orders.findById(orderIdNum);

      if (!order) {
        console.log('❌ Order not found in database for orderId:', orderIdNum);
        throw new Error('Order not found');
      }

      console.log('✅ Order found:', order);

      return NextResponse.json({
        success: true,
        data: order,
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

/**
 * PUT /api/orders/[orderId]
 * Update order by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { orderId } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid order ID format' },
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          { success: false, message: 'User must be associated with a merchant' },
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/orders/[orderId] - Update request body:', body);

      // Check if order exists and user has access to it
      const existingOrder = await db.orders.findById(orderIdNum);
      if (!existingOrder) {
        return NextResponse.json(
          { success: false, message: 'Order not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Update the order using the simplified database API
      const updatedOrder = await db.orders.update(orderIdNum, body);
      console.log('✅ Order updated successfully:', updatedOrder);

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating order:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}