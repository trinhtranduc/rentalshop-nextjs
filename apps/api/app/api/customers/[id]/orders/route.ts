import { NextRequest, NextResponse } from 'next/server';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/customers/[id]/orders
 * Get customer orders
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const customerId = parseInt(params.id);
      if (isNaN(customerId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customer = await db.customer.findUnique({
        where: { id: customerId }
      });
      if (!customer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get orders for this customer
      const orders = await db.order.findMany({
        where: { customerId: customerId },
        include: {
          customer: true,
          outlet: true,
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await db.order.count({
        where: { customerId: customerId }
      });

      return NextResponse.json({
        success: true,
        data: orders,
        total: total
      });

    } catch (error) {
      console.error('Error fetching customer orders:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}