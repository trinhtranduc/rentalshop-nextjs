/**
 * #654 — the image-search `/embed` call has its own short timeout
 * (PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS, default 20 s) and the route answers
 * SEARCH_TIMEOUT (503) when it fires. Indexing keeps the long timeout.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
}));

jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) =>
    handler(request, { user: { id: 1, role: 'MERCHANT' }, userScope: { merchantId: 7 } }),
}));

const mockGetVectorStore = jest.fn();
jest.mock('@rentalshop/database', () => ({ db: { products: { findByIds: jest.fn() } } }));
jest.mock('@rentalshop/database/server', () => {
  const { FashionImageEmbedding } = jest.requireActual('../../packages/database/src/ml/image-embeddings');
  const service = new FashionImageEmbedding();
  return { getEmbeddingService: () => service, getVectorStore: () => mockGetVectorStore() };
});
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: {
    error: (code: string) => ({ success: false, code }),
    success: (code: string, data: any) => ({ success: true, code, data }),
  },
  handleApiError: () => ({ response: { success: false }, statusCode: 500 }),
  parseProductImages: () => [],
}));
jest.mock('../../apps/api/lib/image-compression', () => ({
  compressImageForEmbedding: async (buffer: Buffer) => buffer,
}));
jest.mock('../../apps/api/lib/image-search-cache', () => ({
  generateImageHash: async () => 'hash',
  getCachedSearchResults: () => null,
  cacheSearchResults: () => undefined,
}));

import { POST } from '../../apps/api/app/api/products/searchByImage/route';
import {
  FashionImageEmbedding,
  getIndexEmbeddingTimeoutMs,
  getSearchEmbeddingTimeoutMs,
} from '../../packages/database/src/ml/image-embeddings';

const realFetch = global.fetch;

/** fetch that never answers until its signal aborts */
function hangingFetch() {
  return jest.fn((_url: any, init?: any) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  );
}

function searchRequest() {
  const file = {
    name: 'query.jpg',
    type: 'image/jpeg',
    size: 2048,
    arrayBuffer: async () => new ArrayBuffer(2048),
  };
  const form = new Map<string, any>([['image', file]]);
  return { formData: async () => ({ get: (key: string) => form.get(key) ?? null }) };
}

beforeEach(() => {
  delete process.env.PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS;
  delete process.env.PYTHON_EMBEDDING_TIMEOUT;
  delete process.env.QDRANT_COLLECTION_ENV;
  process.env.PYTHON_EMBEDDING_API_URL = 'http://python.test';
  mockGetVectorStore.mockReset();
});

afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('timeouts', () => {
  it('search defaults to 20 s and reads PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS', () => {
    expect(getSearchEmbeddingTimeoutMs()).toBe(20000);
    process.env.PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS = '15000';
    expect(getSearchEmbeddingTimeoutMs()).toBe(15000);
    process.env.PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS = 'abc';
    expect(getSearchEmbeddingTimeoutMs()).toBe(20000);
  });

  it('indexing keeps the long timeout (300 s production, 90 s otherwise)', () => {
    expect(getIndexEmbeddingTimeoutMs()).toBe(90000);
    process.env.QDRANT_COLLECTION_ENV = 'production';
    expect(getIndexEmbeddingTimeoutMs()).toBe(300000);
    process.env.PYTHON_EMBEDDING_TIMEOUT = '120000';
    expect(getIndexEmbeddingTimeoutMs()).toBe(120000);
  });

  it('buffer (search) uses the search timeout; URL (indexing) uses the index timeout', async () => {
    const service = new FashionImageEmbedding();
    const viaPython = jest
      .spyOn(FashionImageEmbedding.prototype as any, 'generateEmbeddingViaPythonApi')
      .mockResolvedValue([1, 0]);
    global.fetch = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })) as any;

    await service.generateEmbeddingFromBuffer(Buffer.alloc(8));
    await service.generateEmbedding('https://cdn.example/a.jpg');

    expect(viaPython.mock.calls[0][1]).toBe(20000);
    expect(viaPython.mock.calls[1][1]).toBe(90000);
  });
});

describe('POST /api/products/searchByImage', () => {
  it('answers 503 SEARCH_TIMEOUT when /embed does not answer within the search timeout', async () => {
    process.env.PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS = '30';
    global.fetch = hangingFetch() as any;

    const started = Date.now();
    const res: any = await (POST as any)(searchRequest(), {});

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ success: false, code: 'SEARCH_TIMEOUT' });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(mockGetVectorStore).not.toHaveBeenCalled();
  });

  it('answers 503 SEARCH_FAILED when /embed fails for another reason', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })) as any;

    const res: any = await (POST as any)(searchRequest(), {});

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ success: false, code: 'SEARCH_FAILED' });
  });
});
