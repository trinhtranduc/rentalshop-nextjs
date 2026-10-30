import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { createAuditHelper } from '@rentalshop/utils/server';
import { API, USER_ROLE } from '@rentalshop/constants';
import { safeAudit } from '../../../../lib/change-timeline';
import { canSetBranchListing } from '../../../../lib/product-listing';

export const runtime = 'nodejs';

const bodySchema = z.object({
  outletId: z.number().int().positive(),
  productIds: z.array(z.number().int().positive()).min(1, 'At least one product').max(200, 'At most 200 products'),
  isListed: z.boolean(),
});

/**
 * PUT /api/products/listing  (#1341, #1335)
 * Tick (`isListed: true`) or untick "Hiện ở chi nhánh" for one branch and one or many products.
 * Body: { outletId, productIds: number[] (1..200), isListed }.
 *
 * Authorization: only the owner. `canSetBranchListing(role)` is MERCHANT and ADMIN; OUTLET_ADMIN, OUTLET_INVENTORY and
 * OUTLET_STAFF get 403 INSUFFICIENT_PERMISSIONS, for their own branch too. MERCHANT: branches and products of the own
 * shop only (404 OUTLET_NOT_FOUND / PRODUCT_NOT_FOUND otherwise); a closed branch is 404.
 *
 * Unticking has no condition: stock, units on rent and open orders do not matter, and stock, renting and available are
 * never written. The tick only changes the product list of the branch and which products can be put on a NEW order.
 * Sending the value a row already has is not a change. A product without a row at the branch gets one (ticking only).
 * Indexed: OutletStock (productId, outletId) unique, (outletId, isListed).
 */
export const PUT = withPermissions(['products.view'])(async (request, { user, userScope }) => {
  try {
    if (!canSetBranchListing(user.role)) {
      return NextResponse.json(ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'), { status: API.STATUS.FORBIDDEN });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const { outletId, isListed } = parsed.data;
    const productIds = Array.from(new Set(parsed.data.productIds));

    // The branch must be an open branch of the caller's shop (ADMIN: any shop)
    const outlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        isActive: true,
        ...(user.role === USER_ROLE.ADMIN ? {} : { merchantId: userScope.merchantId ?? -1 }),
      },
      select: { id: true, name: true, merchantId: true },
    });
    if (!outlet) {
      return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
    }

    // Every product must belong to the same shop and not be deleted
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, merchantId: outlet.merchantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json(ResponseBuilder.error('PRODUCT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
    }

    const rows = await prisma.outletStock.findMany({
      where: { outletId, productId: { in: productIds } },
      select: { productId: true, isListed: true },
    });
    const rowOf = new Map<number, boolean>(rows.map((r: { productId: number; isListed: boolean }) => [r.productId, r.isListed]));
    const toChange = productIds.filter((id) => rowOf.has(id) && rowOf.get(id) !== isListed);
    const missing = isListed ? productIds.filter((id) => !rowOf.has(id)) : [];

    const writes: Array<Promise<unknown>> = [];
    if (toChange.length > 0) {
      writes.push(prisma.outletStock.updateMany({ where: { outletId, productId: { in: toChange } }, data: { isListed } }));
    }
    if (missing.length > 0) {
      writes.push(
        prisma.outletStock.createMany({
          data: missing.map((productId) => ({ productId, outletId, stock: 0, available: 0, renting: 0, isListed: true })),
          skipDuplicates: true,
        })
      );
    }
    if (writes.length > 0) await prisma.$transaction(writes as never);

    // #519 change history: one row per product whose tick changed
    const changedIds = new Set<number>([...toChange, ...missing]);
    const audit = createAuditHelper(prisma);
    const context = {
      userId: String(user.id),
      userEmail: user.email,
      userRole: user.role,
      merchantId: String(outlet.merchantId),
      outletId: String(outlet.id),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    };
    await Promise.all(
      products
        .filter((p: { id: number }) => changedIds.has(p.id))
        .map((p: { id: number; name: string }) =>
          safeAudit('update', () =>
            audit.logUpdate({
              entityType: 'Product',
              entityId: String(p.id),
              entityName: p.name,
              oldValues: { listedAtOutlet: { [outlet.name]: !isListed } },
              newValues: { listedAtOutlet: { [outlet.name]: isListed } },
              description: `${isListed ? 'Listed' : 'Unlisted'} at ${outlet.name}: ${p.name}`,
              context,
            })
          )
        )
    );

    return NextResponse.json(
      ResponseBuilder.success('PRODUCT_UPDATED_SUCCESS', { outletId, isListed, productIds, changed: changedIds.size })
    );
  } catch (error) {
    console.error('❌ Error in PUT /api/products/listing:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
