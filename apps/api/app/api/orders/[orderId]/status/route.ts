import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { updateOrder } from '@rentalshop/database';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Schema for status update
const statusUpdateSchema = z.object({
  status: z.enum(['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']),
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
 * This endpoint is specifically designed for status updates and includes:
 * - Status change validation
 * - Automatic timestamp updates for pickup/return
 * - Notes and metadata handling
 * - Proper authorization checks
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, { user }) => {
    try {

      const { orderId } = params;
      
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

    // Automatically set timestamps based on status
    if (status === 'PICKUPED' && !pickedUpAt) {
      updateInput.pickedUpAt = new Date().toISOString();
    }
    
    if (status === 'RETURNED' && !returnedAt) {
      updateInput.returnedAt = new Date().toISOString();
      
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

    // Allow manual timestamp override if provided
    if (pickedUpAt) {
      updateInput.pickedUpAt = pickedUpAt;
    }
    
    if (returnedAt) {
      updateInput.returnedAt = returnedAt;
    }

    // Update the order - convert orderId string to number
    const orderPublicId = parseInt(orderId);
    if (isNaN(orderPublicId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }
    
    const updatedOrder = await updateOrder(orderPublicId, updateInput);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Enhanced response for returns
    let responseMessage = `Order status updated to ${status} successfully`;
    
    if (status === 'RETURNED') {
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
      message: responseMessage
    });

    } catch (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}export const runtime = 'nodejs';
