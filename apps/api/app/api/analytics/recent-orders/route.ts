import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get recent orders (last 20 orders)
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                images: true
              }
            }
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Format the data for display
    const formattedOrders = recentOrders.map(order => {
      const customerName = order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : order.customerName || 'Walk-in Customer';
      
      const customerPhone = order.customer?.phone || order.customerPhone || 'N/A';
      
      const productNames = order.orderItems
        .map(item => item.product.name)
        .join(', ');
      
      const productImage = order.orderItems[0]?.product.images 
        ? JSON.parse(order.orderItems[0].product.images)[0] 
        : null;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName,
        customerPhone,
        productNames,
        productImage,
        totalAmount: order.totalAmount,
        status: order.status,
        orderType: order.orderType,
        createdAt: order.createdAt,
        createdBy: order.user.name,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recent orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 