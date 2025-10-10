import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {

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
        { transactionId: { contains: search } },
        { merchant: { name: { contains: search } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (method && method !== 'all') {
      where.method = method.toUpperCase();
    }

    // Fetch all payments using simplified database API
    const result = await db.payments.search({
      ...where,
      page: Math.floor(offset / limit) + 1,
      limit
    });
    
    const payments = result.data;
    const total = result.total;

    // Get merchant and subscription data for payments
    const merchantIds = [...new Set(payments.map(p => p.merchantId).filter(Boolean))];
    const subscriptionIds = [...new Set(payments.map(p => p.subscriptionId).filter(Boolean))];
    
    // Fetch merchant data
    const merchants = merchantIds.length > 0 
      ? await Promise.all(merchantIds.map(id => id ? db.merchants.findById(id) : null))
      : [];
    const merchantMap = merchants.reduce((acc, merchant) => {
      if (merchant) acc[merchant.id] = merchant;
      return acc;
    }, {} as Record<string, any>);

    // Fetch subscription data with plans
    const subscriptions = subscriptionIds.length > 0
      ? await Promise.all(subscriptionIds.map(id => id ? db.subscriptions.findById(id) : null))
      : [];
    const subscriptionMap = subscriptions.reduce((acc, sub) => {
      if (sub) acc[sub.id] = sub;
      return acc;
    }, {} as Record<string, any>);

    // Transform data for frontend with real data
    const transformedPayments = payments.map(payment => {
      const merchant = payment.merchantId ? merchantMap[payment.merchantId] : null;
      const subscription = payment.subscriptionId ? subscriptionMap[payment.subscriptionId] : null;
      
      return {
        id: payment.id,
        merchantId: payment.merchantId || 0,
        merchantName: merchant?.name || 'Unknown Merchant',
        planName: subscription?.planName || 'Manual Payment',
        amount: payment.amount,
        currency: payment.currency || 'USD',
        status: payment.status?.toLowerCase() || 'pending',
        paymentMethod: payment.method?.toLowerCase() || 'unknown',
        invoiceNumber: payment.invoiceNumber || payment.reference || `PAY-${payment.id}`,
        description: payment.description || payment.notes || 'Payment',
        transactionId: payment.transactionId || payment.reference || `txn_${payment.id}`,
        createdAt: payment.createdAt?.toISOString(),
        processedAt: payment.processedAt?.toISOString(),
        failureReason: payment.failureReason
      };
    });

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
