import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { API, USER_ROLE, ORDER_STATUS } from '@rentalshop/constants';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * Batch delete schema
 */
const batchDeleteSchema = z.object({
  customerIds: z.array(z.number().int().positive()).min(1, 'At least one customer ID is required').max(5000, 'Cannot delete more than 5000 customers at once'),
});

/**
 * POST /api/customers/batch-delete
 * Soft delete multiple customers in batch
 * 
 * Authorization: Users with 'customers.manage' permission can delete customers
 */
export const POST = withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 POST /api/customers/batch-delete - User: ${user.email} (${user.role})`);

    const body = await request.json();
    
    // Validate input
    const parsed = batchDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { customerIds } = parsed.data;

    // Get user scope for merchant isolation
    const userMerchantId = userScope.merchantId;
    
    // ADMIN users can delete customers without merchantId (they have system-wide access)
    // Non-admin users need merchantId
    if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
        { status: 400 }
      );
    }

    // Fetch all customers to validate using db.customers.findById for each
    const customers: any[] = [];
    const notFoundIds: number[] = [];
    
    for (const customerId of customerIds) {
      try {
        const customer = await db.customers.findById(customerId);
        if (customer && customer.isActive) {
          // Get merchant info for authorization check
          const merchant = await prisma.merchant.findUnique({
            where: { id: customer.merchantId },
            select: { id: true },
          });
          customers.push({
            ...customer,
            merchant,
          });
        } else {
          notFoundIds.push(customerId);
        }
      } catch (error) {
        notFoundIds.push(customerId);
      }
    }
    
    if (notFoundIds.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMERS_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check authorization: verify all customers belong to user's merchant
    const unauthorizedCustomers: Array<{ id: number; name: string }> = [];
    
    if (user.role !== USER_ROLE.ADMIN) {
      // Get user's merchant CUID for comparison
      const userMerchant = await prisma.merchant.findUnique({
        where: { id: userMerchantId! },
        select: { id: true },
      });
      
      if (!userMerchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
        );
      }
      
      for (const customer of customers) {
        // Compare merchant CUIDs
        if (customer.merchantId !== userMerchant.id) {
          unauthorizedCustomers.push({
            id: customer.id,
            name: `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown',
          });
        }
      }
    }

    if (unauthorizedCustomers.length > 0) {
      return NextResponse.json(
        ResponseBuilder.error('UNAUTHORIZED_TO_DELETE_SOME_CUSTOMERS'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Check for active orders before deletion
    const customersWithActiveOrders: Array<{ id: number; name: string; orderCount: number }> = [];
    
    for (const customer of customers) {
      const activeOrdersCount = await prisma.order.count({
        where: {
          customerId: customer.id,
          status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any] },
          deletedAt: null,
        },
      });

      if (activeOrdersCount > 0) {
        customersWithActiveOrders.push({
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown',
          orderCount: activeOrdersCount,
        });
      }
    }

    if (customersWithActiveOrders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'CUSTOMERS_HAVE_ACTIVE_ORDERS',
          message: `Cannot delete ${customersWithActiveOrders.length} customer(s) with active orders. Please complete or cancel these orders first.`,
          data: { customersWithActiveOrders }
        },
        { status: API.STATUS.CONFLICT }
      );
    }

    // All validations passed - proceed with batch delete in transaction
    const deletedCustomers: Array<{ id: number; name: string }> = [];
    const errors: Array<{ id: number; name: string; error: string }> = [];

    try {
      // Use transaction to ensure all-or-nothing deletion
      await prisma.$transaction(
        async (tx) => {
          for (const customer of customers) {
            try {
              await tx.customer.update({
                where: { id: customer.id }, // Use CUID
                data: { isActive: false },
              });
              deletedCustomers.push({
                id: customer.id,
                name: `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown',
              });
            } catch (error: any) {
              errors.push({
                id: customer.id,
                name: `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown',
                error: error.message || 'Failed to delete customer',
              });
              // If any customer fails, throw to rollback transaction
              throw error;
            }
          }
        },
        {
          timeout: 30000, // 30 seconds timeout
          maxWait: 10000, // 10 seconds max wait
        }
      );

      console.log(`✅ Batch deleted ${deletedCustomers.length} customers successfully`);

      return NextResponse.json(
        ResponseBuilder.success('CUSTOMERS_BATCH_DELETED_SUCCESS', {
          deleted: deletedCustomers.length,
          total: customerIds.length,
          deletedCustomers,
          errors,
        })
      );
    } catch (error: any) {
      console.error('❌ Error in batch delete transaction:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  } catch (error) {
    console.error('❌ Error in batch delete customers:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
