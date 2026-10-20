import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { BOOKING_REJECT_REASONS } from '../../../../../lib/booking-requests';
import { bookingScope, findScopedRequest } from '../../../../../lib/booking-shop';

const bodySchema = z.object({
  reason: z.enum(BOOKING_REJECT_REASONS),
  note: z.string().trim().max(500).optional().nullable(),
});

/**
 * POST /api/booking-requests/[id]/reject {reason: OUT_OF_STOCK|CANNOT_CONTACT|OTHER, note?} (#1124).
 * Only a PENDING, not expired request; else 409 BOOKING_REQUEST_CLOSED. The customer's tracking page shows the reason.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withPermissions(['bookings.manage'])(async (req: NextRequest, { user, userScope }) => {
    try {
      const scope = bookingScope(user, userScope);
      if (!scope) return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: 403 });
      const parsed = bodySchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      const row = await findScopedRequest(db.prisma, Number(id), scope);
      if (!row) return NextResponse.json(ResponseBuilder.error('BOOKING_REQUEST_NOT_FOUND'), { status: 404 });

      const now = new Date();
      const updated = await db.prisma.bookingRequest.updateMany({
        where: { id: row.id, status: 'PENDING', expiresAt: { gt: now } },
        data: {
          status: 'REJECTED',
          rejectReason: parsed.data.reason,
          rejectNote: parsed.data.note || null,
          decidedById: user.id,
          decidedAt: now,
        },
      });
      if (updated.count === 0) return NextResponse.json(ResponseBuilder.error('BOOKING_REQUEST_CLOSED'), { status: 409 });
      return NextResponse.json(ResponseBuilder.success('BOOKING_REQUEST_REJECTED', { id: row.id, code: row.code, status: 'REJECTED' }));
    } catch (error) {
      console.error('Error in POST /api/booking-requests/[id]/reject:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
