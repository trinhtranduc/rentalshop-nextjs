// ============================================================================
// MERCHANT PAYMENTS API
// ============================================================================
// Handles payment processing for merchant plan changes and extensions

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

// Payment method validation
const paymentMethodSchema = z.enum(['STRIPE', 'TRANSFER', 'MANUAL', 'CASH', 'CHECK']);

// Payment type validation
const paymentTypeSchema = z.enum(['PLAN_CHANGE', 'PLAN_EXTENSION', 'SUBSCRIPTION_PAYMENT']);

// Payment status validation
const paymentStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']);

// Create payment request schema
const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: paymentMethodSchema,
  type: paymentTypeSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
  subscriptionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(), // For Stripe payments
  bankReference: z.string().optional(), // For bank transfers
});

// Update payment status schema
const updatePaymentStatusSchema = z.object({
  status: paymentStatusSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
});

// ============================================================================
// CREATE PAYMENT
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    const merchantId = params.id;

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: parseInt(merchantId) },
      include: { plan: true }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Create payment record
    const result = await prisma.$transaction(async (tx) => {
      // Get next payment public ID
      const lastPayment = await tx.payment.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const paymentPublicId = (lastPayment?.publicId || 0) + 1;

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          publicId: paymentPublicId,
          amount: validatedData.amount,
          method: validatedData.method,
          type: validatedData.type,
          status: 'PENDING',
          reference: validatedData.reference,
          notes: validatedData.notes,
          merchantId: merchant.id,
          subscriptionId: validatedData.subscriptionId,
          processedBy: user.id
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
          action: 'PAYMENT_CREATED',
          details: JSON.stringify({
            paymentId: payment.publicId,
            amount: payment.amount,
            method: payment.method,
            type: payment.type,
            merchantId: merchant.publicId,
            createdBy: user.id,
            createdByEmail: user.email
          }),
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment created successfully',
      data: {
        payment: {
          id: result.publicId,
          amount: result.amount,
          method: result.method,
          type: result.type,
          status: result.status,
          reference: result.reference,
          notes: result.notes,
          createdAt: result.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

// ============================================================================
// GET MERCHANT PAYMENTS
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const method = searchParams.get('method');

    // Build where clause
    const where: any = {
      merchant: { publicId: parseInt(merchantId) }
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (method) where.method = method;

    // Get payments
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
              planVariant: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.payment.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map(payment => ({
          id: payment.publicId,
          amount: payment.amount,
          method: payment.method,
          type: payment.type,
          status: payment.status,
          reference: payment.reference,
          notes: payment.notes,
          processedAt: payment.processedAt,
          createdAt: payment.createdAt,
          subscription: payment.subscription ? {
            id: payment.subscription.publicId,
            plan: payment.subscription.plan?.name,
            planVariant: payment.subscription.planVariant?.name
          } : null
        })),
        total,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

// ============================================================================
// UPDATE PAYMENT STATUS
// ============================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updatePaymentStatusSchema.parse(body);

    const merchantId = params.id;

    // Get payment
    const payment = await prisma.payment.findFirst({
      where: {
        publicId: parseInt(merchantId),
        merchant: { publicId: parseInt(merchantId) }
      }
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Update payment status
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: validatedData.status,
          reference: validatedData.reference || payment.reference,
          notes: validatedData.notes || payment.notes,
          processedBy: validatedData.processedBy || user.id,
          processedAt: validatedData.status === 'COMPLETED' ? new Date() : payment.processedAt,
          updatedAt: new Date()
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'PAYMENT',
          entityId: payment.id,
          action: 'PAYMENT_STATUS_UPDATED',
          details: JSON.stringify({
            paymentId: payment.publicId,
            oldStatus: payment.status,
            newStatus: validatedData.status,
            updatedBy: user.id,
            updatedByEmail: user.email
          }),
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return updatedPayment;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment: {
          id: result.publicId,
          status: result.status,
          reference: result.reference,
          notes: result.notes,
          processedAt: result.processedAt,
          updatedAt: result.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}
