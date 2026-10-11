import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PLATFORM_OPS_ROLES } from '@rentalshop/constants';

/**
 * Catalog of add-ons (kind "quantity": branches, staff) and modules (kind "feature": Loyalty, Payroll).
 * The admin defines each item and its VND price for the whole shop (#782).
 * Authorization: ADMIN, OPS.
 */

const limitInt = z.coerce.number().int().min(0).max(100000);
const limitsSchema = z
  .object({ outlets: limitInt, users: limitInt, products: limitInt, customers: limitInt, orders: limitInt })
  .partial()
  .strict();

const createModuleSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(['quantity', 'feature']).default('quantity'),
    featureKey: z.string().trim().min(1).max(60).optional(),
    limits: limitsSchema.optional(),
    monthlyPrice: z.coerce.number().min(0).max(1_000_000_000),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'quantity') {
      const has = Object.values(value.limits ?? {}).some((n) => Number(n) > 0);
      if (!has) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['limits'], message: 'An add-on must add at least one limit' });
    } else if (!value.featureKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['featureKey'], message: 'A module needs a featureKey' });
    }
  });

/** GET /api/billing-modules?includeInactive=false */
export const GET = withAuthRoles([...PLATFORM_OPS_ROLES])(async (request: NextRequest) => {
  try {
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') !== 'false';
    const modules = await db.billingModules.listCatalog(includeInactive);
    return NextResponse.json(ResponseBuilder.success('BILLING_MODULES_FOUND', { modules }));
  } catch (error) {
    console.error('Error listing billing modules:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/** POST /api/billing-modules */
export const POST = withAuthRoles([...PLATFORM_OPS_ROLES])(async (request: NextRequest) => {
  try {
    const parsed = createModuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const module = await db.billingModules.createCatalogItem(parsed.data as any);
    return NextResponse.json(ResponseBuilder.success('BILLING_MODULE_CREATED', { module }));
  } catch (error) {
    console.error('Error creating billing module:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
