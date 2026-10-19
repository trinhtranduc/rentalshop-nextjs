/**
 * #1095 — which image-search model and Qdrant collection are in use, for the admin monitor's model line.
 * The collection follows the vector store's rule; python /health gives the model; a down service is not an error.
 */
import { getImageSearchModelInfo, resolveCollectionName } from '../../apps/api/lib/image-search-model';

describe('resolveCollectionName (same rule as packages/database/src/ml/vector-store.ts)', () => {
  it.each([
    ['product-images-pro-fashion', 'product-images-pro-fashion'],
    ['product_images_dev_fashion', 'product-images-dev-fashion'],
    ['production', 'product-images-pro'],
    ['prod', 'product-images-pro'],
    ['development', 'product-images-dev'],
  ])('%s → %s', (env, name) => expect(resolveCollectionName(env)).toBe(name));

  it('unset → null', () => expect(resolveCollectionName(undefined)).toBeNull());
});

describe('getImageSearchModelInfo', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('reads model and repo from python /health', async () => {
    process.env.PYTHON_EMBEDDING_API_URL = 'python.internal:8080';
    process.env.QDRANT_COLLECTION_ENV = 'product-images-pro-fashion';
    const fetchFn = jest.fn(async () => ({ ok: true, json: async () => ({ model: 'marqo-fashionclip', hf_repo: 'Marqo/marqo-fashionCLIP' }) }));
    const info = await getImageSearchModelInfo(fetchFn as any);
    expect(fetchFn).toHaveBeenCalledWith('https://python.internal:8080/health', expect.objectContaining({ signal: expect.anything() }));
    expect(info).toEqual({ name: 'marqo-fashionclip', hfRepo: 'Marqo/marqo-fashionCLIP', collection: 'product-images-pro-fashion', reachable: true });
  });

  it('a service that does not answer gives reachable false, not an error', async () => {
    process.env.PYTHON_EMBEDDING_API_URL = 'http://python.internal:8080/';
    process.env.QDRANT_COLLECTION_ENV = 'production';
    const fetchFn = jest.fn(async () => {
      throw new Error('timeout');
    });
    expect(await getImageSearchModelInfo(fetchFn as any)).toEqual({
      name: null,
      hfRepo: null,
      collection: 'product-images-pro',
      reachable: false,
    });
  });

  it('an old python service without `model` means the default CLIP model', async () => {
    process.env.PYTHON_EMBEDDING_API_URL = 'http://python.internal:8080';
    const fetchFn = jest.fn(async () => ({ ok: true, json: async () => ({ status: 'healthy' }) }));
    expect((await getImageSearchModelInfo(fetchFn as any)).name).toBe('openai');
  });
});
