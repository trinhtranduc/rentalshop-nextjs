import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { softDeleteProducts, PRODUCT_HAS_OPEN_ORDERS } from '../../../../lib/product-soft-delete';
import { API, USER_ROLE } from '@rentalshop/constants';
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
 * Authorization: Users with 'products.manage' permission can delete products
 */
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    console.log(`🔍 POST /api/products/batch-delete - User: ${user.email} (${user.role})`);

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

    // All validations passed - soft delete the products that are not on an open order (#389)
    const { deletedIds, blockedIds } = await softDeleteProducts(prisma, products.map((p) => p.id));
    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const deletedProducts = deletedIds.map((id) => ({ id, name: nameById.get(id) || '' }));
    const errors: Array<{ id: number; name: string; error: string; code?: string }> = blockedIds.map((id) => ({
      id,
      name: nameById.get(id) || '',
      error: PRODUCT_HAS_OPEN_ORDERS,
      code: PRODUCT_HAS_OPEN_ORDERS,
    }));

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

    // Every product is on an open order: nothing was deleted
    if (deletedProducts.length === 0 && errors.length > 0) {
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
