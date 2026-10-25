import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ORDER_STATUS, PLATFORM_OPS_ROLES, canChangeOrderStatus, isOutletRole } from '@rentalshop/constants';
import { z } from 'zod';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { buildOrderAuditSnapshot, safeAudit } from '../../../../../lib/change-timeline';
import { shapeOrderPayments } from '../../../../../lib/order-payments';
import {
  cancelAuditDescription,
  loadShop,
  parseCancelRequest,
  planCancellation,
  recomputeDepositFromPayments,
  recordPlanCancellation,
  type PlanCancellation,
  shapeOrderInstallments,
  unpaidAtPickupBody,
  unpaidStagesBlockingPickup,
} from '../../../../../lib/installments';
import { parseDepositPlan } from '../../../../../../../packages/utils/src/core/deposit-plan';
import { API } from '@rentalshop/constants';
import {
  handleLoyaltyOnCancel,
  merchantHasLoyaltyFeature,
  processEarnOnStatusChange,
} from '@rentalshop/loyalty';

// Schema for status update
const statusUpdateSchema = z.object({
  status: z.enum([
    ORDER_STATUS.RESERVED,
    ORDER_STATUS.PICKUPED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED
  ] as [string, ...string[]]),
  notes: z.string().optional(),
  pickupNotes: z.string().optional(),
  returnNotes: z.string().optional(),
  // #1199: a hand-over time decides which stage payments count as "collected before delivery": it must be a real date
  pickedUpAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date').optional(),
  returnedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date').optional(),
  // Return-specific fields for collateral management
  returnAmount: z.number().optional(), // Amount to return to customer
  collateralReturned: z.boolean().optional(), // Whether collateral was returned
  collateralType: z.string().optional(), // Type of collateral (if any)
  collateralDetails: z.string().optional(), // Details about collateral
  // #1199 cancelling a plan order: what the shop keeps of the collected deposit (default 0 = refund everything)
  cancelKeptAmount: z.number().optional(),
  cancelNote: z.string().max(500).optional(),
});

