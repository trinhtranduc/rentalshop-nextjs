import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API, USER_ROLE, ORDER_STATUS } from '@rentalshop/constants';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * Batch delete schema
 */
const batchDeleteSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1, 'At least one order ID is required').max(100, 'Cannot delete more than 100 orders at once'),
});

/**
 * POST /api/orders/batch-delete
 * Soft delete multiple orders in batch
 * 
 * Authorization: Users with 'orders.manage' permission can delete orders
 * - ADMIN: can delete any orders regardless of status
 * - MERCHANT, OUTLET_ADMIN: can only delete CANCELLED orders
 * - OUTLET_STAFF: cannot delete orders (no orders.manage permission)
 */
export const POST = withPermissions(['orders.manage'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 POST /api/orders/batch-delete - User: ${user.email} (${user.role})`);
    console.log(`🔍 POST /api/orders/batch-delete - UserScope:`, userScope);

    const body = await request.json();
    
    // Validate input
    const parsed = batchDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { orderIds } = parsed.data;

    // OUTLET_STAFF cannot delete orders
    if (user.role === USER_ROLE.OUTLET_STAFF) {
      return NextResponse.json(
        ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Fetch all orders to validate
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        deletedAt: null, // Only non-deleted orders
      },
      include: {
        outlet: {
          select: {
            id: true,
            merchantId: true,
          },
        },
      },
    });

    // Check if all orders exist
    const foundIds = new Set(orders.map(o => o.id));
    const notFoundIds = orderIds.filter(id => !foundIds.has(id));
    
    if (notFoundIds.length > 0) {
      const errorResponse = ResponseBuilder.error('SOME_ORDERS_NOT_FOUND');
      return NextResponse.json(
        {
          ...errorResponse,
          data: { notFoundIds },
        },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Validate all orders are CANCELLED (only for non-ADMIN users)
    // ADMIN can delete any orders regardless of status
    if (user.role !== USER_ROLE.ADMIN) {
      const nonCancelledOrders = orders.filter(o => o.status !== ORDER_STATUS.CANCELLED);
      if (nonCancelledOrders.length > 0) {
        const errorResponse = ResponseBuilder.error('CANNOT_DELETE_NON_CANCELLED_ORDER');
        return NextResponse.json(
          {
            ...errorResponse,
            data: {
              nonCancelledOrderIds: nonCancelledOrders.map(o => o.id),
              nonCancelledOrderNumbers: nonCancelledOrders.map(o => o.orderNumber),
            },
          },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // Authorization checks based on user role
    const unauthorizedOrders: Array<{ id: number; orderNumber: string; reason: string }> = [];

    for (const order of orders) {
      if (user.role === USER_ROLE.OUTLET_ADMIN) {
        // Outlet admin can only delete orders from their outlet
        if (order.outletId !== userScope.outletId) {
          unauthorizedOrders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            reason: 'Order belongs to different outlet',
          });
        }
      } else if (user.role === USER_ROLE.MERCHANT) {
        // Merchant can only delete orders from their merchant
        if (order.outlet.merchantId !== userScope.merchantId) {
          unauthorizedOrders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            reason: 'Order belongs to different merchant',
          });
        }
      }
      // ADMIN can delete any order (no additional checks)
    }

    if (unauthorizedOrders.length > 0) {
      const errorResponse = ResponseBuilder.error('UNAUTHORIZED_TO_DELETE_SOME_ORDERS');
      return NextResponse.json(
        {
          ...errorResponse,
          data: { unauthorizedOrders },
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // All validations passed - proceed with batch delete in transaction
    const deletedOrders: Array<{ id: number; orderNumber: string }> = [];
    const errors: Array<{ id: number; orderNumber: string; error: string }> = [];

    try {
      // Use transaction to ensure all-or-nothing deletion
      await prisma.$transaction(
        async (tx) => {
          for (const order of orders) {
            try {
              await tx.order.update({
                where: { id: order.id },
                data: { deletedAt: new Date() },
              });
              deletedOrders.push({
                id: order.id,
                orderNumber: order.orderNumber,
              });
            } catch (error: any) {
              errors.push({
                id: order.id,
                orderNumber: order.orderNumber,
                error: error.message || 'Failed to delete order',
              });
              // If any order fails, throw to rollback transaction
              throw error;
            }
          }
        },
        {
          timeout: 30000, // 30 seconds timeout
          maxWait: 10000, // 10 seconds max wait
        }
      );

      console.log(`✅ Batch deleted ${deletedOrders.length} orders successfully`);

      return NextResponse.json(
        ResponseBuilder.success('ORDERS_BATCH_DELETED_SUCCESS', {
          deleted: deletedOrders.length,
          total: orderIds.length,
          deletedOrders,
        })
      );
    } catch (error: any) {
      console.error('❌ Error in batch delete transaction:', error);
      
      // Transaction failed - return error
      const errorResponse = ResponseBuilder.error('BATCH_DELETE_FAILED');
      return NextResponse.json(
        {
          ...errorResponse,
          data: {
            deleted: deletedOrders.length,
            failed: errors.length,
            errors,
          },
        },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in batch delete:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
