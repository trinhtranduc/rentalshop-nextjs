import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/customers/[id]/orders
 * Get customer orders
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const customerId = parseInt(params.id);
      if (isNaN(customerId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customer = await db.customers.findById(customerId);
      if (!customer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get orders for this customer
      const orders = await db.orders.search({
        customerId: customerId
      });

      return NextResponse.json({
        success: true,
        data: orders.data || [],
        total: orders.total || 0
      });

    } catch (error) {
      console.error('Error fetching customer orders:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}