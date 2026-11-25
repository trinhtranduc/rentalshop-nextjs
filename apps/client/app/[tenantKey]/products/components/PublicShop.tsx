'use client';

import React, { useCallback, useState } from 'react';
import type { Category, Product } from '@rentalshop/types';
import { MerchantHeader, type PublicOutlet } from './MerchantHeader';
import { PublicProductGrid } from './PublicProductGrid';
import { orderOutlets, outletSearch, pickOutlet } from '../lib/outlet-picker';

type GridProps = React.ComponentProps<typeof PublicProductGrid>;

interface PublicShopProps {
  merchant: React.ComponentProps<typeof MerchantHeader>['merchant'] & { currency?: string | null };
  outlets: PublicOutlet[];
  /** `?outlet=` read by the server page (#1643) */
  initialOutletId: number | null;
  grid: Omit<GridProps, 'phone' | 'outlets'>;
}

/**
 * #1643: the branch the visitor picked drives the header (name, address, phone, links) and the phone the product sheet
 * calls. The choice lives in the URL (`?outlet=`) through `history.replaceState`, so the product list is not reloaded.
 */
export function PublicShop({ merchant, outlets, initialOutletId, grid }: PublicShopProps) {
  const ordered = orderOutlets(outlets);
  const [selectedId, setSelectedId] = useState<number | null>(pickOutlet(ordered, initialOutletId)?.id ?? null);
  const selected = pickOutlet(ordered, selectedId);

  const onSelect = useCallback((outlet: PublicOutlet) => {
    setSelectedId(outlet.id);
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${outletSearch(window.location.search, outlet)}${window.location.hash}`);
    } catch {
      /* the picker still works without the URL */
    }
  }, []);

  const phone = selected?.phone || merchant.phone || null;

  return (
    <>
      <MerchantHeader merchant={merchant} outlets={ordered} selected={selected} onSelect={onSelect} />
      <PublicProductGrid {...grid} phone={phone} outlets={outlets as GridProps['outlets']} />
    </>
  );
}

export type { Category, Product };
