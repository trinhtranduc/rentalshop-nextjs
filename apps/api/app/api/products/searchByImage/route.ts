/**
 * POST /api/products/searchByImage
 *
 * Node orchestrates: compress → Python /embed → Qdrant → Postgres.
 * Python must not open the tenant database or Qdrant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { ResponseBuilder, handleApiError, parseProductImages } from '@rentalshop/utils';
import { VALIDATION, isSystemLevelUserRole } from '@rentalshop/constants';
import { compressImageForEmbedding } from '../../../../lib/image-compression';
import {
  generateImageHash,
  getCachedSearchResults,
  cacheSearchResults
} from '../../../../lib/image-search-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TYPES = VALIDATION.ALLOWED_IMAGE_TYPES;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = VALIDATION.MAX_FILE_SIZE;

function validateImage(file: File): { isValid: boolean; error?: string } {
  const fileTypeLower = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase().trim();

  const isValidMimeType = fileTypeLower
    ? ALLOWED_TYPES.some((type) => fileTypeLower === type.toLowerCase())
    : false;
  const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

  if (!isValidMimeType && !isValidExtension) {
    return { isValid: false, error: 'Invalid file type' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File too large' };
  }
  if (file.size < 100) {
    return { isValid: false, error: 'File too small' };
  }
  return { isValid: true };
}

function buildSearchFilters(
  userScope: { merchantId?: number; outletId?: number },
  categoryId?: number
) {
  const filters: { merchantId?: number; categoryId?: number } = {};
  if (userScope.merchantId) {
    filters.merchantId = userScope.merchantId;
  }
  if (categoryId) {
    filters.categoryId = categoryId;
  }
  return filters;
}

function mapProductForSearch(product: any, similarity: number) {
  const totalRenting = (product.outletStock || []).reduce(
    (sum: number, stock: any) => sum + (stock.renting || 0),
    0
  );
  const available = Math.max(0, (product.totalStock || 0) - totalRenting);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    barcode: product.barcode,
    totalStock: product.totalStock,
    stock: product.totalStock ?? 0,
    renting: totalRenting,
    available,
    rentPrice: product.rentPrice,
    salePrice: product.salePrice,
    costPrice: product.costPrice,
    deposit: product.deposit,
    images: parseProductImages(product.images),
    isActive: product.isActive,
    pricingType: product.pricingType,
    durationConfig: product.durationConfig,
    pricingOptions: product.pricingOptions ?? [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    similarity,
    category: product.category
      ? { id: product.category.id, name: product.category.name }
      : null,
    merchant: product.merchant
      ? { id: product.merchant.id, name: product.merchant.name }
      : null,
    outletStock: (product.outletStock || []).map((stock: any) => ({
      id: stock.id,
      stock: stock.stock,
      available: Math.max(0, (stock.stock || 0) - (stock.renting || 0)),
      renting: stock.renting,
      outlet: stock.outlet
        ? {
            id: stock.outlet.id,
            name: stock.outlet.name,
            address: stock.outlet.address
          }
        : null
    }))
  };
}

export const POST = withPermissions(['products.view'], { requireActiveSubscription: false })(
  async (request: NextRequest, { user, userScope }) => {
    const requestStartTime = Date.now();
    try {
      if (!isSystemLevelUserRole(user.role) && !userScope.merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }

      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      const limitParam = formData.get('limit');
      const minSimilarityParam = formData.get('minSimilarity');
      const categoryIdParam = formData.get('categoryId');

      if (!file) {
        return NextResponse.json(ResponseBuilder.error('NO_IMAGE_FILE'), { status: 400 });
      }

      const validation = validateImage(file);
      if (!validation.isValid) {
        return NextResponse.json(
          ResponseBuilder.error('IMAGE_VALIDATION_FAILED'),
          { status: 400 }
        );
      }

      const limit = limitParam ? parseInt(String(limitParam), 10) : 20;
      const minSimilarity = minSimilarityParam
        ? parseFloat(String(minSimilarityParam))
        : parseFloat(process.env.IMAGE_SEARCH_MIN_SIMILARITY || '0.5');
      const categoryId = categoryIdParam ? parseInt(String(categoryIdParam), 10) : undefined;

      if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(ResponseBuilder.error('INVALID_LIMIT'), { status: 400 });
      }
      if (!Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MIN_SIMILARITY'),
          { status: 400 }
        );
      }

      // merchantId always comes from JWT — never from the client body
      const searchFilters = buildSearchFilters(userScope, categoryId);

      const bytes = await file.arrayBuffer();
      const originalBuffer = Buffer.from(new Uint8Array(bytes));
      const imageHash = await generateImageHash(originalBuffer);

      const cachedResults = getCachedSearchResults(imageHash, searchFilters);
      if (cachedResults) {
        return NextResponse.json(
          ResponseBuilder.success('PRODUCTS_FOUND', {
            products: cachedResults,
            total: cachedResults.length,
            debug: {
              cacheHit: true,
              totalDuration: `${Date.now() - requestStartTime}ms`
            }
          })
        );
      }

      const compressedBuffer = await compressImageForEmbedding(originalBuffer);

      const { getEmbeddingService, getVectorStore } = await import(
        '@rentalshop/database/server'
      );

      let embedding: number[];
      let embedDuration = 0;
      try {
        const embedStart = Date.now();
        embedding = await getEmbeddingService().generateEmbeddingFromBuffer(compressedBuffer);
        embedDuration = Date.now() - embedStart;
      } catch (error: any) {
        const message = error?.message ? String(error.message) : String(error);
        if (error?.name === 'AbortError' || message.toLowerCase().includes('timeout')) {
          return NextResponse.json(ResponseBuilder.error('SEARCH_TIMEOUT'), { status: 503 });
        }
        console.error('❌ Python /embed failed:', message);
        return NextResponse.json(ResponseBuilder.error('SEARCH_FAILED'), { status: 503 });
      }

      const searchStart = Date.now();
      const vectorStore = getVectorStore();
      const hits = await vectorStore.search(embedding, {
        merchantId: searchFilters.merchantId,
        categoryId: searchFilters.categoryId,
        minSimilarity,
        limit: Math.max(limit * 2, 20)
      });
      const searchDuration = Date.now() - searchStart;

      const bestSimilarity = new Map<number, number>();
      const orderedIds: number[] = [];
      for (const hit of hits) {
        const productId = Number(hit.productId);
        if (!Number.isFinite(productId)) continue;
        if (!bestSimilarity.has(productId)) {
          bestSimilarity.set(productId, hit.similarity);
          orderedIds.push(productId);
        }
      }

      const fetchStart = Date.now();
      const rawProducts = await db.products.findByIds(orderedIds);
      const productById = new Map(rawProducts.map((product: any) => [product.id, product]));

      let products = orderedIds
        .map((id) => {
          const product = productById.get(id);
          if (!product || product.isActive === false) return null;
          return mapProductForSearch(product, bestSimilarity.get(id) ?? 0);
        })
        .filter(Boolean) as ReturnType<typeof mapProductForSearch>[];

      if (userScope.outletId) {
        products = products.filter((product) =>
          (product.outletStock || []).some(
            (stock: any) => stock?.outlet?.id === userScope.outletId
          )
        );
      }

      products = products.slice(0, limit);
      const fetchDuration = Date.now() - fetchStart;
      const totalDuration = Date.now() - requestStartTime;

      cacheSearchResults(imageHash, searchFilters, products);

      if (products.length === 0) {
        return NextResponse.json(
          ResponseBuilder.success('NO_PRODUCTS_FOUND', {
            products: [],
            total: 0,
            debug: {
              cacheHit: false,
              embedDuration: `${embedDuration}ms`,
              searchDuration: `${searchDuration}ms`,
              fetchDuration: `${fetchDuration}ms`,
              totalDuration: `${totalDuration}ms`
            }
          })
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('PRODUCTS_FOUND', {
          products,
          total: products.length,
          debug: {
            cacheHit: false,
            embedDuration: `${embedDuration}ms`,
            searchDuration: `${searchDuration}ms`,
            fetchDuration: `${fetchDuration}ms`,
            totalDuration: `${totalDuration}ms`
          }
        })
      );
    } catch (error: any) {
      console.error('❌ Error in image search:', error?.message || error);
      const { response, statusCode } = handleApiError(error);
      if (statusCode >= 500) {
        return NextResponse.json(ResponseBuilder.error('SEARCH_FAILED'), { status: 503 });
      }
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
