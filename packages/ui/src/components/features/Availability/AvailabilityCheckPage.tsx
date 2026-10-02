'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PageWrapper,
  Breadcrumb,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentalshop/ui';
import type { BreadcrumbItem, DateRange } from '@rentalshop/ui';
import { useAvailabilityTranslations, useCommonTranslations } from '@rentalshop/hooks';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';
import { AvailabilityPeriodBar, keyToPickerDate, pickerDateToKey } from './AvailabilityPeriodBar';
import { AvailabilityProductList } from './AvailabilityProductList';
import { AvailabilityDetail } from './AvailabilityDetail';
import { loadProductById } from './useAvailabilityCheck';
import { useAvailabilityResults } from './useAvailabilityResults';
import { needsOutletSelection } from './utils';
import { addDaysToKey, toActiveOrders } from './availability-days';
import type { RawOrder } from './availability-days';
import type { AvailabilityCheckPageProps, SelectedProduct, ActiveOrder } from './types';
import { ordersApi } from '@rentalshop/utils';

const MAX_PRODUCTS = 20;

export const AvailabilityCheckPage: React.FC<AvailabilityCheckPageProps> = ({
  user,
  outlets,
  currency = 'USD',
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useAvailabilityTranslations();
  const tc = useCommonTranslations();

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [activeProductId, setActiveProductId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const p = searchParams.get('pickup');
    const r = searchParams.get('return');
    return {
      from: p ? new Date(p) : undefined,
      to: r ? new Date(r) : undefined,
    };
  });
  // Raw active orders per product; conflict flags are derived from the period, so changing
  // dates does not refetch (the page used to fetch every product's orders twice)
  const [productOrders, setProductOrders] = useState<Map<number, RawOrder[]>>(new Map());

  const pickup = pickerDateToKey(dateRange.from);
  const returnDate = pickerDateToKey(dateRange.to);

  const userOutletId = user?.outletId;
  const showOutletSelect = needsOutletSelection(user?.role, userOutletId);
  const [outletId, setOutletId] = useState<number | undefined>(() => {
    const fromUrl = searchParams.get('outletId');
    if (fromUrl) return parseInt(fromUrl, 10);
    if (userOutletId) return userOutletId;
    return outlets[0]?.id;
  });
  const resolvedOutletId = showOutletSelect ? outletId : userOutletId ?? outletId;
  const dateError = Boolean(pickup && returnDate && pickup > returnDate);
  const panelDisabled = showOutletSelect && !resolvedOutletId;

  const activeSelection = useMemo(
    () => selectedProducts.find((sp) => sp.product.id === activeProductId),
    [selectedProducts, activeProductId]
  );

  // Products whose orders were requested for the current outlet (one request per product)
  const requestedRef = useRef<Set<string>>(new Set());

  const fetchOrdersForProduct = useCallback(
    async (productId: number) => {
      if (!resolvedOutletId) return;
      const key = `${resolvedOutletId}:${productId}`;
      if (requestedRef.current.has(key)) return;
      requestedRef.current.add(key);
      try {
        const response = await ordersApi.searchOrders({
          productId,
          outletId: resolvedOutletId,
          limit: 50,
          sortBy: 'pickupPlanAt',
          sortOrder: 'asc',
        });
        if (response.success && response.data?.orders) {
          // Filter to only active orders (RESERVED + PICKUPED) client-side
          const activeOnly = (response.data.orders as RawOrder[]).filter(
            (o) => o.status === 'RESERVED' || o.status === 'PICKUPED'
          );
          setProductOrders((prev) => new Map(prev).set(productId, activeOnly));
        }
      } catch (err) {
        requestedRef.current.delete(key);
        console.error('Failed to fetch orders for product:', productId, err);
      }
    },
    [resolvedOutletId]
  );

  const handleAddProduct = useCallback(
    (product: ProductWithStock) => {
      if (selectedProducts.length >= MAX_PRODUCTS) return;
      if (selectedProducts.some((sp) => sp.product.id === product.id)) {
        setActiveProductId(product.id);
        return;
      }
      setSelectedProducts((prev) => [...prev, { product, quantity: 1 }]);
      setActiveProductId(product.id);
    },
    [selectedProducts]
  );

  const handleRemoveProduct = useCallback(
    (productId: number) => {
      setSelectedProducts((prev) => {
        const next = prev.filter((sp) => sp.product.id !== productId);
        setActiveProductId((current) => {
          if (current !== productId) return current;
          return next[0]?.product.id;
        });
        return next;
      });
      setProductOrders((prev) => {
        const next = new Map(prev);
        next.delete(productId);
        return next;
      });
      requestedRef.current.forEach((key) => {
        if (key.endsWith(`:${productId}`)) requestedRef.current.delete(key);
      });
    },
    []
  );

  const handleQuantityChange = useCallback((productId: number, qty: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp) =>
        sp.product.id === productId ? { ...sp, quantity: Math.max(1, qty) } : sp
      )
    );
  }, []);

  // Another outlet: the cached orders belong to the old one
  useEffect(() => {
    setProductOrders(new Map());
  }, [resolvedOutletId]);
  useEffect(() => {
    selectedProducts.forEach((sp) => void fetchOrdersForProduct(sp.product.id));
  }, [selectedProducts, fetchOrdersForProduct]);

  const { results, ready: periodReady, retry } = useAvailabilityResults(
    selectedProducts.map((sp) => ({ productId: sp.product.id, quantity: sp.quantity })),
    dateError ? '' : pickup,
    returnDate,
    resolvedOutletId
  );

  const activeOrders: ActiveOrder[] = useMemo(
    () =>
      activeProductId
        ? toActiveOrders(productOrders.get(activeProductId) || [], activeProductId, pickup, returnDate)
        : [],
    [productOrders, activeProductId, pickup, returnDate]
  );

  // A tap on a day in the grid keeps the period length and starts it on that day
  const handlePickDay = useCallback(
    (dayKey: string) => {
      const length =
        pickup && returnDate ? Math.round((Date.parse(returnDate) - Date.parse(pickup)) / 86400000) : 0;
      setDateRange({ from: keyToPickerDate(dayKey), to: keyToPickerDate(addDaysToKey(dayKey, length)) });
    },
    [pickup, returnDate]
  );

  useEffect(() => {
    const productIdParam = searchParams.get('productId');
    if (!productIdParam) return;
    const id = parseInt(productIdParam, 10);
    if (Number.isNaN(id)) return;

    void loadProductById(id).then((product) => {
      if (!product) return;
      setSelectedProducts((prev) => {
        if (prev.some((sp) => sp.product.id === product.id)) {
          setActiveProductId(product.id);
          return prev;
        }
        if (prev.length >= MAX_PRODUCTS) return prev;
        setActiveProductId(product.id);
        return [...prev, { product, quantity: 1 }];
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial deep link only
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeProductId) params.set('productId', String(activeProductId));
    if (pickup) params.set('pickup', pickup);
    if (returnDate) params.set('return', returnDate);
    if (resolvedOutletId) params.set('outletId', String(resolvedOutletId));

    const qs = params.toString();
    const desiredSearch = qs ? `?${qs}` : '';
    if (typeof window !== 'undefined' && window.location.search !== desiredSearch) {
      router.replace(`/availability${desiredSearch}`, { scroll: false });
    }
  }, [activeProductId, pickup, returnDate, resolvedOutletId, router]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tc('navigation.dashboard'), href: '/dashboard' },
    { label: t('breadcrumb'), href: '/availability' },
  ];

  const outletName = outlets.find((o) => o.id === resolvedOutletId)?.name || user?.outlet?.name;

  return (
    <PageWrapper maxWidth="7xl">
      <Breadcrumb items={breadcrumbItems} showHome={false} />
      {/* Title with the outlet next to it; a picker only for owners with several outlets */}
      <div className="mb-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
        </div>
        {showOutletSelect && outlets.length > 1 ? (
          <Select value={outletId ? String(outletId) : undefined} onValueChange={(v) => setOutletId(v ? parseInt(v, 10) : undefined)}>
            <SelectTrigger className="h-9 w-full sm:w-64" aria-label={t('outlet')}>
              <SelectValue placeholder={t('selectOutlet')} />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          outletName && <span className="truncate text-sm text-gray-600">{outletName}</span>
        )}
      </div>

      <AvailabilityPeriodBar dateRange={dateRange} onChange={setDateRange} dateError={dateError} disabled={panelDisabled} />

      {selectedProducts.length >= MAX_PRODUCTS && (
        <p className="mt-3 text-sm text-amber-700">{t('maxProductsReached')}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className="rounded-xl border border-border bg-bg-card p-4 lg:col-span-5">
          <AvailabilityProductList
            selectedProducts={selectedProducts}
            results={results}
            periodReady={periodReady}
            activeProductId={activeProductId}
            onSelectActive={setActiveProductId}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
            onQuantityChange={handleQuantityChange}
            canAddProduct={selectedProducts.length < MAX_PRODUCTS}
            outletIdForSearch={resolvedOutletId}
            currency={currency as CurrencyCode}
            disabled={panelDisabled}
          />
        </div>

        {activeSelection && (
          <div className="rounded-xl border border-border bg-bg-card p-4 lg:col-span-7">
            <AvailabilityDetail
              product={activeSelection.product}
              quantity={activeSelection.quantity}
              pickup={pickup}
              returnDate={returnDate}
              periodReady={periodReady}
              check={results.get(activeSelection.product.id)}
              orders={activeOrders}
              onPickDay={handlePickDay}
              onRetry={retry}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
