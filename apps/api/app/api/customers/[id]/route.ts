import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS } from '@rentalshop/constants';
import { customerUpdateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/[id]
 * Get customer by ID
 * 
 * Authorization: All roles with 'customers.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['customers.view'])(async (request, { user, userScope }) => {
    try {
      console.log('🔍 GET /api/customers/[id] - Looking for customer with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      // Validate that non-admin users have merchant association
      if (user.role !== 'ADMIN' && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }
      
      // Get customer using the simplified database API
      const customer = await db.customers.findById(customerId);

      if (!customer) {
        console.log('❌ Customer not found in database for customerId:', customerId);
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify customer belongs to user's merchant (security check)
      if (user.role !== 'ADMIN' && customer.merchantId !== userMerchantId) {
        console.log('❌ Customer does not belong to user\'s merchant:', {
          customerMerchantId: customer.merchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'), // Return NOT_FOUND for security (don't reveal customer exists)
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Customer found:', customer);

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedCustomer = {
        ...customer,
        createdAt: customer.createdAt?.toISOString() || null,
        updatedAt: customer.updatedAt?.toISOString() || null,
        dateOfBirth: customer.dateOfBirth?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedCustomer,
        code: 'CUSTOMER_RETRIEVED_SUCCESS',
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
 * 
 * Authorization: All roles with 'customers.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
    try {

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      // Validate that non-admin users have merchant association
      if (user.role !== 'ADMIN' && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/customers/[id] - Update request body:', body);

      // Check if customer exists and user has access to it
      const existingCustomer = await db.customers.findById(customerId);
      if (!existingCustomer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify customer belongs to user's merchant (security check)
      if (user.role !== 'ADMIN' && existingCustomer.merchantId !== userMerchantId) {
        console.log('❌ Customer does not belong to user\'s merchant:', {
          customerMerchantId: existingCustomer.merchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'), // Return NOT_FOUND for security (don't reveal customer exists)
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Update the customer using the simplified database API
      const updatedCustomer = await db.customers.update(customerId, body);
      console.log('✅ Customer updated successfully:', updatedCustomer);

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedCustomer = {
        ...updatedCustomer,
        createdAt: updatedCustomer.createdAt?.toISOString() || null,
        updatedAt: updatedCustomer.updatedAt?.toISOString() || null,
        dateOfBirth: updatedCustomer.dateOfBirth?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedCustomer,
        code: 'CUSTOMER_UPDATED_SUCCESS',
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
 * 
 * Authorization: All roles with 'customers.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  
  return withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
    try {

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      // Validate that non-admin users have merchant association
      if (user.role !== 'ADMIN' && !userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }

      // Check if customer exists and user has access to it
      const existingCustomer = await db.customers.findById(customerId);
      if (!existingCustomer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify customer belongs to user's merchant (security check)
      if (user.role !== 'ADMIN' && existingCustomer.merchantId !== userMerchantId) {
        console.log('❌ Customer does not belong to user\'s merchant:', {
          customerMerchantId: existingCustomer.merchantId,
          userMerchantId: userMerchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'), // Return NOT_FOUND for security (don't reveal customer exists)
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check if customer has active orders (RESERVED or PICKUPED)
      const activeOrders = await db.orders.getStats({
        customerId: customerId,
        status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any] }
      });

      if (activeOrders > 0) {
        console.log('❌ Cannot delete customer with active orders:', activeOrders);
        return NextResponse.json(
          {
            success: false,
            code: 'CUSTOMER_HAS_ACTIVE_ORDERS',
            message: `Cannot delete customer with ${activeOrders} active order(s). Please complete or cancel these orders first.`
          },
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete by setting isActive to false
      const deletedCustomer = await db.customers.update(customerId, { isActive: false });
      console.log('✅ Customer soft deleted successfully:', deletedCustomer);

      // Normalize date fields to UTC ISO strings using toISOString()
      const normalizedCustomer = {
        ...deletedCustomer,
        createdAt: deletedCustomer.createdAt?.toISOString() || null,
        updatedAt: deletedCustomer.updatedAt?.toISOString() || null,
        dateOfBirth: deletedCustomer.dateOfBirth?.toISOString() || null,
      };

      return NextResponse.json({
        success: true,
        data: normalizedCustomer,
        code: 'CUSTOMER_DELETED_SUCCESS',
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