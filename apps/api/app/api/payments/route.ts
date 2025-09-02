import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function GET(request: NextRequest) {
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

    // Check if user is ADMIN (only admins can view all payments)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

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
        { description: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { merchant: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (method && method !== 'all') {
      where.method = method.toUpperCase();
    }

    // Fetch payments with related data
    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: {
          subscription: {
            include: {
              merchant: {
                select: {
                  name: true
                }
              },
              plan: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.subscriptionPayment.count({ where })
    ]);

    // Transform data for frontend
    const transformedPayments = payments.map(payment => {
      return {
        id: payment.publicId,
        merchantId: payment.subscription.merchant.publicId,
        merchantName: payment.subscription.merchant.name,
        planName: payment.subscription.plan.name,
        amount: payment.amount,
        currency: payment.currency || 'USD',
        status: payment.status.toLowerCase(),
        paymentMethod: payment.method.toLowerCase(),
        billingCycle: payment.subscription.billingCycle?.toLowerCase() || 'monthly',
        invoiceNumber: payment.invoiceNumber || `INV-${payment.publicId}`,
        description: payment.description || `${payment.subscription.plan.name} Plan Payment`,
        transactionId: payment.transactionId || `txn_${payment.publicId}`,
        createdAt: payment.createdAt.toISOString(),
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
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
