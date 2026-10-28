import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, withAnyAuth } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';
import {
  DEFAULT_DEPOSIT_TEMPLATE,
  depositTemplateSchema,
  MAX_CANCELLATION_POLICY_LENGTH,
  MAX_TEMPLATES,
  readPaymentSettings,
} from '../../../../../../packages/utils/src/core/deposit-plan';
import { mergePaymentSettings } from '../../../../lib/installments';

/**
 * GET /api/settings/deposit  (#1199 "Cách thu cọc")
 * Any signed-in role of the shop reads: { depositMode: 'ONE_TIME' | 'STAGED', cancellationPolicy, templates, defaultTemplate }.
 * Missing settings = ONE_TIME for every shop. `defaultTemplate` is the built-in template used while a STAGED shop has none.
 *
 * PUT /api/settings/deposit
 * Only the shop owner (role MERCHANT): 403 INSUFFICIENT_PERMISSIONS for every other role, nothing written.
 * Partial body: { depositMode?, cancellationPolicy?, templates? }. A template has 1-3 PERCENT stages that add up
 * to 100 or less; at most 10 templates. Invalid → 400 DEPOSIT_SETTINGS_INVALID. Other keys of `Merchant.settings` are kept.
 */
const putSchema = z.object({
  depositMode: z.enum(['ONE_TIME', 'STAGED']).optional(),
  cancellationPolicy: z.string().trim().max(MAX_CANCELLATION_POLICY_LENGTH).optional(),
  templates: z.array(depositTemplateSchema).max(MAX_TEMPLATES).optional(),
});

function present(settings: unknown) {
  const payment = readPaymentSettings(settings);
  return {
    depositMode: payment.depositMode,
    cancellationPolicy: payment.cancellationPolicy,
    templates: payment.templates,
    defaultTemplate: DEFAULT_DEPOSIT_TEMPLATE,
  };
}

async function merchantOf(userId: number) {
  const dbUser = await db.users.findById(userId);
  return dbUser?.merchant?.id ?? null;
}

export const GET = withAnyAuth(async (_request: NextRequest, { user }) => {
  try {
    const merchantId = await merchantOf(user.id);
    if (merchantId == null) {
      return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: API.STATUS.FORBIDDEN });
    }
    const row = await (db.prisma as any).merchant.findUnique({ where: { id: merchantId }, select: { settings: true } });
    return NextResponse.json(ResponseBuilder.success('DEPOSIT_SETTINGS_SUCCESS', present(row?.settings)));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const PUT = withPermissions(['merchant.manage'])(async (request: NextRequest, { user }) => {
  try {
    if (user.role !== USER_ROLE.MERCHANT) {
      return NextResponse.json(ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'), { status: API.STATUS.FORBIDDEN });
    }
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.error('DEPOSIT_SETTINGS_INVALID'), { status: API.STATUS.BAD_REQUEST });
    }
    const merchantId = await merchantOf(user.id);
    if (merchantId == null) {
      return NextResponse.json(ResponseBuilder.error('NO_MERCHANT_ACCESS'), { status: API.STATUS.FORBIDDEN });
    }
    const templates = parsed.data.templates;
    if (templates && templates.filter((template) => template.isDefault).length > 1) {
      return NextResponse.json(ResponseBuilder.error('DEPOSIT_SETTINGS_INVALID'), { status: API.STATUS.BAD_REQUEST });
    }
    if (templates && new Set(templates.map((template) => template.id)).size !== templates.length) {
      return NextResponse.json(ResponseBuilder.error('DEPOSIT_SETTINGS_INVALID'), { status: API.STATUS.BAD_REQUEST });
    }

    const row = await (db.prisma as any).merchant.findUnique({ where: { id: merchantId }, select: { settings: true } });
    const current = readPaymentSettings(row?.settings);
    const next = {
      ...current,
      ...(parsed.data.depositMode !== undefined ? { depositMode: parsed.data.depositMode } : {}),
      ...(parsed.data.cancellationPolicy !== undefined ? { cancellationPolicy: parsed.data.cancellationPolicy } : {}),
      ...(templates !== undefined ? { templates } : {}),
    };
    const updated = await (db.prisma as any).merchant.update({
      where: { id: merchantId },
      data: { settings: mergePaymentSettings(row?.settings, next) },
      select: { settings: true },
    });
    return NextResponse.json(ResponseBuilder.success('DEPOSIT_SETTINGS_UPDATED', present(updated?.settings)));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
