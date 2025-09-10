import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

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

    // Fetch all payments using unified Payment model
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          merchant: {
            select: {
              name: true,
              publicId: true
            }
          },
          subscription: {
            include: {
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
      prisma.payment.count({ where })
    ]);

    // Transform data for frontend
    const transformedPayments = payments.map(payment => {
      return {
        id: payment.publicId,
        merchantId: payment.merchant?.publicId || payment.subscription?.merchant?.publicId || 0,
        merchantName: payment.merchant?.name || payment.subscription?.merchant?.name || 'Unknown Merchant',
        planName: payment.subscription?.plan?.name || 'Manual Payment',
        amount: payment.amount,
        currency: payment.currency || 'USD',
        status: payment.status.toLowerCase(),
        paymentMethod: payment.method.toLowerCase(),
        invoiceNumber: payment.invoiceNumber || payment.reference || `PAY-${payment.publicId}`,
        description: payment.description || payment.notes || 'Payment',
        transactionId: payment.transactionId || payment.reference || `txn_${payment.publicId}`,
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
