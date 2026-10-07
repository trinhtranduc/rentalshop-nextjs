/**
 * #567 phase 1 — `shopTimeZone(userScope, request)` (not wired into routes yet), the payload field helper and
 * the lenient register helper in apps/api/lib/shop-timezone.ts.
 */
import {
  shopTimeZone,
  merchantTimeZoneField,
  registerTimeZone,
  DEFAULT_SHOP_TIMEZONE,
  type ShopTimeZoneClient,
} from '../../apps/api/lib/shop-timezone';

const clientWith = (row: { timezone?: string | null } | null): ShopTimeZoneClient & { merchant: { findUnique: jest.Mock } } => ({
  merchant: { findUnique: jest.fn(async () => row) },
});
const req = (url = 'http://localhost/api/analytics/today-metrics'): any => ({ url, headers: { get: () => null } });

describe('shopTimeZone (#567)', () => {
  it('a shop user gets the shop zone from Merchant.timezone', async () => {
    const client = clientWith({ timezone: 'Asia/Tokyo' });
    await expect(shopTimeZone({ merchantId: 2 }, req(), client)).resolves.toBe('Asia/Tokyo');
    expect(client.merchant.findUnique).toHaveBeenCalledWith({ where: { id: 2 }, select: { timezone: true } });
  });

  it('a shop user: a client-sent timeZone param is ignored (the shop zone wins)', async () => {
    const client = clientWith({ timezone: 'Asia/Tokyo' });
    await expect(shopTimeZone({ merchantId: 2 }, req('http://x/api/a?timeZone=America/New_York'), client)).resolves.toBe('Asia/Tokyo');
    const vn = clientWith({ timezone: 'Asia/Ho_Chi_Minh' });
    await expect(shopTimeZone({ merchantId: 2 }, req('http://x/api/a?timeZone=UTC'), vn)).resolves.toBe('Asia/Ho_Chi_Minh');
  });

  it.each([
    ['no row', null],
    ['null column', { timezone: null }],
    ['invalid stored value', { timezone: 'Mars/Base' }],
    ['empty stored value', { timezone: '' }],
  ])('%s → Asia/Ho_Chi_Minh', async (_label, row) => {
    await expect(shopTimeZone({ merchantId: 9 }, req(), clientWith(row as any))).resolves.toBe('Asia/Ho_Chi_Minh');
  });

  it('one DB read per request, however many helpers ask', async () => {
    const client = clientWith({ timezone: 'Australia/Sydney' });
    const request = req();
    const scope = { merchantId: 2 };
    const answers = await Promise.all([
      shopTimeZone(scope, request, client),
      shopTimeZone(scope, request, client),
      shopTimeZone(scope, request, client),
    ]);
    expect(answers).toEqual(['Australia/Sydney', 'Australia/Sydney', 'Australia/Sydney']);
    await shopTimeZone(scope, request, client);
    expect(client.merchant.findUnique).toHaveBeenCalledTimes(1);

    // a new request reads again
    await shopTimeZone(scope, req(), client);
    expect(client.merchant.findUnique).toHaveBeenCalledTimes(2);
  });

  it('without a request the answer is cached on the scope object', async () => {
    const client = clientWith({ timezone: 'Asia/Tokyo' });
    const scope = { merchantId: 3 };
    await shopTimeZone(scope, undefined, client);
    await shopTimeZone(scope, undefined, client);
    expect(client.merchant.findUnique).toHaveBeenCalledTimes(1);
  });

  it('a failed read is not cached', async () => {
    const client = clientWith({ timezone: 'Asia/Tokyo' });
    client.merchant.findUnique.mockRejectedValueOnce(new Error('db down'));
    const request = req();
    await expect(shopTimeZone({ merchantId: 2 }, request, client)).rejects.toThrow('db down');
    await expect(shopTimeZone({ merchantId: 2 }, request, client)).resolves.toBe('Asia/Tokyo');
  });

  describe('ADMIN / OPS without a shop', () => {
    it.each([
      ['a valid timeZone param', 'http://x/api/a?timeZone=America/New_York', 'America/New_York'],
      ['UTC', 'http://x/api/a?timeZone=UTC', 'UTC'],
      ['an invalid param', 'http://x/api/a?timeZone=Mars/Base', 'Asia/Ho_Chi_Minh'],
      ['an empty param', 'http://x/api/a?timeZone=', 'Asia/Ho_Chi_Minh'],
      ['no param', 'http://x/api/a', 'Asia/Ho_Chi_Minh'],
    ])('%s → %s', async (_label, url, expected) => {
      const client = clientWith({ timezone: 'Asia/Tokyo' });
      await expect(shopTimeZone({}, req(url), client)).resolves.toBe(expected);
      await expect(shopTimeZone({ merchantId: null }, req(url), client)).resolves.toBe(expected);
      expect(client.merchant.findUnique).not.toHaveBeenCalled();
    });

    it('reads NextRequest.nextUrl when present', async () => {
      const request: any = { nextUrl: { searchParams: new URLSearchParams('timeZone=Asia/Tokyo') }, headers: { get: () => null } };
      await expect(shopTimeZone({}, request, clientWith(null))).resolves.toBe('Asia/Tokyo');
    });

    it('no request → Vietnam', async () => {
      await expect(shopTimeZone({}, undefined, clientWith(null))).resolves.toBe(DEFAULT_SHOP_TIMEZONE);
    });
  });
});

describe('merchantTimeZoneField (#567 payloads)', () => {
  it('a row with the column yields { timezone }', () => {
    expect(merchantTimeZoneField({ id: 1, timezone: 'Asia/Tokyo' })).toEqual({ timezone: 'Asia/Tokyo' });
    expect(merchantTimeZoneField({ id: 1, timezone: 'Asia/Ho_Chi_Minh' })).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
  });

  it('an invalid stored value reads as Vietnam', () => {
    expect(merchantTimeZoneField({ timezone: 'Mars/Base' })).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
    expect(merchantTimeZoneField({ timezone: null })).toEqual({ timezone: 'Asia/Ho_Chi_Minh' });
  });

  it('a row without the column adds nothing (clients read missing as Vietnam)', () => {
    expect(merchantTimeZoneField({ id: 1 })).toEqual({});
    expect(merchantTimeZoneField({ timezone: undefined })).toEqual({});
    expect(merchantTimeZoneField(null)).toEqual({});
    expect(merchantTimeZoneField(undefined)).toEqual({});
  });
});

describe('registerTimeZone (#567 register is lenient)', () => {
  it.each([
    [{ timezone: 'Asia/Tokyo' }, 'Asia/Tokyo'],
    [{ timezone: 'America/New_York' }, 'America/New_York'],
    [{ timezone: ' Australia/Sydney ' }, 'Australia/Sydney'],
    [{ timezone: 'Asia/Ho_Chi_Minh' }, 'Asia/Ho_Chi_Minh'],
    [{}, 'Asia/Ho_Chi_Minh'],
    [{ timezone: null }, 'Asia/Ho_Chi_Minh'],
    [{ timezone: '' }, 'Asia/Ho_Chi_Minh'],
    [{ timezone: 'Mars/Base' }, 'Asia/Ho_Chi_Minh'],
    [{ timezone: 7 }, 'Asia/Ho_Chi_Minh'],
    [null, 'Asia/Ho_Chi_Minh'],
    ['oops', 'Asia/Ho_Chi_Minh'],
  ])('%p → %s', (body, expected) => {
    expect(registerTimeZone(body)).toBe(expected);
  });
});
