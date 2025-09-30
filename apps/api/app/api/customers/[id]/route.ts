import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { 
  getCustomerById, 
  updateCustomer,
  prisma
} from '@rentalshop/database';
import { customerUpdateSchema, createAuditHelper } from '@rentalshop/utils';
import { assertAnyRole } from '@rentalshop/auth';
import type { CustomerUpdateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/[id]
 * Get a specific customer by ID
 * REFACTORED: Now uses unified withAuthRoles pattern for business roles
 */
async function handleGetCustomer(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  console.log(`👥 GET /api/customers/${params.id} - User: ${user.email}, Role: ${user.role}`);
  
  try {
    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from userScope (provided by withAuthRoles)
    const userMerchantId = userScope.merchantId;
    console.log('User merchant ID:', userMerchantId);

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Check if customer exists and belongs to the user's merchant
    const existingCustomer = await getCustomerById(customerId, userMerchantId);
    
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check merchant access - ensure customer belongs to user's merchant  
    if (userMerchantId && existingCustomer.merchantId !== userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' }, // Don't reveal existence 
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Transform the response to ensure id is properly exposed
    const transformedCustomer = {
      id: existingCustomer.id,
      firstName: existingCustomer.firstName,
      lastName: existingCustomer.lastName,
      email: existingCustomer.email,
      phone: existingCustomer.phone,
      address: existingCustomer.address,
      city: existingCustomer.city,
      state: existingCustomer.state,
      zipCode: existingCustomer.zipCode,
      country: existingCustomer.country,
      dateOfBirth: existingCustomer.dateOfBirth,
      idNumber: existingCustomer.idNumber,
      idType: existingCustomer.idType,
      notes: existingCustomer.notes,
      isActive: existingCustomer.isActive,
      createdAt: existingCustomer.createdAt,
      updatedAt: existingCustomer.updatedAt,
      // Transform merchant if available
      merchant: existingCustomer.merchant ? {
        id: existingCustomer.merchant.id,
        name: existingCustomer.merchant.name
      } : null,
      // Transform orders with proper typing
      orders: existingCustomer.orders?.map((order: any) => ({
        id: order.id,
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetCustomer(req, context, params)
  );
  return authenticatedHandler(request);
}

/**
 * PUT /api/customers/[id]
 * Update a specific customer by ID
 * REFACTORED: Now uses unified withAuthRoles pattern for business roles
 */
async function handleUpdateCustomer(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  console.log(`📝 PUT /api/customers/${params.id} - User: ${user.email}, Role: ${user.role}`);
  
  try {
    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userMerchantId = userScope.merchantId;

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get existing customer for audit logging
    const existingCustomer = await getCustomerById(customerId, userMerchantId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
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
      id: customerId, // Add required id field
      ...validationResult.data,
      dateOfBirth: validationResult.data.dateOfBirth ? new Date(validationResult.data.dateOfBirth) : undefined
    };

    // Update customer
    const updatedCustomer = await updateCustomer(customerId, updateData);
    
    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, message: 'Failed to update customer' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Log audit event for customer update
    try {
      console.log('🔍 Customer API - About to log audit event:', {
        entityType: 'Customer',
        entityId: updatedCustomer.id.toString(),
        hasUser: !!user,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          merchantId: user.merchantId,
          outletId: user.outletId
        }
      });

      const auditHelper = createAuditHelper(prisma);
      
      // Create simplified audit context
      const auditContext = {
        userId: user.id?.toString() || '',
        userEmail: user.email,
        userRole: user.role,
        merchantId: user.merchantId?.toString(),
        outletId: user.outletId?.toString(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
        requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          method: request.method,
          url: request.url,
          timestamp: new Date().toISOString()
        }
      };
      
      await auditHelper.logUpdate({
        entityType: 'Customer',
        entityId: updatedCustomer.id.toString(),
        entityName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        oldValues: existingCustomer,
        newValues: updatedCustomer,
        description: `Customer updated: ${existingCustomer.firstName} ${existingCustomer.lastName} -> ${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        context: auditContext
      });
      console.log('✅ Customer API - Audit event logged successfully');
    } catch (auditError) {
      console.error('❌ Customer API - Failed to log customer update audit:', auditError);
      console.error('❌ Customer API - Audit error stack:', auditError instanceof Error ? auditError.stack : undefined);
      // Don't fail the request if audit logging fails
    }

    // Transform the response to ensure id is properly exposed
    const transformedCustomer = {
      // Expose id directly for frontend
      id: updatedCustomer.id, // Frontend expects 'id' to be the id
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
      // Transform merchant to use id
      merchant: {
        id: updatedCustomer.merchant.id, // Use id for frontend
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdateCustomer(req, context, params)
  );
  return authenticatedHandler(request);
}

/**
 * DELETE /api/customers/[id]
 * Delete a specific customer by ID
 * REFACTORED: Now uses unified withAuthRoles pattern for business roles  
 */
async function handleDeleteCustomer(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  console.log(`🗑️ DELETE /api/customers/${params.id} - User: ${user.email}, Role: ${user.role}`);
  
  try {

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userMerchantId = userScope.merchantId;

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get customer to check ownership using new dual ID system
    const customer = await getCustomerById(customerId, userMerchantId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleDeleteCustomer(req, context, params)
  );
  return authenticatedHandler(request);
}
