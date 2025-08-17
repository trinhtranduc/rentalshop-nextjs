import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  getCustomerById, 
  updateCustomer
} from '@rentalshop/database';
import { customerUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import type { CustomerUpdateInput } from '@rentalshop/database';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/customers/[id]
 * Get a specific customer by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('GET /api/customers/[id] called with ID:', params.id);
  
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

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;
    console.log('User merchant ID:', userMerchantId);

    // Get customer by ID
    const customer = await getCustomerById(params.id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer belongs to user's merchant
    if (customer.merchantId !== userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Error in GET /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers/[id]
 * Update a specific customer by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('PUT /api/customers/[id] called with ID:', params.id);
  
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

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;

    // Get request body
    const body = await request.json();
    
    // Validate input
    const validationResult = customerUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          errors: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateData: CustomerUpdateInput = validationResult.data;

    // Update customer
    const updatedCustomer = await updateCustomer(params.id, updateData);
    
    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer belongs to user's merchant
    if (updatedCustomer.merchantId !== userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * Delete a specific customer by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('DELETE /api/customers/[id] called with ID:', params.id);
  
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

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;

    // Get customer to check ownership
    const customer = await getCustomerById(params.id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer belongs to user's merchant
    if (customer.merchantId !== userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if customer has active orders or other dependencies
    const hasActiveOrders = await prisma.order.findFirst({
      where: { 
        customerId: params.id
      }
    });

    if (hasActiveOrders) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with active orders' },
        { status: 400 }
      );
    }

    // Delete customer from database
    await prisma.customer.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
