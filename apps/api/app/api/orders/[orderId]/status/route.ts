import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

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
  pickedUpAt: z.string().optional(),
  returnedAt: z.string().optional(),
  // Return-specific fields for collateral management
  returnAmount: z.number().optional(), // Amount to return to customer
  collateralReturned: z.boolean().optional(), // Whether collateral was returned
  collateralType: z.string().optional(), // Type of collateral (if any)
  collateralDetails: z.string().optional(), // Details about collateral
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

    // Build update input with automatic timestamp handling
    const updateInput: any = {
      status,
      ...(notes && { notes }),
      ...(pickupNotes && { pickupNotes }),
      ...(returnNotes && { returnNotes }),
      // Return-specific fields
      ...(collateralType && { collateralType }),
      ...(collateralDetails && { collateralDetails }),
    };

    // CRITICAL: Always set pickedUpAt when status is PICKUPED (if not already set or if explicitly provided)
    // This ensures orders that are already PICKUPED but have null pickedUpAt get the timestamp set
    if (status === ORDER_STATUS.PICKUPED) {
      if (pickedUpAt) {
        // Use provided timestamp
        updateInput.pickedUpAt = pickedUpAt;
      } else if (!existingOrder.pickedUpAt) {
        // Auto-set if not already set (either null or missing)
        updateInput.pickedUpAt = new Date().toISOString();
        console.log('✅ Auto-setting pickedUpAt for PICKUPED order');
      }
      // If pickedUpAt already exists, keep it (don't override)
    }
    
    // CRITICAL: Always set returnedAt when status is RETURNED (if not already set or if explicitly provided)
    // This ensures orders that are already RETURNED but have null returnedAt get the timestamp set
    if (status === ORDER_STATUS.RETURNED) {
      if (returnedAt) {
        // Use provided timestamp
        updateInput.returnedAt = returnedAt;
      } else if (!existingOrder.returnedAt) {
        // Auto-set if not already set (either null or missing)
        updateInput.returnedAt = new Date().toISOString();
        console.log('✅ Auto-setting returnedAt for RETURNED order');
      }
      // If returnedAt already exists, keep it (don't override)
      
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

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
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
      data: updatedOrder,
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
