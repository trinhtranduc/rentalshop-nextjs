import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
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

    // Check if user is ADMIN (only admins can view billing cycles)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid billing cycle ID' },
        { status: 400 }
      );
    }

    // Get billing cycle by public ID
    const billingCycle = await prisma.billingCycle.findUnique({
      where: { publicId: id }
    });

    if (!billingCycle) {
      return NextResponse.json(
        { success: false, message: 'Billing cycle not found' },
        { status: 404 }
      );
    }

    // Transform response
    const transformedCycle = {
      id: billingCycle.publicId,
      name: billingCycle.name,
      value: billingCycle.value,
      months: billingCycle.months,
      discount: billingCycle.discount,
      description: billingCycle.description,
      isActive: billingCycle.isActive,
      sortOrder: billingCycle.sortOrder,
      createdAt: billingCycle.createdAt.toISOString(),
      updatedAt: billingCycle.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: transformedCycle
    });

  } catch (error) {
    console.error('Error fetching billing cycle:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
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

    // Check if user is ADMIN (only admins can update billing cycles)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid billing cycle ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Check if billing cycle exists
    const existingCycle = await prisma.billingCycle.findUnique({
      where: { publicId: id }
    });

    if (!existingCycle) {
      return NextResponse.json(
        { success: false, message: 'Billing cycle not found' },
        { status: 404 }
      );
    }

    // Check if value is being changed and if it conflicts with another cycle
    if (body.value && body.value !== existingCycle.value) {
      const conflictingCycle = await prisma.billingCycle.findUnique({
        where: { value: body.value }
      });

      if (conflictingCycle) {
        return NextResponse.json(
          { success: false, message: 'Billing cycle with this value already exists' },
          { status: 400 }
        );
      }
    }

    // Update billing cycle
    const updatedCycle = await prisma.billingCycle.update({
      where: { publicId: id },
      data: {
        name: body.name,
        value: body.value,
        months: body.months,
        discount: body.discount,
        description: body.description,
        isActive: body.isActive,
        sortOrder: body.sortOrder
      }
    });

    // Transform response
    const transformedCycle = {
      id: updatedCycle.publicId,
      name: updatedCycle.name,
      value: updatedCycle.value,
      months: updatedCycle.months,
      discount: updatedCycle.discount,
      description: updatedCycle.description,
      isActive: updatedCycle.isActive,
      sortOrder: updatedCycle.sortOrder,
      createdAt: updatedCycle.createdAt.toISOString(),
      updatedAt: updatedCycle.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: transformedCycle
    });

  } catch (error) {
    console.error('Error updating billing cycle:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
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

    // Check if user is ADMIN (only admins can delete billing cycles)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate ID
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid billing cycle ID' },
        { status: 400 }
      );
    }

    // Check if billing cycle exists
    const existingCycle = await prisma.billingCycle.findUnique({
      where: { publicId: id },
      include: {
        plans: true,
        subscriptions: true
      }
    });

    if (!existingCycle) {
      return NextResponse.json(
        { success: false, message: 'Billing cycle not found' },
        { status: 404 }
      );
    }

    // Check if billing cycle is in use
    if (existingCycle.plans.length > 0 || existingCycle.subscriptions.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Cannot delete billing cycle that is in use by plans or subscriptions' 
        },
        { status: 400 }
      );
    }

    // Delete billing cycle
    await prisma.billingCycle.delete({
      where: { publicId: id }
    });

    return NextResponse.json({
      success: true,
      message: 'Billing cycle deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting billing cycle:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
