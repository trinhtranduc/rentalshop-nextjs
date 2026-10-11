import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { softDeleteProducts, openOrdersByProductAndOutlet, PRODUCT_HAS_OPEN_ORDERS } from '../../../../lib/product-soft-delete';
import { API, USER_ROLE } from '@rentalshop/constants';
import { heldOutletsLabel, holdsStockAt, otherOutletsHolding, sharedFieldsLockedFor, type OtherOutletHold } from '../../../../lib/product-branch-rules';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * Batch delete schema
 */
const batchDeleteSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1, 'At least one product ID is required').max(3000, 'Cannot delete more than 3000 products at once'),
});

/**
 * POST /api/products/batch-delete
 * Soft delete several products (#389), same rule as DELETE /api/products/[id]:
 * - sets `deletedAt` and `isActive = false`; rows, images and order links stay;
 * - a product on a RESERVED or PICKUPED order is not deleted and is reported in `errors`
 *   (`code: PRODUCT_HAS_OPEN_ORDERS`); 409 when that is every product.
 *
 * Authorization: 'products.manage'; OUTLET_STAFF gets 403 PRODUCT_DELETE_MERCHANT_ONLY (#825)
 */
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 POST /api/products/batch-delete - User: ${user.email} (${user.role})`);

    // #825: a product is shared by every branch; OUTLET_STAFF does not delete it
    if (sharedFieldsLockedFor(user.role)) {
      return NextResponse.json(
        ResponseBuilder.error('PRODUCT_DELETE_MERCHANT_ONLY'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    
    // Validate input
    const parsed = batchDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { productIds } = parsed.data;

    // Get user scope for merchant isolation
    const userMerchantId = userScope.merchantId;
    
    // ADMIN users can delete products without merchantId (they have system-wide access)
    // Non-admin users need merchantId
    if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
        { status: 400 }
      );
    }

    // Fetch all products to validate
    // Note: Product.id is the public ID (Int), not a CUID
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true, // Only active products
        deletedAt: null,
      },
      include: {
        merchant: {
          select: {
            id: true, // Merchant.id is also Int (public ID)
          },
        },
        outletStock: { select: { outletId: true, stock: true, renting: true, outlet: { select: { id: true, name: true } } } },
      },
    });

    // Check if all products exist
    const foundIds = new Set(products.map(p => p.id));
    const notFoundIds = productIds.filter(id => !foundIds.has(id));
    
    if (notFoundIds.length > 0) {
      const errorResponse = ResponseBuilder.error('PRODUCTS_NOT_FOUND');
      return NextResponse.json(
        {
          ...errorResponse,
          data: { notFoundIds },
          error: `Products with IDs ${notFoundIds.join(', ')} not found or already deleted`
        },
        { status: 404 }
      );
    }

    // Check authorization: verify all products belong to user's merchant
    const unauthorizedProducts: Array<{ id: number; name: string }> = [];
    
    if (user.role !== USER_ROLE.ADMIN) {
      for (const product of products) {
        const productMerchantId = product.merchant?.id; // Merchant.id is Int (public ID)
        if (productMerchantId !== userMerchantId) {
          unauthorizedProducts.push({
            id: product.id, // Product.id is Int (public ID)
            name: product.name,
          });
        }
      }
    }

    // #825: OUTLET_ADMIN and Nhân viên kho delete only products their outlet holds (same rule as DELETE)
    if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_INVENTORY) {
      const notHeld = products.filter((p) => !holdsStockAt(p.outletStock, userScope.outletId));
      if (notHeld.length > 0) {
        return NextResponse.json(
          {
            ...ResponseBuilder.error('PRODUCT_NOT_AVAILABLE_AT_OUTLET'),
            data: { productIds: notHeld.map((p) => p.id) },
          },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    if (unauthorizedProducts.length > 0) {
      const errorResponse = ResponseBuilder.error('UNAUTHORIZED_TO_DELETE_SOME_PRODUCTS');
      return NextResponse.json(
        {
          ...errorResponse,
          data: { unauthorizedProducts },
          error: `You don't have permission to delete ${unauthorizedProducts.length} product(s)`
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // #825 (owner 2026-10-11): OUTLET_ADMIN / kho do not delete a product another outlet still holds
    // (stock, units on rent, open order); those are reported per product and not deleted
    const heldById = new Map<number, OtherOutletHold[]>();
    if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_INVENTORY) {
      const openOrders = await openOrdersByProductAndOutlet(prisma, products.map((p) => p.id));
      for (const p of products) {
        const held = otherOutletsHolding(p.outletStock, userScope.outletId, openOrders.get(p.id) || []);
        if (held.length > 0) heldById.set(p.id, held);
      }
    }

    // All validations passed - soft delete the products that are not on an open order (#389)
    const { deletedIds, blockedIds } = await softDeleteProducts(
      prisma,
      products.map((p) => p.id).filter((id) => !heldById.has(id))
    );
    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const deletedProducts = deletedIds.map((id) => ({ id, name: nameById.get(id) || '' }));
    const errors: Array<{ id: number; name: string; error: string; code?: string; outlets?: OtherOutletHold[] }> = [
      ...[...heldById].map(([id, outlets]) => ({
        id,
        name: nameById.get(id) || '',
        error: 'PRODUCT_HELD_BY_OTHER_OUTLETS',
        code: 'PRODUCT_HELD_BY_OTHER_OUTLETS',
        outlets,
      })),
      ...blockedIds.map((id) => ({
        id,
        name: nameById.get(id) || '',
        error: PRODUCT_HAS_OPEN_ORDERS,
        code: PRODUCT_HAS_OPEN_ORDERS,
      })),
    ];

    // Image search must not find them any more; images stay in S3 for the orders that show them
    if (deletedIds.length > 0) {
      try {
        const { getVectorStore } = await import('@rentalshop/database/server');
        const vectorStore = getVectorStore();
        for (const id of deletedIds) {
          vectorStore.deleteProductEmbeddings(id).catch((error: any) => {
            console.error(`⚠️ Warning: Failed to delete embeddings for product ${id}:`, error?.message || error);
          });
        }
      } catch (error: any) {
        console.error('⚠️ Warning: Could not start embedding deletion:', error?.message || error);
      }
    }

    console.log(`✅ Batch deleted ${deletedProducts.length} products successfully (${errors.length} failed)`);

    // Nothing was deleted: every product is held by another outlet (#825) or on an open order
    if (deletedProducts.length === 0 && errors.length > 0) {
      if (blockedIds.length === 0) {
        const holds = [...heldById.values()].flat();
        const byOutlet = new Map<number, OtherOutletHold>();
        for (const h of holds) {
          const sum = byOutlet.get(h.id) || { ...h, stock: 0, renting: 0, openOrders: 0 };
          sum.stock += h.stock;
          sum.renting += h.renting;
          sum.openOrders += h.openOrders;
          byOutlet.set(h.id, sum);
        }
        return NextResponse.json(
          {
            ...ResponseBuilder.error('PRODUCT_HELD_BY_OTHER_OUTLETS'),
            data: { errors, messageParams: { outlets: heldOutletsLabel([...byOutlet.values()]) } },
          },
          { status: API.STATUS.CONFLICT }
        );
      }
      return NextResponse.json(
        { ...ResponseBuilder.error(PRODUCT_HAS_OPEN_ORDERS), data: { errors } },
        { status: API.STATUS.CONFLICT }
      );
    }

    // If some succeeded, return partial success
    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_BATCH_DELETED_SUCCESS', {
        deleted: deletedProducts.length,
        failed: errors.length,
        total: productIds.length,
        deletedProducts,
        errors: errors.length > 0 ? errors : undefined,
      })
    );
  } catch (error: any) {
    console.error('❌ Error in batch delete products:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500), // Limit stack trace length
    });
    
    // Check for specific error types that should return SERVICE_UNAVAILABLE
    if (
      error?.code === 'P1001' || // Prisma connection error
      error?.code === 'ECONNREFUSED' || // Connection refused
      error?.message?.includes('timeout') ||
      error?.message?.includes('TIMEOUT') ||
      error?.code === 'ETIMEDOUT' ||
      error?.status === 502 || // Bad Gateway
      error?.code === 502
    ) {
      return NextResponse.json(
        ResponseBuilder.error('SERVICE_UNAVAILABLE'),
        { status: 503 }
      );
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
