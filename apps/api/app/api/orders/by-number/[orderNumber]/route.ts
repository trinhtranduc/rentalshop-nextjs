import { NextRequest, NextResponse } from 'next/server';
import { getOrderByNumber } from '@rentalshop/database';
import { withAuthRoles, withOrderViewAuth } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export const GET = withOrderViewAuth(async (
  authorizedRequest,
  { params, user }: { params: { orderNumber: string }, user: any }
) => {
  try {
    console.log('🔍 [by-number] Starting order lookup for:', params.orderNumber);
    
    // User is already authenticated and authorized to view orders
    // user and userScope are now available directly
    console.log('✅ [by-number] Token verified for user:', user.email);

    const { orderNumber } = params;

    if (!orderNumber) {
      console.log('❌ [by-number] No order number provided');
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [by-number] Looking for order number:', orderNumber);

        // Find order by order number using the database function
    const order = await getOrderByNumber(orderNumber);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Calculate computed fields
    const totalItems = order.orderItems?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    const isRental = order.orderType === 'RENT';;
    
    // Calculate overdue status for rentals
    let isOverdue = false;
    let daysOverdue = 0;
    if (isRental && order.returnPlanAt) {
      const returnDate = new Date(order.returnPlanAt);
      const now = new Date();
      if (now > returnDate) {
        isOverdue = true;
        daysOverdue = Math.ceil((now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Calculate rental duration
    let rentalDuration: number | undefined = undefined;
    if (isRental && order.pickupPlanAt && order.returnPlanAt) {
      const pickupDate = new Date(order.pickupPlanAt);
      const returnDate = new Date(order.returnPlanAt);
      rentalDuration = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
    }



    // Calculate payment summary by payment type
    const totalPaid = order.payments
      ?.filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const totalPending = order.payments
      ?.filter((p: any) => p.status === 'PENDING')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const totalFailed = order.payments
      ?.filter((p: any) => p.status === 'FAILED')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    // Calculate deposits and fees
    const totalDeposits = order.payments
      ?.filter((p: any) => p.status === 'COMPLETED' && (p.type === 'DEPOSIT' || p.type === 'SECURITY_DEPOSIT'))
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const totalRentalFees = order.payments
      ?.filter((p: any) => p.status === 'COMPLETED' && p.type === 'RENTAL_FEE')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const totalDamageFees = order.payments
      ?.filter((p: any) => p.status === 'COMPLETED' && p.type === 'DAMAGE_FEE')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const totalLateFees = order.payments
      ?.filter((p: any) => p.status === 'COMPLETED' && p.type === 'LATE_FEE')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    
    const remainingBalance = order.totalAmount - totalPaid;



    // Prepare response data
    // The database function already returns transformed data with proper ID mapping
    // Just add the computed fields
    const orderData = {
      ...order,
      totalItems,
      isRental,
      isOverdue,
      daysOverdue,
      rentalDuration,
      customerFullName: order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : undefined,
      customerContact: order.customer?.phone || order.customer?.email,
      paymentSummary: {
        totalPaid,
        totalPending,
        totalFailed,
        remainingBalance,
        totalDeposits,
        totalRentalFees,
        totalDamageFees,
        totalLateFees,
      },
    };

    return NextResponse.json({
      success: true,
      data: orderData,
    });

  } catch (error) {
    console.error('❌ [by-number] Error fetching order by number:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
