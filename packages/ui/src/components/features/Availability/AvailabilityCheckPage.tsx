'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  Breadcrumb,
} from '@rentalshop/ui';
import type { BreadcrumbItem, DateRange } from '@rentalshop/ui';
import { useAvailabilityTranslations, useCommonTranslations } from '@rentalshop/hooks';
import type { ProductWithStock } from '@rentalshop/types';
import type { CurrencyCode } from '@rentalshop/types';
import { AvailabilityInputPanel } from './AvailabilityInputPanel';
import { AvailabilityResultSide } from './AvailabilityResultSide';
import { loadProductById } from './useAvailabilityCheck';
import { needsOutletSelection, toActiveOrders } from './utils';
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
  const [activeOrders, setActiveOrders] = useState<Map<number, ActiveOrder[]>>(new Map());

  const pickup = dateRange.from ? dateRange.from.toISOString().split('T')[0] : '';
  const returnDate = dateRange.to ? dateRange.to.toISOString().split('T')[0] : '';

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

  const fetchOrdersForProduct = useCallback(
    async (productId: number) => {
      if (!resolvedOutletId) return;
      try {
        const response = await ordersApi.searchOrders({
          productId,
          outletId: resolvedOutletId,
          status: ['RESERVED', 'PICKUPED'],
          limit: 50,
          sortBy: 'pickupPlanAt',
          sortOrder: 'asc',
        });
        if (response.success && response.data?.orders) {
          const orders = toActiveOrders(response.data.orders, pickup, returnDate);
          setActiveOrders((prev) => new Map(prev).set(productId, orders));
        }
      } catch (err) {
        console.error('Failed to fetch orders for product:', productId, err);
      }
    },
    [resolvedOutletId, pickup, returnDate]
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
      void fetchOrdersForProduct(product.id);
    },
    [selectedProducts, fetchOrdersForProduct]
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
      setActiveOrders((prev) => {
        const next = new Map(prev);
        next.delete(productId);
        return next;
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

  useEffect(() => {
    if (!pickup || !returnDate) return;
    selectedProducts.forEach((sp) => {
      void fetchOrdersForProduct(sp.product.id);
    });
  }, [pickup, returnDate, resolvedOutletId]);

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
      void fetchOrdersForProduct(product.id);
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

  return (
    <PageWrapper maxWidth="7xl">
      <Breadcrumb items={breadcrumbItems} />
      <PageHeader className="mb-4">
        <PageTitle subtitle={t('subtitle')}>{t('title')}</PageTitle>
      </PageHeader>

      {selectedProducts.length >= MAX_PRODUCTS && (
        <p className="text-sm text-amber-600 mb-3">{t('maxProductsReached')}</p>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm min-h-[calc(100vh-180px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
          {/* Left panel */}
          <div className="lg:col-span-5 xl:col-span-5 p-4 lg:p-5 lg:border-r border-border">
            <AvailabilityInputPanel
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              dateError={dateError}
              showOutletSelect={showOutletSelect}
              outletId={outletId}
              outlets={outlets}
              onOutletChange={setOutletId}
              selectedProducts={selectedProducts}
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

          {/* Right panel */}
          <div className="lg:col-span-7 xl:col-span-7 p-4 lg:p-5">
            <AvailabilityResultSide
              product={activeSelection?.product ?? null}
              quantity={activeSelection?.quantity ?? 1}
              pickup={pickup}
              returnDate={returnDate}
              outletId={resolvedOutletId}
              dateError={dateError}
              activeOrders={
                activeProductId ? activeOrders.get(activeProductId) || [] : []
              }
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
