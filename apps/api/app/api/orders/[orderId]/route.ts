import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError, formatFullName } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

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
      console.log(`🔍 PUT /api/orders/[orderId] - User: ${user.email} (${user.role})`);
      console.log(`🔍 PUT /api/orders/[orderId] - UserScope:`, userScope);

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
      
      if (!userMerchantId && user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/orders/[orderId] - Update request body:', body);

      // ✅ Auto-fill outletId from userScope if not provided
      if (!body.outletId && userScope.outletId) {
        console.log(`✅ Auto-filling outletId from userScope: ${userScope.outletId}`);
        body.outletId = userScope.outletId;
      }

      // Check if order exists and user has access to it
      const existingOrder = await db.orders.findById(orderIdNum);
      if (!existingOrder) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // ✅ Validate outletId if provided in update
      if (body.outletId !== undefined) {
        const targetOutletId = body.outletId;
        
        // If updating outletId, validate based on user role
        if (targetOutletId !== existingOrder.outletId) {
          // Get target outlet to validate
          const targetOutlet = await db.outlets.findById(targetOutletId);
          if (!targetOutlet) {
            return NextResponse.json(
              ResponseBuilder.error('OUTLET_NOT_FOUND'),
              { status: 404 }
            );
          }

          // Outlet users cannot change order outlet
          if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
            if (targetOutletId !== userScope.outletId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET'),
                { status: 403 }
              );
            }
          }

          // Non-admin users can only move to outlets from same merchant
          if (user.role !== USER_ROLE.ADMIN) {
            // Get existing order's outlet to check merchant
            const existingOutlet = await db.outlets.findById(existingOrder.outletId);
            if (!existingOutlet) {
              return NextResponse.json(
                ResponseBuilder.error('OUTLET_NOT_FOUND'),
                { status: 404 }
              );
            }

            if (targetOutlet.merchantId !== existingOutlet.merchantId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT'),
                { status: 403 }
              );
            }

            // Verify target outlet belongs to user's merchant
            if (targetOutlet.merchantId !== userScope.merchantId) {
              return NextResponse.json(
                ResponseBuilder.error('CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT'),
                { status: 403 }
              );
            }
          }
        } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
          // If not changing outletId but user is outlet-level, validate current order belongs to their outlet
          if (existingOrder.outletId !== userScope.outletId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET'),
              { status: 403 }
            );
          }
        }
      } else {
        // If no outletId in update, validate existing order belongs to user's scope
        if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
          if (existingOrder.outletId !== userScope.outletId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET'),
              { status: 403 }
            );
          }
        } else if (user.role !== USER_ROLE.ADMIN) {
          // Non-admin users can only update orders from their merchant
          const existingOutlet = await db.outlets.findById(existingOrder.outletId);
          if (existingOutlet && existingOutlet.merchantId !== userScope.merchantId) {
            return NextResponse.json(
              ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT'),
              { status: 403 }
            );
          }
        }
      }

      // Filter to only valid Order fields (exclude calculated fields like subtotal, taxAmount, id)
      const { subtotal, taxAmount, id, ...validUpdateData } = body;
      
      console.log('🔧 Filtered update data keys:', Object.keys(validUpdateData));

      // Update the order using the simplified database API
      const updatedOrder = await db.orders.update(orderIdNum, validUpdateData);
      console.log('✅ Order updated successfully:', updatedOrder);

      // Get full order details after update (with all relations)
      const fullOrder: any = await db.orders.findByIdDetail(orderIdNum);
      
      console.log('🔍 PUT /api/orders/[orderId]: Full order after update:', {
        orderId: orderIdNum,
        orderItemsCount: fullOrder?.orderItems?.length,
        firstItem: fullOrder?.orderItems?.[0],
        firstItemProduct: fullOrder?.orderItems?.[0]?.product,
        firstItemProductName: fullOrder?.orderItems?.[0]?.productName,
        firstItemHasProduct: !!fullOrder?.orderItems?.[0]?.product,
        firstItemHasProductName: !!fullOrder?.orderItems?.[0]?.productName
      });
      
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
        customerFirstName: fullOrder.customer?.firstName || null,
        customerLastName: fullOrder.customer?.lastName || null,
        customerName: fullOrder.customer ? formatFullName(fullOrder.customer.firstName, fullOrder.customer.lastName) : null,
        customerPhone: fullOrder.customer?.phone || null,
        customerEmail: fullOrder.customer?.email || null,
        merchantId: null, // Will be populated from outlet if needed
        merchantName: null, // Will be populated from outlet if needed
        createdById: fullOrder.createdById,
        createdByName: fullOrder.createdBy ? formatFullName(fullOrder.createdBy.firstName, fullOrder.createdBy.lastName) : null,
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
          const productName = item.product?.name || item.productName || null;
          const productBarcode = item.product?.barcode || item.productBarcode || null;

          console.log('🔍 PUT /api/orders/[orderId]: Mapping orderItem:', {
            itemId: item.id,
            productId: item.productId,
            hasProduct: !!item.product,
            productNameFromProduct: item.product?.name,
            productNameFromSnapshot: item.productName,
            finalProductName: productName,
            productBarcodeFromProduct: item.product?.barcode,
            productBarcodeFromSnapshot: item.productBarcode,
            finalProductBarcode: productBarcode
          });

          return {
            id: item.id,
            productId: item.productId,
            productName: productName,
            productBarcode: productBarcode,
            productImages: productImages,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            deposit: item.deposit,
            notes: item.notes,
            rentalDays: item.rentalDays,
            // Include product object if available (for backward compatibility)
            product: item.product || null
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

/**
 * DELETE /api/orders/[orderId]
 * Soft delete order by ID
 * 
 * Authorization: Users with 'orders.manage' permission can delete orders
 * - OUTLET_ADMIN can only delete orders from their outlet
 * - MERCHANT can delete orders from their merchant
 * - ADMIN can delete any order
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.manage'])(async (request, { user, userScope }) => {
    try {
      console.log(`🔍 DELETE /api/orders/[orderId] - User: ${user.email} (${user.role})`);
      console.log(`🔍 DELETE /api/orders/[orderId] - UserScope:`, userScope);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(orderId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ORDER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const orderIdNum = parseInt(orderId);

      // Check if order exists and user has access to it
      const existingOrder = await db.orders.findById(orderIdNum);
      if (!existingOrder) {
        return NextResponse.json(
          ResponseBuilder.error('ORDER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Authorization checks based on user role
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users can only delete orders from their outlet
        if (existingOrder.outletId !== userScope.outletId) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_ORDER_FROM_OTHER_OUTLET'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      } else if (user.role !== USER_ROLE.ADMIN) {
        // Non-admin users can only delete orders from their merchant
        const existingOutlet = await db.outlets.findById(existingOrder.outletId);
        if (existingOutlet && existingOutlet.merchantId !== userScope.merchantId) {
          return NextResponse.json(
            ResponseBuilder.error('CANNOT_DELETE_ORDER_FROM_OTHER_MERCHANT'),
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Soft delete the order
      await db.orders.softDelete(orderIdNum);
      console.log('✅ Order soft deleted successfully:', orderIdNum);

      return NextResponse.json(
        ResponseBuilder.success('ORDER_DELETED_SUCCESS', {
          id: orderIdNum,
          deletedAt: new Date().toISOString()
        })
      );

    } catch (error: any) {
      console.error('❌ Error deleting order:', error);
      
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}