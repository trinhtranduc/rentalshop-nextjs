import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

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
  
  return withPermissions(['orders.view'])(async (request, { user, userScope }) => {
    try {
      console.log('🔍 GET /api/orders/by-number/[orderNumber] - Looking for order with number:', orderNumber);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      // Check if user is ADMIN (handle both enum and string comparison)
      // USER_ROLE.ADMIN is 'ADMIN' string, so check both
      const isAdmin = user.role === USER_ROLE.ADMIN || 
                     (typeof user.role === 'string' && user.role.toUpperCase() === USER_ROLE.ADMIN);
      
      console.log('🔍 User role check:', {
        userRole: user.role,
        userRoleType: typeof user.role,
        USER_ROLE_ADMIN: USER_ROLE.ADMIN,
        USER_ROLE_ADMIN_type: typeof USER_ROLE.ADMIN,
        isAdmin,
        userMerchantId,
        userScope,
        userObject: JSON.stringify(user, null, 2)
      });
      
      // Non-admin users need merchantId, admin can have null merchantId but should have one
      // For now, allow admin without merchantId to proceed (they can see all orders)
      // But ideally admin should have merchantId assigned
      if (!isAdmin && !userMerchantId) {
        console.log('❌ Non-admin user without merchantId - blocking access');
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Warn if admin doesn't have merchantId (should be assigned)
      if (isAdmin && !userMerchantId) {
        console.log('⚠️ Admin user without merchantId - allowing access but should be assigned');
      }
      
      // If admin has merchantId, log it
      if (isAdmin && userMerchantId) {
        console.log('✅ Admin user with merchantId:', userMerchantId);
      }
      
      // Try to find order - first try with the orderNumber as-is, then try without ORD- prefix
      let order: any = await db.orders.findByNumber(orderNumber);
      
      // If not found and orderNumber has ORD- prefix, try without it
      if (!order && orderNumber.startsWith('ORD-')) {
        const orderNumberWithoutPrefix = orderNumber.replace(/^ORD-/, '');
        console.log('🔄 Trying without ORD- prefix:', orderNumberWithoutPrefix);
        order = await db.orders.findByNumber(orderNumberWithoutPrefix);
        if (order) {
          orderNumber = orderNumberWithoutPrefix; // Update for logging
        }
      }
      
      // If still not found and orderNumber doesn't have ORD- prefix, try with it
      if (!order && !orderNumber.startsWith('ORD-')) {
        const orderNumberWithPrefix = `ORD-${orderNumber}`;
        console.log('🔄 Trying with ORD- prefix:', orderNumberWithPrefix);
        order = await db.orders.findByNumber(orderNumberWithPrefix);
      }

      if (!order) {
        console.log('❌ Order not found in database for orderNumber:', orderNumber);
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
          console.log('❌ Order does not belong to user merchant:', {
            orderMerchantId,
            userMerchantId,
            isAdmin
          });
          return NextResponse.json(
            ResponseBuilder.error('ORDER_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
      } else {
        // Admin without merchantId can see all orders
        console.log('✅ Admin without merchantId - allowing access to all orders');
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
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}