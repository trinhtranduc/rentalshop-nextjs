import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { expirePointsDaily } from '@rentalshop/loyalty';
import { ResponseBuilder } from '@rentalshop/utils';

/**
 * POST /api/cron/loyalty-expire
 * Daily worker for loyalty point expiry (per_transaction + yearly_reset)
 * Auth: Bearer ${CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(ResponseBuilder.error('UNAUTHORIZED'), { status: 401 });
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: {
      isActive: true,
      pointsExpiryMode: { not: 'never' },
    },
  });

  const results: Array<{
    merchantId: number;
    expiredLots: number;
    resetWallets: number;
  }> = [];

  for (const program of programs) {
    const result = await prisma.$transaction(async (tx) =>
      expirePointsDaily(tx, program)
    );

    results.push({
      merchantId: program.merchantId,
      expiredLots: result.expiredLots,
      resetWallets: result.resetWallets,
    });
  }

  return NextResponse.json(
    ResponseBuilder.success('LOYALTY_EXPIRY_COMPLETED', {
      processedMerchants: results.length,
      results,
    })
  );
}
