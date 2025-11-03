import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/orders/by-number/[orderNumber]
 * Get order by order number
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
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
      
      const { orderNumber } = params;
      console.log('🔍 GET /api/orders/by-number/[orderNumber] - Looking for order with number:', orderNumber);
      
      // Get order by order number using Prisma
      const order: any = await db.order.findUnique({
        where: { orderNumber },
        include: {
          customer: true,
          outlet: true,
          createdBy: true,
          orderItems: {
            include: { product: true }
          },
          payments: true
        }
      });

      if (!order) {
        console.log('❌ Order not found in database for orderNumber:', orderNumber);
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Order found:', order);

      // Helper function to parse productImages (handle both JSON string and array)
      const parseProductImages = (images: any): string[] => {
        if (!images) return [];
        if (Array.isArray(images)) return images;
        if (typeof images === 'string') {
          try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      // Flatten order items with parsed productImages
      const flattenedOrder = {
        ...order,
        orderItems: order.orderItems?.map((item: any) => ({
          ...item,
          productImages: parseProductImages(item.productImages || item.product?.images)
        })) || order.orderItems
      };

      return NextResponse.json({
        success: true,
        data: flattenedOrder,
        code: 'ORDER_RETRIEVED_SUCCESS',
        message: 'Order retrieved successfully'
      });

    } catch (error: any) {
      console.error('❌ Error fetching order:', error);
      
      // Use ResponseBuilder for consistent error format
      const errorCode = error?.code || 'INTERNAL_SERVER_ERROR';
      const errorMessage = error?.message || 'An error occurred';
      
      return NextResponse.json(
        ResponseBuilder.error(errorCode, errorMessage),
        { status: 500 }
      );
    }
  })(request);
}