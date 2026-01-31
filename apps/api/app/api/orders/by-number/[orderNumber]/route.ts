import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError, parseProductImages } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const runtime = 'nodejs';

/**
 * GET /api/orders/by-number/[orderNumber]
 * Get order by order number
 * 
 * Authorization: All roles with 'orders.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  let { orderNumber } = resolvedParams;
  
  return withApiLogging(
    withPermissions(['orders.view'])(async (request, { user, userScope }) => {
      try {
        // Get user scope for merchant isolation
        const userMerchantId = userScope.merchantId;
        // Check if user is ADMIN (handle both enum and string comparison)
        // USER_ROLE.ADMIN is 'ADMIN' string, so check both
        const isAdmin = user.role === USER_ROLE.ADMIN || 
                       (typeof user.role === 'string' && user.role.toUpperCase() === USER_ROLE.ADMIN);
        
        // Non-admin users need merchantId, admin can have null merchantId but should have one
        // For now, allow admin without merchantId to proceed (they can see all orders)
        // But ideally admin should have merchantId assigned
        if (!isAdmin && !userMerchantId) {
          return NextResponse.json(
            ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
            { status: 400 }
          );
        }
        
        // Try to find order - first try with the orderNumber as-is, then try without ORD- prefix
        let order: any = await db.orders.findByNumber(orderNumber);
        
        // If not found and orderNumber has ORD- prefix, try without it
        if (!order && orderNumber.startsWith('ORD-')) {
          const orderNumberWithoutPrefix = orderNumber.replace(/^ORD-/, '');
          order = await db.orders.findByNumber(orderNumberWithoutPrefix);
          if (order) {
            orderNumber = orderNumberWithoutPrefix; // Update for logging
          }
        }
        
        // If still not found and orderNumber doesn't have ORD- prefix, try with it
        if (!order && !orderNumber.startsWith('ORD-')) {
          const orderNumberWithPrefix = `ORD-${orderNumber}`;
          order = await db.orders.findByNumber(orderNumberWithPrefix);
        }

        if (!order) {
          return NextResponse.json(
            ResponseBuilder.error('ORDER_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }

        // Verify the order belongs to user's merchant
        // Order merchantId can be from order.merchantId or order.outlet.merchantId
        // Admin users with merchantId can only see orders from their merchant
        // Admin users without merchantId can see all orders
        if (!isAdmin || userMerchantId) {
          const orderMerchantId = order.merchantId || order.outlet?.merchantId;
          if (orderMerchantId !== userMerchantId) {
            return NextResponse.json(
              ResponseBuilder.error('ORDER_NOT_FOUND'),
              { status: API.STATUS.NOT_FOUND }
            );
          }
        }

      // Flatten order items with parsed productImages
      // Priority 1: Use productImages (snapshot field saved when order was created)
      // Priority 2: Fallback to product.images (from product relation - current images)
      const flattenedOrder = {
        ...order,
        orderItems: order.orderItems?.map((item: any) => {
          // Parse snapshot images first
          const snapshotImages = parseProductImages(item.productImages);
          // If snapshot is empty array, fallback to product.images
          const productImages = snapshotImages.length > 0 
            ? snapshotImages 
            : parseProductImages(item.product?.images);
          
          return {
            ...item,
            productImages: productImages
          };
        }) || order.orderItems
      };

      return NextResponse.json({
        success: true,
        data: flattenedOrder,
        code: 'ORDER_RETRIEVED_SUCCESS',
        message: 'Order retrieved successfully'
      });

      } catch (error: any) {
        // Error will be automatically logged by withApiLogging wrapper
        // Use unified error handling system (uses ResponseBuilder internally)
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    })
  )(request);
}