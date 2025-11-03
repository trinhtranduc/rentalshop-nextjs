import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { customerUpdateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/customers/[id]
 * Get customer by ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;
      console.log('🔍 GET /api/customers/[id] - Looking for customer with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);
      
      // Get customer using Prisma
      const customer = await db.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        console.log('❌ Customer not found in database for customerId:', customerId);
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Customer found:', customer);

      return NextResponse.json({
        success: true,
        data: customer,
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Parse and validate request body
      const body = await request.json();
      console.log('🔍 PUT /api/customers/[id] - Update request body:', body);

      // Check if customer exists
      const existingCustomer = await db.customer.findUnique({
        where: { id: customerId }
      });
      if (!existingCustomer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Update the customer using Prisma
      const updatedCustomer = await db.customer.update({
        where: { id: customerId },
        data: body as any
      });
      console.log('✅ Customer updated successfully:', updatedCustomer);

      return NextResponse.json({
        success: true,
        data: updatedCustomer,
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
      
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      const customerId = parseInt(id);

      // Check if customer exists
      const existingCustomer = await db.customer.findUnique({
        where: { id: customerId }
      });
      if (!existingCustomer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check if customer has active orders (RESERVED or PICKUPED)
      const activeOrderCount = await db.order.count({
        where: {
          customerId: customerId,
          status: { in: ['RESERVED', 'PICKUPED'] }
        }
      });

      if (activeOrderCount > 0) {
        console.log('❌ Cannot delete customer with active orders:', activeOrderCount);
        return NextResponse.json(
          {
            success: false,
            code: 'CUSTOMER_HAS_ACTIVE_ORDERS',
            message: `Cannot delete customer with ${activeOrderCount} active order(s). Please complete or cancel these orders first.`
          },
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete by setting isActive to false
      const deletedCustomer = await db.customer.update({
        where: { id: customerId },
        data: { isActive: false }
      });
      console.log('✅ Customer soft deleted successfully:', deletedCustomer);

      return NextResponse.json({
        success: true,
        data: deletedCustomer,
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