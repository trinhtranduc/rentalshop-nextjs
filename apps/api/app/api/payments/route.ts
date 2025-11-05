import { NextRequest, NextResponse } from 'next/server';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/payments
 * Get payments list
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { invoiceNumber: { contains: search } },
        { transactionId: { contains: search } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (method && method !== 'all') {
      where.method = method.toUpperCase();
    }

    // Fetch all payments using Prisma
    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: true,
              outlet: true
            }
          },
          subscription: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.payment.count({ where })
    ]);

    // Transform data for frontend
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      orderId: payment.orderId,
      subscriptionId: payment.subscriptionId,
      planName: payment.subscription ? 'Subscription Payment' : (payment.orderId ? 'Order Payment' : 'Manual Payment'),
      amount: payment.amount,
      currency: payment.currency || 'USD',
      status: payment.status?.toLowerCase() || 'pending',
      paymentMethod: payment.method?.toLowerCase() || 'unknown',
      invoiceNumber: payment.invoiceNumber || payment.reference || `PAY-${payment.id}`,
      description: payment.description || payment.notes || 'Payment',
      transactionId: payment.transactionId || payment.reference || `txn_${payment.id}`,
      createdAt: payment.createdAt?.toISOString(),
      processedAt: payment.processedAt?.toISOString(),
      failureReason: payment.failureReason,
      order: payment.order ? {
        orderNumber: payment.order.orderNumber,
        customerName: payment.order.customer ? `${payment.order.customer.firstName} ${payment.order.customer.lastName}` : null,
        outletName: payment.order.outlet.name
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: transformedPayments,
      total,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
