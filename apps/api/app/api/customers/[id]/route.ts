import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { customerUpdateSchema, handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/[id]
 * Get customer by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/customers/[id] - Looking for customer with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid customer ID format' },
          { status: 400 }
        );
      }

      const customerId = parseInt(id);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          { success: false, message: 'User must be associated with a merchant' },
          { status: 400 }
        );
      }
      
      // Get customer using the simplified database API
      const customer = await db.customers.findById(customerId);

      if (!customer) {
        console.log('❌ Customer not found in database for customerId:', customerId);
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Customer found:', customer);

      return NextResponse.json({
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching customer:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/customers/[id]
 * Update customer by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid customer ID format' },
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          { success: false, message: 'User must be associated with a merchant' },
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/customers/[id] - Update request body:', body);

      // Check if customer exists and user has access to it
      const existingCustomer = await db.customers.findById(customerId);
      if (!existingCustomer) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Update the customer using the simplified database API
      const updatedCustomer = await db.customers.update(customerId, body);
      console.log('✅ Customer updated successfully:', updatedCustomer);

      return NextResponse.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating customer:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/customers/[id]
 * Delete customer by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid customer ID format' },
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          { success: false, message: 'User must be associated with a merchant' },
          { status: 400 }
        );
      }

      // Check if customer exists and user has access to it
      const existingCustomer = await db.customers.findById(customerId);
      if (!existingCustomer) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Soft delete by setting isActive to false
      const deletedCustomer = await db.customers.update(customerId, { isActive: false });
      console.log('✅ Customer soft deleted successfully:', deletedCustomer);

      return NextResponse.json({
        success: true,
        data: deletedCustomer,
        message: 'Customer deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}