import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { buildCorsHeaders } from '@rentalshop/utils/server';
import { compressImageForEmbedding } from '../../../../../lib/image-compression';
import { cacheSearchHits, generateImageHash, getCachedSearchHits, type ImageSearchHit } from '../../../../../lib/image-search-cache';
import { clientIpOf, takeRateSlot } from '../../../../../lib/booking-requests';
import {
  PUBLIC_IMAGE_SEARCH_RATE,
  PUBLIC_IMAGE_SEARCH_VECTOR_LIMIT,
  checkPublicSearchImage,
  publicSearchResults,
  type SearchRow,
} from '../../../../../lib/public-image-search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ tenantKey: string }> | { tenantKey: string } };
const json = (request: NextRequest, body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: buildCorsHeaders(request) });

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request) });
}

/**
 * POST /api/public/{tenantKey}/search-by-image — #1128. Multipart `image` (jpeg/png/webp, ≤ 5 MB).
 * 200 PRODUCTS_FOUND / NO_PRODUCTS_FOUND {products: public product + similarity (≤ 10), total};
 * 400 NO_IMAGE_FILE / IMAGE_VALIDATION_FAILED / INVALID_TENANT_KEY; 404 MERCHANT_NOT_FOUND; 403 MERCHANT_INACTIVE;
 * 429 IMAGE_SEARCH_RATE_LIMITED (per IP and per shop); 503 SEARCH_TIMEOUT / SEARCH_FAILED. The photo is not stored.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tenantKey } = await Promise.resolve(params);
    if (!tenantKey || !/^[a-z0-9-]+$/i.test(tenantKey)) return json(request, ResponseBuilder.error('INVALID_TENANT_KEY'), 400);
    const merchant = await db.merchants.findByTenantKey(tenantKey);
    if (!merchant) return json(request, ResponseBuilder.error('MERCHANT_NOT_FOUND'), 404);
    if (!merchant.isActive) return json(request, ResponseBuilder.error('MERCHANT_INACTIVE'), 403);

    const form = await request.formData();
    const file = form.get('image') as File | null;
    const invalid = checkPublicSearchImage(file);
    if (invalid) return json(request, ResponseBuilder.error(invalid), 400);

    const now = Date.now();
    const { perIp, perShop } = PUBLIC_IMAGE_SEARCH_RATE;
    if (
      !takeRateSlot(`imgsearch:ip:${clientIpOf(request)}`, perIp.limit, perIp.windowMs, now) ||
      !takeRateSlot(`imgsearch:shop:${merchant.id}`, perShop.limit, perShop.windowMs, now)
    ) {
      return json(request, ResponseBuilder.error('IMAGE_SEARCH_RATE_LIMITED'), 429);
    }

    const buffer = Buffer.from(new Uint8Array(await (file as File).arrayBuffer()));
    const minSimilarity = parseFloat(process.env.IMAGE_SEARCH_MIN_SIMILARITY || '0.5');
    const scope = { merchantId: merchant.id, categoryId: undefined, minSimilarity };
    const imageHash = await generateImageHash(buffer);
    let hits: ImageSearchHit[] | null = getCachedSearchHits(imageHash, scope);

    if (!hits) {
      const { getEmbeddingService, getVectorStore } = await import('@rentalshop/database/server');
      let embedding: number[];
      try {
        embedding = await getEmbeddingService().generateEmbeddingFromBuffer(await compressImageForEmbedding(buffer));
      } catch (error) {
        const err = error as { name?: string; message?: string } | undefined;
        const message = err?.message ? String(err.message) : String(error);
        if (err?.name === 'AbortError' || message.toLowerCase().includes('timeout')) {
          return json(request, ResponseBuilder.error('SEARCH_TIMEOUT'), 503);
        }
        console.error('❌ Public image search: /embed failed:', message);
        return json(request, ResponseBuilder.error('SEARCH_FAILED'), 503);
      }
      const raw = await getVectorStore().search(embedding, { merchantId: merchant.id, minSimilarity, limit: PUBLIC_IMAGE_SEARCH_VECTOR_LIMIT });
      const seen = new Set<number>();
      hits = [];
      for (const hit of raw) {
        const productId = Number(hit.productId);
        if (!Number.isFinite(productId) || seen.has(productId)) continue;
        seen.add(productId);
        hits.push({ productId, similarity: hit.similarity });
      }
      cacheSearchHits(imageHash, scope, hits);
    }

    const rows = hits.length ? await db.products.findByIds(hits.map((h) => h.productId)) : [];
    const products = publicSearchResults(hits, rows as unknown as SearchRow[], merchant.id);
    return json(
      request,
      ResponseBuilder.success(products.length ? 'PRODUCTS_FOUND' : 'NO_PRODUCTS_FOUND', { products, total: products.length })
    );
  } catch (error) {
    console.error('❌ Public image search failed:', (error as Error | undefined)?.message || error);
    const { response, statusCode } = handleApiError(error);
    if (statusCode >= 500) return json(request, ResponseBuilder.error('SEARCH_FAILED'), 503);
    return json(request, response, statusCode);
  }
}
