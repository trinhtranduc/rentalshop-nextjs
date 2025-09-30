import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

async function handleGetMerchantOrders(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    const merchantPublicId = parseInt(params.id);
    if (isNaN(merchantPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Find the merchant by id to get the actual CUID
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantPublicId },
      select: { id: true }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const orderType = searchParams.get('orderType') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      outlet: {
        merchantId: merchant.id // Use the actual CUID
      }
    };

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { phone: { contains: search } } }
      ];
    }

    // Add order type filter
    if (orderType) {
      where.orderType = orderType;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Build order by clause with validation
    const validSortFields = [
      'createdAt', 'updatedAt', 'pickupPlanAt', 'returnPlanAt', 
      'status', 'totalAmount', 'orderNumber', 'depositAmount'
    ];
    
    const orderBy: any = {};
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      // Default to createdAt if invalid field
      orderBy.createdAt = sortOrder;
    }

    // Get total count
    const total = await prisma.order.count({ where });

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            orderItems: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      pickupPlanAt: order.pickupPlanAt?.toISOString(),
      returnPlanAt: order.returnPlanAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      customer: order.customer ? {
        id: order.customer.id,
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        phone: order.customer.phone
      } : null,
      outlet: order.outlet ? {
        id: order.outlet.id,
        name: order.outlet.name
      } : null,
      itemCount: order._count.orderItems
    }));

    // Calculate comprehensive stats
    const [statusStats, revenueStats] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        where: {
          outlet: {
            merchantId: merchant.id
          }
        },
        _count: {
          status: true
        }
      }),
      prisma.order.aggregate({
        where: {
          outlet: {
            merchantId: merchant.id
          }
        },
        _sum: {
          totalAmount: true,
          depositAmount: true
        },
        _avg: {
          totalAmount: true
        }
      })
    ]);

    // Count orders by status
    let activeRentals = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    statusStats.forEach(stat => {
      if (stat.status === 'COMPLETED') {
        completedOrders = stat._count.status;
      } else if (stat.status === 'CANCELLED') {
        cancelledOrders = stat._count.status;
      } else if (stat.status === 'PICKUPED') {
        activeRentals = stat._count.status;
      }
    });

    const statsMap = {
      totalOrders: total,
      totalRevenue: revenueStats._sum.totalAmount || 0,
      totalDeposits: revenueStats._sum.depositAmount || 0,
      activeRentals: activeRentals,
      overdueRentals: 0, // TODO: Calculate overdue rentals
      completedOrders: completedOrders,
      cancelledOrders: cancelledOrders,
      averageOrderValue: revenueStats._avg.totalAmount || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: transformedOrders,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        stats: statsMap
      }
    });

  } catch (error) {
    console.error('Error fetching merchant orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Export function with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetMerchantOrders(req, context, params)
  );
  return authenticatedHandler(request);
}
