'use client';

/**
 * #1627 the product list keeps its filters and page when you come back from a product page. The list saves its query
 * for this tab; the ways back (detail "← Sản phẩm", add form, the "Sản phẩm" crumb) read it.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LIST_RETURN_KEY, productsListHref } from './list-model';

/** The list page: save its query string ('' at the plain list) for this tab */
export function rememberProductsListQuery(query: string): void {
  try {
    window.sessionStorage.setItem(LIST_RETURN_KEY, query);
  } catch {
    // Storage blocked: the ways back open the plain list.
  }
}

/** `/products` with this tab's last filters and page; `/products` on the first render and when nothing is saved */
export function useProductsListHref(): string {
  const pathname = usePathname();
  const [href, setHref] = useState('/products');
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(LIST_RETURN_KEY);
    } catch {
      saved = null;
    }
    setHref(productsListHref(saved));
  }, [pathname]);
  return href;
}
