import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthRoles } from '@rentalshop/auth/server';
import { MODULES } from '@rentalshop/constants';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { endOfVnDay } from '../../../../../../lib/attendance/rules';
import { dateKeySchema } from '../../../../../../lib/attendance/schemas';
import { moduleCatalogView } from '../../../../../../lib/merchant-modules';

type Params = { params: Promise<{ id: string; key: string }> | { id: string; key: string } };

const bodySchema = z.object({ enabled: z.boolean(), endDate: dateKeySchema.nullable().optional() });

/**
 * PUT /api/merchants/[id]/modules/[key] { enabled, endDate?: 'YYYY-MM-DD' | null } — #907 rule 4. ADMIN only.
 * endDate is inclusive and stored as the end of that VN day. Turning a module off keeps every row.
 * Writes an AuditLog (MERCHANT_MODULE_UPDATED).
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const p = await Promise.resolve(params);
  const merchantId = Number(p.id);
  const key = String(p.key || '');
  return withAuthRoles(['ADMIN'], { requireActiveSubscription: false })(async (req: NextRequest, { user }: { user: { id: number } }) => {
    try {
      if (!Number.isInteger(merchantId) || merchantId <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_MERCHANT_ID'), { status: 400 });
      }
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        raw = undefined;
      }
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      if (!MODULES.some((m) => m.key === key)) return NextResponse.json(ResponseBuilder.error('NOT_FOUND'), { status: 404 });
      const merchant = await db.merchants.findById(merchantId);
      if (!merchant) return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });

      const endsAt = parsed.data.endDate ? endOfVnDay(parsed.data.endDate) : null;
      const saved = await db.merchantModules.upsert(merchantId, key, {
        enabled: parsed.data.enabled,
        endsAt,
        updatedById: user.id,
      });
      await db.auditLogs.create({
        entityType: 'MERCHANT_MODULE',
        entityId: `${merchantId}:${key}`,
        action: 'MERCHANT_MODULE_UPDATED',
        details: JSON.stringify({ key, enabled: parsed.data.enabled, endDate: parsed.data.endDate ?? null }),
        userId: user.id,
        merchantId,
      });
      const view = moduleCatalogView([{ key, enabled: saved.enabled, endsAt: saved.endsAt }]).find((m) => m.key === key);
      return NextResponse.json(ResponseBuilder.success('MERCHANT_MODULE_UPDATED', view));
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
