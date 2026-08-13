import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';

// Force dynamic rendering - database health check needs runtime connection
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Lightweight DB health check.
 * Do NOT call prisma.$disconnect() — that tears down the shared singleton pool
 * and contributes to "too many clients already" under probe load.
 */
export async function GET(_request: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const productCount = await prisma.product.count();

    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      tables: {
        products: 'accessible',
      },
      counts: {
        products: productCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        ...response,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
