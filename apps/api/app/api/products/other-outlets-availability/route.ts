import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma, db } from '@rentalshop/database';
import { isOutletRole, USER_ROLE, API } from '@rentalshop/constants';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { resolveAvailabilityQueryWindow } from '../../../../lib/availability';
import { buildOtherOutletsResults, canSeeOtherOutlets, heldOrdersWhere } from '../../../../lib/other-outlets-availability';

export const runtime = 'nodejs';

// Same shape as batch-availability, so the cart sends the same days
const bodySchema = z
  .object({
    products: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.coerce.number().min(1).optional(), // accepted like batch-availability; the list does not depend on it
        })
      )
      .min(1)
      .max(100),
    orderType: z.enum(['RENT', 'SALE']).optional().default('RENT'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    outletId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.orderType === 'SALE' || !!d.date || !!(d.startDate && d.endDate), {
    message: "For RENT orders: either 'date' or both 'startDate' and 'endDate' must be provided.",
  });

/**
 * POST /api/products/other-outlets-availability  (#1347, #1335)
 * "Chi nhánh khác còn N": for products that are short at the order's branch, the OTHER open branches of the shop that
 * ticked the product (`OutletStock.isListed`) and still have units on the order's days. A hint to tell the customer:
 * one order is still one branch, nothing is moved between branches.
 *
 * Body: { products: [{ productId, quantity? }] (1..100), orderType? 'RENT'|'SALE', date | startDate+endDate (RENT),
 *         outletId? (the order's branch: required for ADMIN; MERCHANT defaults to the default branch; a branch role
 *         is always its own branch) }.
 * Response data: { results: [{ productId, outlets: [{ outletId, outletName, available }] }] } in `products` order,
 * `available > 0`, most units first then branch id; `[]` when no other branch has any (or the shop has one branch).
 *
 * Authorization: MERCHANT, ADMIN, OUTLET_ADMIN, OUTLET_INVENTORY (`canSeeOtherOutlets`); OUTLET_STAFF gets 403
 * INSUFFICIENT_PERMISSIONS. A branch outside the shop or a closed one: 404 OUTLET_NOT_FOUND; a product outside the
 * shop or deleted: 404 PRODUCTS_NOT_FOUND.
 * Days: Vietnam civil days via `resolveAvailabilityQueryWindow`, counted like batch-availability.
 * Indexed: OutletStock (productId, outletId) unique, (outletId, isListed); Order (outletId, ...).
 */
export const POST = withPermissions(['products.view'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
  try {
    if (!canSeeOtherOutlets(user.role)) {
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
    const { orderType, date, startDate, endDate, outletId: queryOutletId } = parsed.data;
    const productIds = Array.from(new Set(parsed.data.products.map((p) => p.productId)));

    const isAdmin = user.role === USER_ROLE.ADMIN;
    if (!isAdmin && !userScope.merchantId) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'), { status: 400 });
    }

    // The order's branch (same choice as batch-availability)
    let orderOutletId: number | undefined;
    if (isOutletRole(user.role)) {
      if (queryOutletId && queryOutletId !== userScope.outletId) {
        return NextResponse.json(ResponseBuilder.error('NO_OUTLET_ACCESS'), { status: API.STATUS.FORBIDDEN });
      }
      orderOutletId = queryOutletId || userScope.outletId || undefined;
    } else if (queryOutletId) {
      orderOutletId = queryOutletId;
    } else if (user.role === USER_ROLE.MERCHANT) {
      const fallback = await db.outlets.findDefaultForMerchant(userScope.merchantId as number);
      orderOutletId = fallback?.id;
    }
    if (!orderOutletId) {
      return NextResponse.json(ResponseBuilder.error('OUTLET_REQUIRED'), { status: 400 });
    }

    let window: ReturnType<typeof resolveAvailabilityQueryWindow> = null;
    if (orderType === 'RENT') {
      window = resolveAvailabilityQueryWindow({ date, startDate, endDate });
      if (!window) return NextResponse.json(ResponseBuilder.error('DATE_REQUIRED'), { status: 400 });
      if (window.start > window.end) return NextResponse.json(ResponseBuilder.error('INVALID_RENTAL_DATES'), { status: 400 });
    }

    // The order's branch must be an open branch of the caller's shop (ADMIN: any shop)
    const orderOutlet = await prisma.outlet.findFirst({
      where: { id: orderOutletId, isActive: true, ...(isAdmin ? {} : { merchantId: userScope.merchantId as number }) },
      select: { id: true, merchantId: true },
    });
    if (!orderOutlet) {
      return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, merchantId: orderOutlet.merchantId, deletedAt: null },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json(ResponseBuilder.error('PRODUCTS_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
    }

    const others: Array<{ id: number; name: string }> = await prisma.outlet.findMany({
      where: { merchantId: orderOutlet.merchantId, isActive: true, id: { not: orderOutlet.id } },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    const otherIds = others.map((o) => o.id);

    const stocks = otherIds.length
      ? await prisma.outletStock.findMany({
          where: { productId: { in: productIds }, outletId: { in: otherIds }, isListed: true },
          select: { productId: true, outletId: true, stock: true, isListed: true },
        })
      : [];

    const heldOrders = stocks.length
      ? await prisma.order.findMany({
          where: heldOrdersWhere({
            orderType,
            outletIds: otherIds,
            productIds,
            bounds: window ? window.bounds : null,
            now: new Date(),
          }) as never, // plain strings for the enum columns, like the batch-availability where
          select: {
            id: true,
            outletId: true,
            orderType: true,
            status: true,
            orderItems: { where: { productId: { in: productIds } }, select: { productId: true, quantity: true } },
          },
        })
      : [];

    const results = buildOtherOutletsResults({ productIds, outlets: others, stocks, heldOrders, orderType });
    // Answer in the order the caller sent them (duplicates answered once)
    return NextResponse.json(ResponseBuilder.success('OTHER_OUTLETS_AVAILABILITY_CHECKED', { results }));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
