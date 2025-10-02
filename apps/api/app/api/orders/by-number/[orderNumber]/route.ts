import { NextRequest, NextResponse } from 'next/server';
import { getOrderByNumber } from '@rentalshop/database';
import { withAuthRoles, withOrderViewAuth } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export const GET = withOrderViewAuth(async (authorizedRequest, context) => {
  try {
    const { user, userScope } = authorizedRequest;
    const { params } = context;
    
    console.log('🔍 [by-number] Starting order lookup for:', params.orderNumber);
    
    // User is already authenticated and authorized to view orders
    // user and userScope are now available directly
    console.log('✅ [by-number] Token verified for user:', user.email);
    
    // Ensure user email is available
    if (!user.email) {
      console.log('❌ [by-number] User email is missing');
      return NextResponse.json(
        { success: false, error: 'User authentication error - email required' },
        { status: 401 }
      );
    }

    const { orderNumber } = params;

    if (!orderNumber) {
      console.log('❌ [by-number] No order number provided');
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [by-number] Looking for order number:', orderNumber);
    console.log('🔍 [by-number] User scope:', userScope);

    // Find order by order number using the database function
    const order = await getOrderByNumber(orderNumber);

    console.log('🔍 [by-number] Raw order data from database:', JSON.stringify({
      orderId: order?.id,
      outletId: order?.outletId,
      outlet: {
        id: order?.outlet?.id,
        name: order?.outlet?.name,
        merchantId: order?.outlet?.merchantId,
        merchant: {
          id: order?.outlet?.merchant?.id,
          name: order?.outlet?.merchant?.name
        }
      }
    }, null, 2));

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Security check: Ensure user can only access orders within their scope
    if (userScope.outletId && order.outletId !== userScope.outletId) {
      console.log('❌ [by-number] User not authorized to access order from different outlet');
      return NextResponse.json(
        { success: false, error: 'Access denied - order belongs to different outlet' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (userScope.merchantId && order.merchantId !== userScope.merchantId) {
      console.log('❌ [by-number] User not authorized to access order from different merchant');
      return NextResponse.json(
        { success: false, error: 'Access denied - order belongs to different merchant' },
        { status: API.STATUS.FORBIDDEN }
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
