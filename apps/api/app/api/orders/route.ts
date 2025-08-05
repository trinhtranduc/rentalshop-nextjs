import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  createOrder, 
  searchOrders, 
  getOrderStats 
} from '@rentalshop/database';
import type { OrderInput, OrderSearchFilter } from '@rentalshop/database';

// GET /api/orders - Search orders
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: OrderSearchFilter = {
      q: searchParams.get('q') || undefined,
      outletId: searchParams.get('outletId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      userId: searchParams.get('userId') || undefined,
      orderType: searchParams.get('orderType') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      pickupDate: searchParams.get('pickupDate') ? new Date(searchParams.get('pickupDate')!) : undefined,
      returnDate: searchParams.get('returnDate') ? new Date(searchParams.get('returnDate')!) : undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Get orders
    const result = await searchOrders(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error searching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.orderType || !body.outletId || !body.orderItems || body.orderItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate order items
    for (const item of body.orderItems) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid order items' },
          { status: 400 }
        );
      }
    }

    // Create order input
    const orderInput: OrderInput = {
      orderType: body.orderType,
      customerId: body.customerId || undefined,
      outletId: body.outletId,
      pickupPlanAt: body.pickupPlanAt ? new Date(body.pickupPlanAt) : undefined,
      returnPlanAt: body.returnPlanAt ? new Date(body.returnPlanAt) : undefined,
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      discountAmount: body.discountAmount || 0,
      totalAmount: body.totalAmount || 0,
      depositAmount: body.depositAmount || 0,
      notes: body.notes || '',
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      orderItems: body.orderItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        deposit: item.deposit || 0,
        notes: item.notes || '',
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        daysRented: item.daysRented || 0,
      })),
    };

    // Create the order
    const order = await createOrder(orderInput, user.id);

    return NextResponse.json({
      success: true,
      data: order,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 