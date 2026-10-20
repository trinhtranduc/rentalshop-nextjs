/**
 * #1128 — public shop page "Tìm bằng ảnh": pure helpers (the panel component is thin).
 */
import { describe, expect, it } from '@jest/globals';
import {
  IMAGE_SEARCH_MAX_EDGE,
  canSearchByImage,
  checkPickedImage,
  downscaleSize,
  imageSearchErrorKey,
  imageSearchView,
  similarityPercent,
} from '../apps/client/app/[tenantKey]/products/lib/image-search';

describe('when the page offers search by image', () => {
  it('only with the shop flag and a tenant key', () => {
    expect(canSearchByImage({ tenantKey: 'shop', imageSearchAvailable: true })).toBe(true);
    expect(canSearchByImage({ tenantKey: 'shop', imageSearchAvailable: false })).toBe(false);
    expect(canSearchByImage({ tenantKey: 'shop' })).toBe(false);
    expect(canSearchByImage({ imageSearchAvailable: true })).toBe(false);
  });
});

describe('picked file', () => {
  it('accepts jpeg / png / webp / heic up to 15 MB before downscaling, rejects the rest', () => {
    expect(checkPickedImage({ type: 'image/jpeg', size: 3_000_000 })).toBeNull();
    expect(checkPickedImage({ type: 'image/heic', size: 3_000_000 })).toBeNull();
    expect(checkPickedImage({ type: 'application/pdf', size: 1000 })).toBe('invalidImage');
    expect(checkPickedImage({ type: 'image/png', size: 16 * 1024 * 1024 })).toBe('tooLarge');
  });
});

describe('downscale before upload', () => {
  it('the long edge becomes 1024 px, the ratio is kept; small photos stay as they are', () => {
    expect(IMAGE_SEARCH_MAX_EDGE).toBe(1024);
    expect(downscaleSize(4032, 3024)).toEqual({ width: 1024, height: 768 });
    expect(downscaleSize(3000, 4000)).toEqual({ width: 768, height: 1024 });
    expect(downscaleSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('results', () => {
  it('similarity as a whole percent', () => {
    expect(similarityPercent(0.964)).toBe(96);
    expect(similarityPercent(1.2)).toBe(100);
    expect(similarityPercent(-1)).toBe(0);
  });

  it('view state from the API answer', () => {
    expect(imageSearchView(null)).toEqual({ kind: 'idle' });
    expect(imageSearchView({ success: true, status: 200, code: 'PRODUCTS_FOUND', data: { products: [{ id: 1 }], total: 1 } as any })).toMatchObject({ kind: 'results' });
    expect(imageSearchView({ success: true, status: 200, code: 'NO_PRODUCTS_FOUND', data: { products: [], total: 0 } as any })).toEqual({ kind: 'empty' });
    expect(imageSearchView({ success: false, status: 429, code: 'IMAGE_SEARCH_RATE_LIMITED' })).toEqual({ kind: 'error', messageKey: 'errorRateLimited' });
  });

  it('error messages are friendly, never the raw code', () => {
    expect(imageSearchErrorKey('IMAGE_SEARCH_RATE_LIMITED')).toBe('errorRateLimited');
    expect(imageSearchErrorKey('SEARCH_TIMEOUT')).toBe('errorBusy');
    expect(imageSearchErrorKey('SEARCH_FAILED')).toBe('errorBusy');
    expect(imageSearchErrorKey('IMAGE_VALIDATION_FAILED')).toBe('invalidImage');
    expect(imageSearchErrorKey('NETWORK_ERROR')).toBe('errorNetwork');
    expect(imageSearchErrorKey('WHATEVER')).toBe('errorGeneric');
  });
});
