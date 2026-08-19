/**
 * POST /api/products/[id]/sync-embeddings
 * Force re-index one product for image search (delete Qdrant points, enqueue job).
 * For testing on the edit screen — does not wait for CLIP to finish.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { API, isSystemLevelUserRole } from '@rentalshop/constants';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['products.manage'])(async (_request, { user, userScope }) => {
    try {
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id, 10);

      if (!isSystemLevelUserRole(user.role) && !userScope.merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }

      const product = await db.products.findById(productId);
      if (!product) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const productMerchantId = (product as any).merchant?.id ?? (product as any).merchantId;
      if (!isSystemLevelUserRole(user.role) && productMerchantId !== userScope.merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const images = parseProductImages(product.images);
      if (images.length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('PRODUCT_HAS_NO_IMAGES'),
          { status: 400 }
        );
      }

      try {
        await db.products.update(productId, { embeddingGeneratedAt: null });
      } catch (clearError) {
        console.warn(
          `[Sync embeddings] Could not clear embeddingGeneratedAt for product ${productId}:`,
          (clearError as Error)?.message
        );
      }

      await db.embeddingJobs.enqueue({
        productId,
        source: 'manual-force',
        priority: 30
      });

      // Wait for THIS product so the edit screen can show Ready instead of
      // staying on Updating after a fire-and-forget job.
      try {
        await db.embeddingJobs.processPending({ batchSize: 1, productId });
      } catch (error: any) {
        console.error('[Sync embeddings] processPending failed:', error?.message || error);
      }

      const refreshed = await db.products.findById(productId);
      const indexedAt = (refreshed as any)?.embeddingGeneratedAt
        ? new Date((refreshed as any).embeddingGeneratedAt).toISOString()
        : null;

      return NextResponse.json(
        ResponseBuilder.success(indexedAt ? 'EMBEDDING_SYNC_COMPLETED' : 'EMBEDDING_SYNC_QUEUED', {
          productId,
          queued: indexedAt ? 0 : 1,
          images: images.length,
          embeddingGeneratedAt: indexedAt
        })
      );
    } catch (error) {
      console.error(`Error in POST /api/products/${id}/sync-embeddings:`, error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
