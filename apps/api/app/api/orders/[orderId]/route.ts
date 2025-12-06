import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[orderId]
 * Get order by ID
 * 
 * Authorization: All roles with 'orders.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * - No subscription required (read-only operation)
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.view'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
    try {
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
      const order: any = await db.orders.findByIdDetail(orderIdNum);

      if (!order) {
        console.log('❌ Order not found in database for orderId:', orderIdNum);
        throw new Error('Order not found');
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

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedOrder = {
        ...flattenedOrder,
        createdAt: flattenedOrder.createdAt?.toISOString() || null,
        updatedAt: flattenedOrder.updatedAt?.toISOString() || null,
        pickupPlanAt: flattenedOrder.pickupPlanAt?.toISOString() || null,
        returnPlanAt: flattenedOrder.returnPlanAt?.toISOString() || null,
        pickedUpAt: flattenedOrder.pickedUpAt?.toISOString() || null,
        returnedAt: flattenedOrder.returnedAt?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedOrder,
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

/**
 * PUT /api/orders/[orderId]
 * Update order by ID
 * 
 * Authorization: All roles with 'orders.update' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.update'])(async (request, { user, userScope }) => {
    try {

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

      // Get full order details after update (with all relations)
      const fullOrder: any = await db.orders.findByIdDetail(orderIdNum);
      
      if (!fullOrder) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }
      
      // Flatten order response (consistent with create order response)
      const flattenedOrder = {
        id: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
        orderType: fullOrder.orderType,
        status: fullOrder.status,
        outletId: fullOrder.outletId,
        outletName: fullOrder.outlet?.name || null,
        customerId: fullOrder.customerId,
        customerName: fullOrder.customer ? `${fullOrder.customer.firstName} ${fullOrder.customer.lastName}`.trim() : null,
        customerPhone: fullOrder.customer?.phone || null,
        customerEmail: fullOrder.customer?.email || null,
        merchantId: null, // Will be populated from outlet if needed
        merchantName: null, // Will be populated from outlet if needed
        createdById: fullOrder.createdById,
        createdByName: fullOrder.createdBy ? `${fullOrder.createdBy.firstName} ${fullOrder.createdBy.lastName}`.trim() : null,
        totalAmount: fullOrder.totalAmount,
        depositAmount: fullOrder.depositAmount,
        securityDeposit: fullOrder.securityDeposit,
        damageFee: fullOrder.damageFee,
        lateFee: fullOrder.lateFee,
        discountType: fullOrder.discountType,
        discountValue: fullOrder.discountValue,
        discountAmount: fullOrder.discountAmount,
        pickupPlanAt: fullOrder.pickupPlanAt,
        returnPlanAt: fullOrder.returnPlanAt,
        pickedUpAt: fullOrder.pickedUpAt,
        returnedAt: fullOrder.returnedAt,
        rentalDuration: fullOrder.rentalDuration,
        isReadyToDeliver: fullOrder.isReadyToDeliver,
        collateralType: fullOrder.collateralType,
        collateralDetails: fullOrder.collateralDetails,
        notes: fullOrder.notes,
        pickupNotes: fullOrder.pickupNotes,
        returnNotes: fullOrder.returnNotes,
        damageNotes: fullOrder.damageNotes,
        createdAt: fullOrder.createdAt,
        updatedAt: fullOrder.updatedAt,
        // Flatten order items with product info
        orderItems: fullOrder.orderItems?.map((item: any) => {
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

          const productImages = parseProductImages(item.productImages || item.product?.images);

          return {
            id: item.id,
            productId: item.productId,
            productName: item.product?.name || item.productName || null,
            productBarcode: item.product?.barcode || item.productBarcode || null,
            productImages: productImages,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            deposit: item.deposit,
            notes: item.notes,
            rentalDays: item.rentalDays
          };
        }) || [],
        // Calculated fields
        itemCount: fullOrder.orderItems?.length || 0,
        paymentCount: fullOrder.payments?.length || 0,
        totalPaid: fullOrder.payments?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) || 0
      };

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedOrder = {
        ...flattenedOrder,
        createdAt: flattenedOrder.createdAt?.toISOString() || null,
        updatedAt: flattenedOrder.updatedAt?.toISOString() || null,
        pickupPlanAt: flattenedOrder.pickupPlanAt?.toISOString() || null,
        returnPlanAt: flattenedOrder.returnPlanAt?.toISOString() || null,
        pickedUpAt: flattenedOrder.pickedUpAt?.toISOString() || null,
        returnedAt: flattenedOrder.returnedAt?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedOrder,
        code: 'ORDER_UPDATED_SUCCESS',
        message: 'Order updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Error updating order:', error);
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}