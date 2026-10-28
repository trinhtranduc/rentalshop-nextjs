/**
 * #1215 an installed Android turns `"salePrice": null` into NaN (ApiClient.kt:1431) and then crashes in
 * CartStore.kt:815 ("Forbidden numeric value: NaN"). Android without a capability gets 0; iOS, web and capable
 * clients keep null.
 */
import { productForClient } from '../../apps/api/lib/block-pricing-legacy';
import { salePriceForClient } from '../../apps/api/lib/legacy-sale-price';

const req = (headers: Record<string, string> = {}) => ({
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});
const android = req({ 'x-client-platform': 'mobile', 'x-device-type': 'android' });
const product = { id: 5, name: 'Ao dai', rentPrice: 100000, salePrice: null as number | null, pricingOptions: [{ id: 1, type: 'FIXED', price: 100000, isDefault: true }] };

describe('productForClient: salePrice null (#1215)', () => {
  it('old Android (X-Device-Type: android, no capability) gets 0', () => {
    expect(productForClient(product, android).salePrice).toBe(0);
  });
  it('old Android before #343 (okhttp User-Agent only) gets 0', () => {
    expect(productForClient(product, req({ 'user-agent': 'okhttp/4.12.0' })).salePrice).toBe(0);
  });
  it('old iOS keeps null (0 would fill "0" in the edit form)', () => {
    const ios = req({ 'x-client-platform': 'mobile', 'x-device-type': 'ios', 'user-agent': 'AnyRent-iOS/1.0.0' });
    expect(productForClient(product, ios).salePrice).toBeNull();
  });
  it('web and a header-less caller keep null', () => {
    expect(productForClient(product, req({ 'x-client-platform': 'web' })).salePrice).toBeNull();
    expect(productForClient(product, req()).salePrice).toBeNull();
  });
  it('Android that declares a capability keeps null', () => {
    expect(productForClient(product, req({ 'x-device-type': 'android', 'x-client-capabilities': 'block-pricing' })).salePrice).toBeNull();
  });
  it('a real sale price and 0 are untouched; every other field is identical', () => {
    expect(productForClient({ ...product, salePrice: 70000 }, android).salePrice).toBe(70000);
    expect(productForClient({ ...product, salePrice: 0 }, android).salePrice).toBe(0);
    expect({ ...productForClient(product, android), salePrice: null }).toEqual(product);
  });
});

describe('salePriceForClient', () => {
  it('undefined stays undefined (field not selected)', () => {
    expect(salePriceForClient(undefined, android)).toBeUndefined();
  });
  it('null -> 0 only for old Android', () => {
    expect(salePriceForClient(null, android)).toBe(0);
    expect(salePriceForClient(null, req())).toBeNull();
  });
});
