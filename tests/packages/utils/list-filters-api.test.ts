/**
 * #789: the client list helpers pass their filters to the API. Before, `getProducts`, `getCustomers` and `getOutlets`
 * took no arguments, so the admin pages that called them with `{ merchantId, isActive, limit }` silently loaded the
 * unfiltered list (every merchant for an admin).
 */
const mockFetch = jest.fn();
jest.mock('../../../packages/utils/src/core', () => ({
  authenticatedFetch: (...args: unknown[]) => mockFetch(...args),
  parseApiResponse: async (r: unknown) => r,
}));

import { productsApi } from '../../../packages/utils/src/api/products';
import { customersApi } from '../../../packages/utils/src/api/customers';
import { outletsApi } from '../../../packages/utils/src/api/outlets';

const calledUrl = () => String(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]);
const params = () => new URL(calledUrl(), 'http://x').searchParams;

beforeEach(() => mockFetch.mockReset().mockResolvedValue({ success: true, data: [] }));

describe.each([
  ['products', () => productsApi.getProducts({ merchantId: 2, isActive: true, limit: 100 }), () => productsApi.getProducts()],
  ['customers', () => customersApi.getCustomers({ merchantId: 2, isActive: true, limit: 50 }), () => customersApi.getCustomers()],
  ['outlets', () => outletsApi.getOutlets({ merchantId: 2, isActive: true, limit: 50 }), () => outletsApi.getOutlets()],
] as const)('%s list helper', (_name, withFilters, withoutFilters) => {
  it('sends merchantId, isActive and limit as query parameters', async () => {
    await withFilters();
    const q = params();
    expect(q.get('merchantId')).toBe('2');
    expect(q.get('isActive')).toBe('true');
    expect(q.get('limit')).toMatch(/^(50|100)$/);
  });

  it('without filters the URL has no query (callers that pass nothing behave as before)', async () => {
    await withoutFilters();
    expect(calledUrl()).not.toContain('?');
  });
});

describe('filters that are not set are not sent', () => {
  it('undefined and null values are dropped, false is kept', async () => {
    await productsApi.getProducts({ merchantId: 2, isActive: false, search: undefined } as any);
    const q = params();
    expect(q.get('merchantId')).toBe('2');
    expect(q.get('isActive')).toBe('false');
    expect(q.has('search')).toBe(false);
  });
});
