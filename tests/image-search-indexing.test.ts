/**
 * #654 — every product image is indexed with a deterministic point id,
 * re-indexing replaces a product's points, no images → points deleted,
 * and search returns each product once with its best score.
 */
const mockQdrantSearch = jest.fn();
jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({ search: mockQdrantSearch })),
}));

const mockStore = {
  initialize: jest.fn(async () => undefined),
  deleteProductEmbeddings: jest.fn(async () => undefined),
  storeProductImagesEmbeddings: jest.fn(async () => undefined),
  getCollectionInfo: jest.fn(async () => ({ points_count: 0 })),
};
jest.mock('../packages/database/src/ml/vector-store', () => ({
  ...jest.requireActual('../packages/database/src/ml/vector-store'),
  getVectorStore: () => mockStore,
}));

const mockEmbedding = {
  generateEmbeddingsFromS3Keys: jest.fn(),
  generateEmbedding: jest.fn(),
};
jest.mock('../packages/database/src/ml/image-embeddings', () => ({
  getEmbeddingService: () => mockEmbedding,
}));

const mockDb = { products: { findById: jest.fn(), update: jest.fn(async () => ({})), search: jest.fn() } };
jest.mock('../packages/database/src/index', () => ({ db: mockDb }));

jest.mock('@rentalshop/utils', () => ({
  parseProductImages: (images: any) => (Array.isArray(images) ? images : []),
  extractKeyFromImageUrl: (url: string) =>
    url.startsWith('https://s3.example/') ? url.replace('https://s3.example/', '') : null,
}));

import {
  ProductVectorStore,
  groupHitsByProduct,
  productImagePointId,
  uuidV5,
} from '../packages/database/src/ml/vector-store';
import {
  generateAllProductEmbeddings,
  generateProductEmbedding,
} from '../packages/database/src/jobs/generate-product-embeddings';

const vec = (seed: number) => Array.from({ length: 4 }, (_, i) => seed + i);

function product(id: number, images: string[]) {
  return { id, name: `Váy ${id}`, merchantId: 7, categoryId: 3, images };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PYTHON_EMBEDDING_API_URL = 'http://python-embedding.railway.internal:8000';
  process.env.QDRANT_COLLECTION_ENV = 'development';
});

