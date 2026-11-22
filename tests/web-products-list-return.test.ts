/**
 * #1627 Sản phẩm (web): back to the list keeps its filters and page. The list saves its query per tab; every way back
 * from the product pages (detail "← Sản phẩm", delete, add form, the "Sản phẩm" crumb) opens `productsListHref(saved)`.
 * Spec .agent/changes/1627-portal-products-return-language (1-2).
 */
import { describe, expect, it } from '@jest/globals';
import { LIST_RETURN_KEY, productsListHref } from '../apps/client/app/products/list/list-model';

describe('#1627 productsListHref', () => {
  it('nothing saved, or the plain list: /products', () => {
    expect(productsListHref(null)).toBe('/products');
    expect(productsListHref(undefined)).toBe('/products');
    expect(productsListHref('')).toBe('/products');
  });

  it('the saved filters and page come back as they were', () => {
    expect(productsListHref('sort=priceDesc&page=2')).toBe('/products?sort=priceDesc&page=2');
    expect(productsListHref('q=v%C3%A1y+c%C6%B0%E1%BB%9Bi&category=3%2C7&outlet=2&limit=50')).toBe(
      '/products?q=v%C3%A1y+c%C6%B0%E1%BB%9Bi&category=3%2C7&outlet=2&limit=50',
    );
    expect(productsListHref('?page=3')).toBe('/products?page=3');
  });

  it('only the list keys are kept', () => {
    expect(productsListHref('page=2&next=https%3A%2F%2Fevil.example&foo=1')).toBe('/products?page=2');
    expect(productsListHref('foo=1')).toBe('/products');
  });

  it('has a key of its own', () => {
    expect(LIST_RETURN_KEY).toMatch(/products/);
  });
});
