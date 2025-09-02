import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Get merchant with related data
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      include: {
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true
          }
        },
        outlets: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        },
        users: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        products: {
          select: {
            id: true,
            publicId: true,
            name: true,
            description: true,
            rentPrice: true,
            salePrice: true,
            deposit: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    // Get orders for this merchant's outlets
    const merchantOutlets = await prisma.outlet.findMany({
      where: { merchantId: merchant.id },
      select: { id: true }
    });

    const outletIds = merchantOutlets.map(outlet => outlet.id);
    
    const orders = await prisma.order.findMany({
      where: {
        outletId: { in: outletIds }
      },
      select: {
        id: true,
        publicId: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent orders
    });

    // Calculate order statistics
    const orderStats = {
      totalOrders: orders.length,
      activeOrders: orders.filter(order => ['RESERVED', 'PICKUPED'].includes(order.status)).length,
      completedOrders: orders.filter(order => ['COMPLETED', 'RETURNED'].includes(order.status)).length,
      cancelledOrders: orders.filter(order => order.status === 'CANCELLED').length
    };

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const transformedMerchant = {
      id: merchant.publicId,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      isActive: merchant.isActive,
      subscriptionPlan: merchant.subscriptionPlan,
      subscriptionStatus: merchant.subscriptionStatus,
      trialEndsAt: merchant.trialEndsAt,
      outletsCount: merchant._count.outlets,
      usersCount: merchant._count.users,
      productsCount: merchant._count.products,
      totalRevenue: merchant.totalRevenue || 0,
      createdAt: merchant.createdAt,
      lastActiveAt: merchant.lastActiveAt
    };

    const transformedOutlets = merchant.outlets.map(outlet => ({
      id: outlet.publicId,
      name: outlet.name,
      address: outlet.address,
      phone: outlet.phone,
      isActive: outlet.isActive,
      createdAt: outlet.createdAt
    }));

    const transformedUsers = merchant.users.map(user => ({
      id: user.publicId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));

    const transformedProducts = merchant.products.map(product => ({
      id: product.publicId,
      name: product.name,
      description: product.description,
      rentPrice: product.rentPrice,
      salePrice: product.salePrice,
      deposit: product.deposit,
      isActive: product.isActive,
      createdAt: product.createdAt
    }));

    const transformedOrders = orders.map(order => ({
      id: order.publicId,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        merchant: transformedMerchant,
        outlets: transformedOutlets,
        users: transformedUsers,
        products: transformedProducts,
        orders: transformedOrders,
        stats: {
          totalOutlets: merchant._count.outlets,
          totalUsers: merchant._count.users,
          totalProducts: merchant._count.products,
          totalOrders: orderStats.totalOrders,
          totalRevenue: merchant.totalRevenue || 0,
          activeOrders: orderStats.activeOrders,
          completedOrders: orderStats.completedOrders,
          cancelledOrders: orderStats.cancelledOrders
        }
      }
    });

  } catch (error) {
    console.error('Error fetching merchant details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchant details', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedMerchant = await prisma.merchant.update({
      where: { publicId: merchantId },
      data: {
        isActive: false,
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant deactivated successfully',
      data: {
        id: deletedMerchant.publicId,
        name: deletedMerchant.name,
        isActive: deletedMerchant.isActive
      }
    });

  } catch (error) {
    console.error('Error deactivating merchant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate merchant', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, phone, subscriptionPlan, subscriptionStatus, isActive } = body;

    // Check if email already exists (if changing email)
    if (email) {
      const existingMerchant = await prisma.merchant.findFirst({
        where: {
          email,
          NOT: { publicId: merchantId }
        }
      });

      if (existingMerchant) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update merchant
    const updatedMerchant = await prisma.merchant.update({
      where: { publicId: merchantId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionStatus && { subscriptionStatus }),
        ...(isActive !== undefined && { isActive }),
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant updated successfully',
      data: {
        id: updatedMerchant.publicId,
        name: updatedMerchant.name,
        email: updatedMerchant.email,
        phone: updatedMerchant.phone,
        isActive: updatedMerchant.isActive,
        subscriptionPlan: updatedMerchant.subscriptionPlan,
        subscriptionStatus: updatedMerchant.subscriptionStatus,
        trialEndsAt: updatedMerchant.trialEndsAt,
        totalRevenue: updatedMerchant.totalRevenue,
        createdAt: updatedMerchant.createdAt,
        lastActiveAt: updatedMerchant.lastActiveAt
      }
    });

  } catch (error) {
    console.error('Error updating merchant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to update merchant', error: errorMessage },
      { status: 500 }
    );
  }
}
