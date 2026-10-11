import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PLATFORM_OPS_ROLES, USER_ROLE } from '@rentalshop/constants';

/**
 * Add-ons and modules of one shop (#782).
 * GET: ADMIN, OPS, and the MERCHANT of that shop. POST: ADMIN, OPS (the admin records the payment).
 */

const addSchema = z.object({
  moduleId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(100000).default(1),
  method: z.enum(['STRIPE', 'TRANSFER']),
  transactionId: z.string().trim().min(1).max(200),
  reference: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  paymentDate: z.coerce.date().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolved = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolved.id);
  return withAuthRoles([...PLATFORM_OPS_ROLES, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) return validation.error!;
      const merchantId = validation.merchant?.id ?? merchantPublicId;
      const [modules, monthlyTotal] = await Promise.all([
        db.billingModules.listForMerchant(merchantId),
        db.billingModules.renewalMonthlyTotal(merchantId),
      ]);
      return NextResponse.json(ResponseBuilder.success('MERCHANT_MODULES_FOUND', { modules, monthlyTotal, currency: 'VND' }));
    } catch (error) {
      console.error('Error fetching merchant modules:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolved = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolved.id);
  return withAuthRoles([...PLATFORM_OPS_ROLES])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) return validation.error!;
      const merchantId = validation.merchant?.id ?? merchantPublicId;
      const parsed = addSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const result = await db.billingModules.addToMerchant({ merchantId, ...parsed.data });
      return NextResponse.json(ResponseBuilder.success('MERCHANT_MODULE_ADDED', result));
    } catch (error) {
      console.error('Error adding merchant module:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
