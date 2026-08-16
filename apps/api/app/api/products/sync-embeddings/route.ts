/**
 * POST /api/products/sync-embeddings
 * Queue CLIP embeddings for existing products that have images
 * but have never been indexed (embeddingGeneratedAt = null).
 *
 * Not an auto-backfill: merchants trigger this once for their catalog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, parseProductImages } from '@rentalshop/utils';
import { isSystemLevelUserRole } from '@rentalshop/constants';
import { z } from 'zod';

export const runtime = 'nodejs';

const MAX_SYNC_BATCH = 500;

const syncSchema = z.object({
  force: z.boolean().optional(),
  merchantId: z.number().int().positive().optional()
});

export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const force = parsed.data.force === true;
    const merchantId = isSystemLevelUserRole(user.role)
      ? parsed.data.merchantId
      : userScope.merchantId;

    if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
        { status: 400 }
      );
    }

    const candidates = await prisma.product.findMany({
      where: {
        merchantId,
        isActive: true,
        ...(force ? {} : { embeddingGeneratedAt: null })
      },
      select: { id: true, images: true }
    });

    const withImages = candidates
      .filter((product) => parseProductImages(product.images).length > 0)
      .map((product) => product.id);
    const productIds = withImages.slice(0, MAX_SYNC_BATCH);

    let queued = 0;
    for (const productId of productIds) {
      await db.embeddingJobs.enqueue({
        productId,
        source: force ? 'manual-force' : 'manual',
        priority: 5
      });
      queued += 1;
    }

    // Kick the queue without blocking this request; cron continues the rest.
    void db.embeddingJobs
      .processPending({ batchSize: 3 })
      .catch((error: any) => {
        console.error('[Sync embeddings] processPending failed:', error?.message || error);
      });

    return NextResponse.json(
      ResponseBuilder.success('EMBEDDING_SYNC_QUEUED', {
        merchantId,
        matched: withImages.length,
        queued,
        force,
        hasMore: withImages.length > MAX_SYNC_BATCH
      })
    );
  } catch (error) {
    console.error('Error in POST /api/products/sync-embeddings:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
