/**
 * POST /api/products/index-images
 *
 * One-tap shop scan: queue CLIP embeddings for every active product that has
 * photos and is not indexed yet. Already-indexed products are skipped.
 * Cron `/api/cron/embedding-jobs` drains the queue in the background.
 */

import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { isSystemLevelUserRole } from '@rentalshop/constants';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
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

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const merchantId = isSystemLevelUserRole(user.role)
      ? parsed.data.merchantId
      : userScope.merchantId;

    if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
        { status: 400 }
      );
    }

    const result = await db.embeddingJobs.queueShopImageIndex({
      merchantId,
      force: parsed.data.force === true
    });

    return NextResponse.json(
      ResponseBuilder.success('EMBEDDING_SHOP_INDEX_QUEUED', {
        merchantId,
        ...result,
        force: parsed.data.force === true
      })
    );
  } catch (error) {
    console.error('Error in POST /api/products/index-images:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