describe('deterministic point ids', () => {
  it('uuidV5 matches the RFC 4122 test vector', () => {
    // uuid v5 of "www.example.com" in the DNS namespace
    expect(uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    );
  });

  it('same product + image index gives the same id; other index or product gives another', () => {
    const a = productImagePointId(42, 0);
    expect(productImagePointId(42, 0)).toBe(a);
    expect(productImagePointId('42', 0)).toBe(a);
    expect(productImagePointId(42, 1)).not.toBe(a);
    expect(productImagePointId(43, 0)).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('groupHitsByProduct', () => {
  it('keeps one hit per product with its best score, best first', () => {
    const grouped = groupHitsByProduct([
      { productId: '1', similarity: 0.71, metadata: { imageUrl: 'a1' } },
      { productId: '2', similarity: 0.9, metadata: { imageUrl: 'b1' } },
      { productId: '1', similarity: 0.95, metadata: { imageUrl: 'a2' } },
      { productId: '2', similarity: 0.6, metadata: { imageUrl: 'b2' } },
      { productId: '', similarity: 0.99, metadata: {} },
    ]);
    expect(grouped.map((h) => [h.productId, h.similarity, h.metadata.imageUrl])).toEqual([
      ['1', 0.95, 'a2'],
      ['2', 0.9, 'b1'],
    ]);
  });

  it('ProductVectorStore.search returns each product once and cuts to limit after grouping', async () => {
    mockQdrantSearch.mockResolvedValue([
      { score: 0.95, payload: { productId: '1' } },
      { score: 0.93, payload: { productId: '1' } },
      { score: 0.92, payload: { productId: '1' } },
      { score: 0.9, payload: { productId: '2' } },
      { score: 0.8, payload: { productId: '3' } },
    ]);
    const store = new ProductVectorStore();
    const hits = await store.search(vec(1), { merchantId: 7, minSimilarity: 0.5, limit: 2 });
    expect(hits.map((h) => h.productId)).toEqual(['1', '2']);
    // asks Qdrant for more points than products wanted (several images per product)
    expect(mockQdrantSearch.mock.calls[0][1].limit).toBeGreaterThanOrEqual(8);
    expect(mockQdrantSearch.mock.calls[0][1].filter).toEqual({
      must: [{ key: 'merchantId', match: { value: '7' } }],
    });
  });
});

describe('generateProductEmbedding indexes every image', () => {
  it('embeds all images (S3 and plain URL) with ids from product + image index, deleting old points first', async () => {
    mockDb.products.findById.mockResolvedValue(
      product(42, ['https://s3.example/p/a.jpg', 'https://cdn.other/b.jpg', 'https://s3.example/p/c.jpg']),
    );
    mockEmbedding.generateEmbeddingsFromS3Keys.mockResolvedValue([vec(1), vec(3)]);
    mockEmbedding.generateEmbedding.mockResolvedValue(vec(2));

    await generateProductEmbedding(42, { force: true });

    expect(mockEmbedding.generateEmbeddingsFromS3Keys.mock.calls[0][0]).toEqual(['p/a.jpg', 'p/c.jpg']);
    expect(mockStore.deleteProductEmbeddings).toHaveBeenCalledWith(42);
    const deleteOrder = mockStore.deleteProductEmbeddings.mock.invocationCallOrder[0];
    const storeOrder = mockStore.storeProductImagesEmbeddings.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(storeOrder);

    const points = (mockStore.storeProductImagesEmbeddings.mock.calls[0] as any)[0];
    const byUrl = Object.fromEntries(points.map((p: any) => [p.metadata.imageUrl, p.imageId]));
    expect(byUrl).toEqual({
      'https://s3.example/p/a.jpg': productImagePointId(42, 0),
      'https://cdn.other/b.jpg': productImagePointId(42, 1),
      'https://s3.example/p/c.jpg': productImagePointId(42, 2),
    });
    expect(points.every((p: any) => p.metadata.productId === '42' && p.metadata.merchantId === '7')).toBe(true);
  });

  it('re-indexing the same product reuses the same point ids', async () => {
    mockDb.products.findById.mockResolvedValue(product(42, ['https://cdn.other/a.jpg', 'https://cdn.other/b.jpg']));
    mockEmbedding.generateEmbedding.mockResolvedValue(vec(1));

    await generateProductEmbedding(42, { force: true });
    await generateProductEmbedding(42, { force: true });

    const ids = mockStore.storeProductImagesEmbeddings.mock.calls.map((call: any) =>
      call[0].map((p: any) => p.imageId).sort(),
    );
    expect(ids[0]).toEqual(ids[1]);
    expect(ids[0]).toEqual([productImagePointId(42, 0), productImagePointId(42, 1)].sort());
  });

  it('deletes the product points when it has no images left', async () => {
    mockDb.products.findById.mockResolvedValue(product(42, []));

    await generateProductEmbedding(42, { force: true });

    expect(mockStore.deleteProductEmbeddings).toHaveBeenCalledWith(42);
    expect(mockStore.storeProductImagesEmbeddings).not.toHaveBeenCalled();
    expect(mockEmbedding.generateEmbedding).not.toHaveBeenCalled();
  });

  it('keeps old points and fails (so the job retries) when no vector could be made', async () => {
    mockDb.products.findById.mockResolvedValue(product(42, ['https://cdn.other/a.jpg']));
    mockEmbedding.generateEmbedding.mockRejectedValue(new Error('python down'));

    await expect(generateProductEmbedding(42, { force: true })).rejects.toThrow(/No embedding/);
    expect(mockStore.deleteProductEmbeddings).not.toHaveBeenCalled();
    expect(mockStore.storeProductImagesEmbeddings).not.toHaveBeenCalled();
  });
});

describe('generateAllProductEmbeddings (backfill)', () => {
  it('uses the same per-product path: all images, deterministic ids, no-image products cleaned', async () => {
    const products = {
      10: product(10, ['https://cdn.other/x.jpg', 'https://cdn.other/y.jpg']),
      11: product(11, []),
    } as Record<number, any>;
    mockDb.products.search.mockResolvedValue({ data: Object.values(products) });
    mockDb.products.findById.mockImplementation(async (id: number) => products[id]);
    mockEmbedding.generateEmbedding.mockResolvedValue(vec(5));

    await generateAllProductEmbeddings({ batchSize: 5, delayBetweenBatches: 0, maxRetries: 0 });

    expect(mockStore.storeProductImagesEmbeddings).toHaveBeenCalledTimes(1);
    const ids = (mockStore.storeProductImagesEmbeddings.mock.calls[0] as any)[0].map((p: any) => p.imageId).sort();
    expect(ids).toEqual([productImagePointId(10, 0), productImagePointId(10, 1)].sort());
    expect(mockStore.deleteProductEmbeddings).toHaveBeenCalledWith(10);
    expect(mockStore.deleteProductEmbeddings).toHaveBeenCalledWith(11);
  });
});