/**
 * PATCH /api/orders/[orderId]/status
 * Update order status with additional metadata
 * 
 * Authorization: All roles with 'orders.update' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * This endpoint is specifically designed for status updates and includes:
 * - Status change validation
 * - Automatic timestamp updates for pickup/return
 * - Notes and metadata handling
 * - Proper authorization checks
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;
  
  return withPermissions(['orders.update'])(async (request: NextRequest, { user, userScope }) => {
    try {
      
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Order ID is required' },
          { status: 400 }
        );
      }

    // Parse and validate request body
    const body = await request.json();
    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request data',
        details: parsed.error.flatten()
      }, { status: 400 });
    }

    const { 
      status, 
      notes, 
      pickupNotes, 
      returnNotes, 
      pickedUpAt, 
      returnedAt,
      returnAmount,
      collateralReturned,
      collateralType,
      collateralDetails
    } = parsed.data;

    // Get existing order to check current status and timestamps
    const orderPublicId = parseInt(orderId);
    if (isNaN(orderPublicId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }
    
    const existingOrder = await db.orders.findById(orderPublicId);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Scope (#361): outlet roles only their outlet, other merchant roles only their merchant
    if (isOutletRole(user.role)) {
      if (existingOrder.outletId !== userScope.outletId) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    } else if (!(PLATFORM_OPS_ROLES as readonly string[]).includes(user.role)) {
      const orderOutlet = await db.outlets.findById(existingOrder.outletId);
      if (!orderOutlet || orderOutlet.merchantId !== userScope.merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT'),
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // Only valid status changes (#361); the same status again is a no-op
    if (!canChangeOrderStatus(existingOrder.orderType, existingOrder.status, status)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_ORDER_STATUS'),
        { status: 400 }
      );
    }

    // #1199: an order with explicit deposit stages still unpaid cannot be handed over (the `rest` stage never blocks).
    // `error` is empty on purpose: the installed Android app shows `error` before `message`.
    const orderHasPlan = parseDepositPlan((existingOrder as any).depositPlan) != null;
    if (orderHasPlan && status === ORDER_STATUS.PICKUPED && existingOrder.status !== ORDER_STATUS.PICKUPED) {
      const planOutlet = await db.outlets.findById(existingOrder.outletId);
      const planShop = await loadShop(prisma, planOutlet?.merchantId);
      const unpaid = unpaidStagesBlockingPickup(existingOrder as any, planShop);
      if (unpaid) return NextResponse.json(unpaidAtPickupBody(unpaid), { status: 400 });
    }

    // #1199: cancelling a plan order. Amounts are checked before anything changes; the refund is recorded after.
    const cancelAt = new Date();
    let cancelPlan: PlanCancellation | null = null;
    const isCancelling = status === ORDER_STATUS.CANCELLED && existingOrder.status !== ORDER_STATUS.CANCELLED;
    if (isCancelling) {
      const checked = await planCancellation(prisma, {
        order: existingOrder as any,
        role: user.role,
        request: parseCancelRequest(parsed.data),
      });
      if ('error' in checked) {
        return NextResponse.json(ResponseBuilder.error(checked.error.code), { status: checked.error.status });
      }
      cancelPlan = checked.plan;
    }

    // Build update input with automatic timestamp handling
    const updateInput: any = {
      ...(isCancelling ? { cancelledAt: cancelAt } : {}),
      status,
      ...(notes && { notes }),
      ...(pickupNotes && { pickupNotes }),
      ...(returnNotes && { returnNotes }),
      // Return-specific fields
      ...(collateralType && { collateralType }),
      ...(collateralDetails && { collateralDetails }),
    };

    // ============================================================================
    // TỰ ĐỘNG SET TIMESTAMP KHI STATUS THAY ĐỔI
    // ============================================================================
    // CRITICAL: Luôn set pickedUpAt khi status là PICKUPED
    // - Nếu status thay đổi từ khác sang PICKUPED: luôn set timestamp (trừ khi đã có)
    // - Nếu status đã là PICKUPED: chỉ set nếu chưa có
    if (status === ORDER_STATUS.PICKUPED) {
      const isStatusChanging = existingOrder.status !== ORDER_STATUS.PICKUPED;
      
      if (pickedUpAt) {
        // Sử dụng timestamp được cung cấp
        updateInput.pickedUpAt = pickedUpAt;
        console.log('✅ Using provided pickedUpAt timestamp');
      } else if (!existingOrder.pickedUpAt) {
        // Tự động set nếu chưa có (null hoặc missing)
        updateInput.pickedUpAt = new Date().toISOString();
        console.log(`✅ Auto-setting pickedUpAt for PICKUPED order${isStatusChanging ? ' (status changed)' : ''}`);
      } else if (isStatusChanging) {
        // Nếu status đang thay đổi sang PICKUPED và đã có timestamp, vẫn cập nhật để đảm bảo chính xác
        updateInput.pickedUpAt = new Date().toISOString();
        console.log('✅ Updating pickedUpAt for status change to PICKUPED');
      }
      // Nếu status đã là PICKUPED và đã có timestamp, giữ nguyên (không override)
    }
    
    // CRITICAL: Luôn set returnedAt khi status là RETURNED
    // - Nếu status thay đổi từ khác sang RETURNED: luôn set timestamp (trừ khi đã có)
    // - Nếu status đã là RETURNED: chỉ set nếu chưa có
    if (status === ORDER_STATUS.RETURNED) {
      const isStatusChanging = existingOrder.status !== ORDER_STATUS.RETURNED;
      
      if (returnedAt) {
        // Sử dụng timestamp được cung cấp
        updateInput.returnedAt = returnedAt;
        console.log('✅ Using provided returnedAt timestamp');
      } else if (!existingOrder.returnedAt) {
        // Tự động set nếu chưa có (null hoặc missing)
        updateInput.returnedAt = new Date().toISOString();
        console.log(`✅ Auto-setting returnedAt for RETURNED order${isStatusChanging ? ' (status changed)' : ''}`);
      } else if (isStatusChanging) {
        // Nếu status đang thay đổi sang RETURNED và đã có timestamp, vẫn cập nhật để đảm bảo chính xác
        updateInput.returnedAt = new Date().toISOString();
        console.log('✅ Updating returnedAt for status change to RETURNED');
      }
      // Nếu status đã là RETURNED và đã có timestamp, giữ nguyên (không override)
      
      // Enhanced return handling with collateral management
      if (returnAmount === undefined) {
        // If no return amount specified, calculate it automatically
        // This will be calculated in the database update function
        console.log('🔄 Return status detected - will calculate return amount automatically');
      }
      
      // Log collateral information for returns
      if (collateralReturned !== undefined || collateralType || collateralDetails) {
        console.log('💎 Collateral return information provided:', {
          collateralReturned,
          collateralType,
          collateralDetails
        });
      }
    }

    // Update the order (orderPublicId already validated above)
    const updatedOrder = await db.orders.update(orderPublicId, updateInput);
    // #1199: the hand-over time may have moved; depositAmount follows the stage payments taken before it
    if (orderHasPlan) await recomputeDepositFromPayments(prisma, orderPublicId);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    const outlet = await db.outlets.findById(updatedOrder.outletId);
    const merchantId = outlet?.merchantId;

    // #1199: what went back and what the shop kept. If this fails the order stays cancelled with no amounts, which
    // every screen reads as "everything refunded" (the old behaviour); the failure is logged.
    if (cancelPlan) {
      try {
        const cancelShop = await loadShop(prisma, merchantId);
        await recordPlanCancellation(prisma, {
          orderId: orderPublicId,
          merchantId,
          currency: cancelShop.currency,
          plan: cancelPlan,
          userId: user.id,
          at: cancelAt,
        });
        await safeAudit('cancel', () => createAuditHelper(prisma).logCustom({
          action: 'CUSTOM',
          entityType: 'Order',
          entityId: String(orderPublicId),
          entityName: existingOrder.orderNumber || String(orderPublicId),
          description: cancelAuditDescription(existingOrder.orderNumber || String(orderPublicId), cancelPlan as PlanCancellation),
          category: 'BUSINESS',
          oldValues: { collected: cancelPlan.collected },
          newValues: { kept: cancelPlan.kept, refunded: cancelPlan.refund, note: cancelPlan.note ?? null },
          context: {
            userId: String(user.id),
            userEmail: user.email,
            userRole: user.role,
            merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
            outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            requestId: request.headers.get('x-request-id') || undefined,
          },
        }));
      } catch (cancelError) {
        console.error('⚠️ Recording the cancel refund failed (order is cancelled; everything counts as refunded):', cancelError);
      }
    }

    // Loyalty hooks — only for CANCELLED/RETURNED (avoid feature query on unrelated status changes).
    // Fail-open (INV-6): the status change is already committed above; loyalty must never block it.
    if (
      merchantId &&
      (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.RETURNED)
    ) {
      try {
        if (await merchantHasLoyaltyFeature(merchantId)) {
          if (status === ORDER_STATUS.CANCELLED) {
            await prisma.$transaction(async (tx) => {
              await handleLoyaltyOnCancel(tx, updatedOrder, merchantId);
            });
          } else {
            const latestOrder = await db.orders.findById(orderPublicId);
            if (latestOrder) {
              await prisma.$transaction(async (tx) => {
                await processEarnOnStatusChange(tx, latestOrder, merchantId, { id: user.id });
              });
            }
          }
        }
      } catch (loyaltyError) {
        // Fail-open: log and continue — order status change stays committed.
        console.error(
          `⚠️ Loyalty ${status} hook failed (order status still updated):`,
          loyaltyError
        );
      }
    }

    const finalOrder = (await db.orders.findById(orderPublicId)) || updatedOrder;

    // #519: pickup ("Giao đồ"), return ("Nhận trả"), cancel and complete show in the change history
    await safeAudit('status', () => createAuditHelper(prisma).logUpdate({
      entityType: 'Order',
      entityId: String(orderPublicId),
      entityName: existingOrder.orderNumber || String(orderPublicId),
      oldValues: buildOrderAuditSnapshot(existingOrder),
      newValues: buildOrderAuditSnapshot(finalOrder),
      description: `Order status: ${existingOrder.status} → ${status}`,
      context: {
        userId: String(user.id),
        userEmail: user.email,
        userRole: user.role,
        merchantId: userScope.merchantId != null ? String(userScope.merchantId) : undefined,
        outletId: userScope.outletId != null ? String(userScope.outletId) : undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get('x-request-id') || undefined,
      },
    }));

    // Push status change to outlet users (only when status actually changed)
    if (
      existingOrder.status !== status &&
      finalOrder?.outletId
    ) {
      const { notifyOutletOrderEvent } = await import('../../../../../lib/push-notifications');
      notifyOutletOrderEvent(finalOrder.outletId, {
        type: 'ORDER_STATUS_CHANGED',
        orderId: String(finalOrder.id),
        orderNumber: finalOrder.orderNumber,
        status: String(status),
        outletId: String(finalOrder.outletId),
        orderType: finalOrder.orderType ? String(finalOrder.orderType) : undefined,
        previousStatus: String(existingOrder.status),
      }, user);
    }

    // Enhanced response for returns
    let responseMessage = `Order status updated to ${status} successfully`;
    
    if (status === ORDER_STATUS.RETURNED) {
      const returnInfo = [];
      
      // Calculate return amount (deposit + security deposit)
      const returnAmount = (updatedOrder.depositAmount || 0) + (updatedOrder.securityDeposit || 0);
      if (returnAmount > 0) {
        returnInfo.push(`${returnAmount} ₫`);
      }
      
      // Only add collateral if it actually exists and has a value
      if (updatedOrder.collateralType && updatedOrder.collateralType !== 'Other' && updatedOrder.collateralType.trim() !== '') {
        returnInfo.push(updatedOrder.collateralType);
      } else if (updatedOrder.collateralDetails && updatedOrder.collateralDetails.trim() !== '') {
        returnInfo.push(updatedOrder.collateralDetails);
      }
      
      if (returnInfo.length > 0) {
        responseMessage += ` - Return to customer: ${returnInfo.join(' + ')}`;
      } else {
        responseMessage += ' - Return to customer: Amount only';
      }
    }

    return NextResponse.json({
      success: true,
      // #1200: payments[] aliases + INSTALLMENT by capability; #1199: plan columns / stages by capability
      data: await shapeOrderInstallments(shapeOrderPayments(finalOrder as any, request), request, merchantId, prisma),
      code: 'ORDER_STATUS_UPDATED_SUCCESS',
      message: responseMessage
    });

    } catch (error) {
      console.error('Error updating order status:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export const runtime = 'nodejs';
