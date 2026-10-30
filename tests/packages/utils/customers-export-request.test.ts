/**
 * #1361: exporting many selected customers failed with ERR_FAILED because `exportCustomers` put one
 * `customerIds=<id>` in the URL per customer (3,000 customers = ~60 KB). The ids now travel in a JSON body
 * (`POST /api/customers/export`), so the URL length does not depend on how many customers are selected.
 * Without a selection (export by period) the request is the same `GET` as before.
 */
const mockFetch = jest.fn();
jest.mock('../../../packages/utils/src/core', () => ({
  authenticatedFetch: (...args: unknown[]) => mockFetch(...args),
  parseApiResponse: async (r: unknown) => r,
}));

import { customersApi } from '../../../packages/utils/src/api/customers';
import { apiUrls } from '../../../packages/utils/src/config/api';

const FILE = new Blob(['xlsx']);
const ids = (n: number) => Array.from({ length: n }, (_, i) => 96899 + i);

beforeEach(() => mockFetch.mockReset().mockResolvedValue({ ok: true, blob: async () => FILE }));

describe('exportCustomers with a selection', () => {
  it.each([5, 300, 3000])('%i selected customers: POST with the ids in a JSON body, the URL stays short', async (n) => {
    const blob = await customersApi.exportCustomers({ format: 'excel', customerIds: ids(n) });
    expect(blob).toBe(FILE);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toBe(apiUrls.customers.export);
    expect(String(url)).not.toContain('customerIds');
    expect(String(url).length).toBeLessThan(200);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ customerIds: ids(n), format: 'excel' });
  });

  it('URL length is the same for 5 and 3,000 customers', async () => {
    await customersApi.exportCustomers({ format: 'excel', customerIds: ids(5), merchantId: 140 });
    await customersApi.exportCustomers({ format: 'excel', customerIds: ids(3000), merchantId: 140 });
    expect(String(mockFetch.mock.calls[0][0]).length).toBe(String(mockFetch.mock.calls[1][0]).length);
  });

  it('keeps period, dates and merchantId in the body', async () => {
    await customersApi.exportCustomers({ format: 'excel', customerIds: [1], period: 'custom', startDate: '2026-10-01', endDate: '2026-10-20', merchantId: 140 });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      customerIds: [1], format: 'excel', period: 'custom', startDate: '2026-10-01', endDate: '2026-10-20', merchantId: 140,
    });
  });

  it('a failed response throws, so the page shows exportFailed', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(customersApi.exportCustomers({ format: 'excel', customerIds: ids(3) })).rejects.toThrow('Failed to export customers');
  });
});

describe('exportCustomers without a selection (by period)', () => {
  it('is still the GET with the period in the query', async () => {
    await customersApi.exportCustomers({ format: 'excel', period: '1month' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toBe(`${apiUrls.customers.export}?period=1month&format=excel`);
    expect(init?.method).toBeUndefined();
  });

  it('an empty selection is a period export', async () => {
    await customersApi.exportCustomers({ format: 'excel', period: '3months', customerIds: [] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toBe(`${apiUrls.customers.export}?period=3months&format=excel`);
    expect(init?.method).toBeUndefined();
  });
});
