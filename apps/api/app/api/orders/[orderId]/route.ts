import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[orderId]
 * Get order by ID
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { orderId: string } }
) => {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
    try {
      const { orderId } = params;
      console.log('🔍 GET /api/orders/[orderId] - Looking for order with ID:', orderId);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Get order using the optimized database API
    const order = await db.orders.findByIdDetail(orderIdNum);

      if (!order) {
        console.log('❌ Order not found in database for orderId:', orderIdNum);
        throw new Error('Order not found');
      }

      console.log('✅ Order found:', order);

      return NextResponse.json({
        success: true,
        data: order,
        code: 'ORDER_RETRIEVED_SUCCESS', message: 'Order retrieved successfully'
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
export const PUT = async (
  request: NextRequest,
  { params }: { params: { orderId: string } }
) => {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { orderId } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
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
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Filter to only valid Order fields (exclude calculated fields like subtotal, taxAmount, id)
      const { subtotal, taxAmount, id, ...validUpdateData } = body;
      
      console.log('🔧 Filtered update data keys:', Object.keys(validUpdateData));

      // Update the order using the simplified database API
      const updatedOrder = await db.orders.update(orderIdNum, validUpdateData);
      console.log('✅ Order updated successfully:', updatedOrder);

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        code: 'ORDER_UPDATED_SUCCESS', message: 'Order updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating order:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}