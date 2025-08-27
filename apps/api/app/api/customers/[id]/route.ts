import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  getCustomerByPublicId, 
  updateCustomer
} from '@rentalshop/database';
import { customerUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import type { CustomerUpdateInput } from '@rentalshop/types';
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

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;
    console.log('User merchant ID:', userMerchantId);

    // Get customer by public ID using new dual ID system
    const customer = await getCustomerByPublicId(customerId, userMerchantId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found or missing public ID' },
        { status: 404 }
      );
    }

    // No need to check merchant access since getCustomerByPublicId already filters by merchant
    // The customer returned is guaranteed to belong to the user's merchant

    // Transform the response to ensure publicId is properly exposed
    const transformedCustomer = {
      // Expose publicId as the main ID for frontend
      id: customer.publicId, // Frontend expects 'id' to be the publicId
      publicId: customer.publicId, // Keep publicId for backward compatibility
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      country: customer.country,
      dateOfBirth: customer.dateOfBirth,
      idNumber: customer.idNumber,
      idType: customer.idType,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      // Transform merchant to use publicId
      merchant: {
        id: customer.merchant.publicId, // Use publicId for frontend
        publicId: customer.merchant.publicId,
        name: customer.merchant.name
      },
      // Transform orders to use publicId as id
      orders: customer.orders?.map(order => ({
        id: order.publicId, // Use publicId as id for frontend
        publicId: order.publicId,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedCustomer
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

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: 403 }
      );
    }

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

    // Convert string dates to Date objects for the update function
    const updateData: CustomerUpdateInput = {
      ...validationResult.data,
      dateOfBirth: validationResult.data.dateOfBirth ? new Date(validationResult.data.dateOfBirth) : undefined
    };

    // Update customer
    const updatedCustomer = await updateCustomer(customerId, updateData);
    
    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, message: 'Failed to update customer' },
        { status: 500 }
      );
    }

    // Transform the response to ensure publicId is properly exposed
    const transformedCustomer = {
      // Expose publicId as the main ID for frontend
      id: updatedCustomer.publicId, // Frontend expects 'id' to be the publicId
      publicId: updatedCustomer.publicId, // Keep publicId for backward compatibility
      firstName: updatedCustomer.firstName,
      lastName: updatedCustomer.lastName,
      email: updatedCustomer.email,
      phone: updatedCustomer.phone,
      address: updatedCustomer.address,
      city: updatedCustomer.city,
      state: updatedCustomer.state,
      zipCode: updatedCustomer.zipCode,
      country: updatedCustomer.country,
      dateOfBirth: updatedCustomer.dateOfBirth,
      idNumber: updatedCustomer.idNumber,
      idType: updatedCustomer.idType,
      notes: updatedCustomer.notes,
      isActive: updatedCustomer.isActive,
      createdAt: updatedCustomer.createdAt,
      updatedAt: updatedCustomer.updatedAt,
      // Transform merchant to use publicId
      merchant: {
        id: updatedCustomer.merchant.publicId, // Use publicId for frontend
        publicId: updatedCustomer.merchant.publicId,
        name: updatedCustomer.merchant.name
      }
    };

    return NextResponse.json({
      success: true,
      data: transformedCustomer,
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

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: 403 }
      );
    }

    // Get customer to check ownership using new dual ID system
    const customer = await getCustomerByPublicId(customerId, userMerchantId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // No need to check merchant access since getCustomerByPublicId already filters by merchant
    // The customer returned is guaranteed to belong to the user's merchant

    // Check if customer has active orders or other dependencies
    if (customer.orders && customer.orders.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with active orders' },
        { status: 400 }
      );
    }

    // Delete customer using the database package function
    // Note: We need to implement a deleteCustomer function in the database package
    // For now, we'll return an error indicating this functionality needs to be implemented
    
    return NextResponse.json({
      success: false,
      message: 'Customer deletion not yet implemented'
    }, { status: 501 });

  } catch (error) {
    console.error('Error in DELETE /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
