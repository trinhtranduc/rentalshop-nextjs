'use client';

/**
 * Tạo đơn / Sửa đơn on the shop web (#523), board `Tao-don`: rental days first, a product grid
 * with the units still free for those days ("Còn n/m"), the cart on the right. Money and the saved
 * payload come from ./create-model (unit-tested); the calls are the ones the old form used.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BUSINESS } from '@rentalshop/constants';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { ReceiptPreviewModal } from '../receipt/ReceiptDialog';
import { useAuth, useOrderTranslations } from '@rentalshop/hooks';
import { compressImage, getLocalDateKey, ordersApi, outletsApi, productsApi, profileApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import { useShopToday } from '../../hooks/useShopToday';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { formatDayLabel } from '../orders-model';
import { cardClass, outlineBtn, primaryBtn, type T } from '../list/parts';
import {
  addProduct,
  buildPayload,
  cardPrices,
  chunk,
  computeTotals,
  dayRangeIso,
  draftFromOrder,
  pickOutlet,
  findByBarcode,
  firstMissing,
  hydrateLines,
  imagesOf,
  lineTotal,
  rentalDays,
  repriceLines,
  selectMode,
  setLinePrice,
  setQuantity,
  stockOf,
  type CartLine,
  type CustomerPick,
  type DiscountType,
  type OrderLike,
  type OrderType,
  type ProductLike,
} from './create-model';
import { allowsOverlap, conflictFromResult, ctaState, dayRangeText, orderListText, type BatchResultLike, type LineConflict } from './schedule-model';
import { CartLineRow, CustomerDialog, DaysDialog, Modal, MoneyInput, ProductCard, fieldClass, type LineStatus, type StockView } from './parts';
import { useLoyalty } from './useLoyalty';
import { confirmView } from './confirm-model';
import { CreateConfirmDialog } from './ConfirmDialog';

const PAGE_SIZE = 60;
const MAX_NOTE_IMAGES = 5;

type GridProduct = ProductLike;
type OutletLite = {
  id: number;
  name: string;
  isDefault?: boolean;
  printNote?: string | null;
};
type ReceiptProps = React.ComponentProps<typeof ReceiptPreviewModal>;
type CreateInput = Parameters<typeof ordersApi.createOrder>[0];
type UpdateInput = Parameters<typeof ordersApi.updateOrder>[1];

const listOf = <X,>(data: unknown, key: string): X[] => {
  if (Array.isArray(data)) return data as X[];
  const inner = data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : null;
  return Array.isArray(inner) ? (inner as X[]) : [];
};

// ----------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------

function useProductGrid(q: string, outletId: number | null) {
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => setPage(1), [q, outletId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    productsApi
      .searchProducts({
        search: q || undefined,
        outletId: outletId ?? undefined,
        page,
        limit: PAGE_SIZE,
        sortBy: 'name',
        sortOrder: 'asc',
      } as Parameters<typeof productsApi.searchProducts>[0])
      .then((res) => {
        if (!live) return;
        if (!res.success) throw new Error(res.error || 'PRODUCTS');
        const rows = listOf<GridProduct>(res.data, 'products');
        const more = !!(res.data && typeof res.data === 'object' && (res.data as { hasMore?: boolean }).hasMore);
        setProducts((prev) => (page === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]));
        setHasMore(more);
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [q, outletId, page, reload]);

  return {
    products,
    loading,
    failed,
    hasMore,
    more: () => setPage((p) => p + 1),
    retry: () => setReload((n) => n + 1),
  };
}

/**
 * Free units per product for the chosen days and outlet, fetched for what is on screen. The raw answers are kept:
 * the cart reads other orders holding a product from them (#556). An answer for older days or outlet is dropped.
 */
function useAvailability(ids: number[], orderType: OrderType, pickup: string, ret: string, outletId: number | null, excludeOrderId?: number) {
  const [nonce, setNonce] = useState(0);
  const ready = !!outletId && (orderType === 'SALE' || (!!pickup && !!ret));
  const key = ready ? `${orderType}|${pickup}|${ret}|${outletId}|${nonce}` : '';
  const [store, setStore] = useState<{
    key: string;
    map: Map<number, BatchResultLike | null>;
  }>({ key: '', map: new Map() });
  const asked = useRef<{ key: string; ids: Set<number> }>({
    key: '',
    ids: new Set(),
  });

  useEffect(() => {
    if (!key) return;
    if (asked.current.key !== key) asked.current = { key, ids: new Set() };
    const missing = ids.filter((id) => !asked.current.ids.has(id));
    if (!missing.length) return;
    missing.forEach((id) => asked.current.ids.add(id));
    const range = orderType === 'RENT' ? dayRangeIso(pickup, ret) : {};
    const save = (part: number[], results: BatchResultLike[] | null) => {
      // Days or outlet changed while this call was out: its answer no longer applies
      if (asked.current.key !== key) return;
      setStore((prev) => {
        const map = new Map(prev.key === key ? prev.map : []);
        part.forEach((id) => map.set(id, results ? results.find((r) => r.productId === id) || null : null));
        return { key, map };
      });
    };
    chunk(missing, 100).forEach((part) => {
      productsApi
        .checkBatchProductAvailability({
          products: part.map((productId) => ({ productId, quantity: 1 })),
          orderType,
          ...range,
          timeZone: SHOP_TIMEZONE,
          outletId: outletId as number,
          ...(excludeOrderId ? { excludeOrderId } : {}),
        } as Parameters<typeof productsApi.checkBatchProductAvailability>[0])
        .then((res) => save(part, ((res.success && res.data?.results) || []) as unknown as BatchResultLike[]))
        .catch(() => save(part, null));
    });
  }, [key, ids, orderType, pickup, ret, outletId, excludeOrderId]);

  const view = useCallback(
    (id: number): StockView => {
      if (!ready) return orderType === 'RENT' ? { kind: 'noDays' } : { kind: 'unknown' };
      if (store.key !== key || !store.map.has(id)) return { kind: 'loading' };
      const s = stockOf(store.map.get(id) || undefined, outletId);
      return s ? { kind: 'stock', stock: s } : { kind: 'unknown' };
    },
    [ready, orderType, store, key, outletId],
  );
  const result = useCallback((id: number): BatchResultLike | undefined => (store.key === key ? store.map.get(id) || undefined : undefined), [store, key]);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { view, result, refresh };
}

/** "Cho tạo đơn khi trùng lịch" (#518): the signed-in shop's value, re-read from the profile like iOS. */
function useOverlapSetting(merchant: unknown) {
  const cached = allowsOverlap(merchant as { allowOverlappingOrders?: boolean | null } | null);
  const [fresh, setFresh] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    profileApi
      .getProfile()
      .then((res) => {
        if (live && res.success && res.data) setFresh(allowsOverlap((res.data as { merchant?: { allowOverlappingOrders?: boolean | null } | null }).merchant));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return { allowed: fresh ?? cached, set: setFresh };
}

// ----------------------------------------------------------------------------
// Screen
// ----------------------------------------------------------------------------

export function OrderEditor({ order }: { order?: OrderLike & { id: number; orderNumber: string } }) {
  const editing = !!order;
  const router = useRouter();
  const t = useTranslations('orders.web') as unknown as T;
  const to = useOrderTranslations();
  const money = useFormatCurrency();
  const { toastSuccess } = useToast();
  const { user } = useAuth();
  const weekdays = useMemo(() => t('weekdays').split(','), [t]);
  const todayKey = useShopToday();
  const merchantId = (user?.merchant?.id ?? (user as { merchantId?: number } | null)?.merchantId ?? null) as number | null;

  const draft = useMemo(() => (order ? draftFromOrder(order, getLocalDateKey) : null), [order]);

  // Order
  const [orderType, setOrderType] = useState<OrderType>(draft?.orderType ?? 'RENT');
  const [pickup, setPickup] = useState(draft?.pickup ?? '');
  const [ret, setRet] = useState(draft?.ret ?? '');
  const [customer, setCustomer] = useState<CustomerPick | null>(draft?.customer ?? null);
  const [lines, setLines] = useState<CartLine[]>(draft?.lines ?? []);
  const [discountType, setDiscountType] = useState<DiscountType>(draft?.discountType ?? 'amount');
  const [discountValue, setDiscountValue] = useState(draft?.discountValue ?? 0);
  const [discountOpen, setDiscountOpen] = useState(!!draft?.discountValue);
  const [depositAmount, setDepositAmount] = useState<number | null>(draft?.depositAmount ?? null);
  // Kept as the order already has it (edit); never typed here (#614).
  const [securityDeposit] = useState(draft?.securityDeposit ?? 0);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [notesOpen, setNotesOpen] = useState(!!draft?.notes);
  const [photos, setPhotos] = useState<File[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptProps['order'] | null>(null);

  // Dialogs: a new rental starts with its days
  const [daysOpen, setDaysOpen] = useState(!editing);
  const [customerOpen, setCustomerOpen] = useState(false);

  // Outlet
  const [outlets, setOutlets] = useState<OutletLite[]>([]);
  const [outletId, setOutletId] = useState<number | null>(draft?.outletId ?? user?.outletId ?? null);
  useEffect(() => {
    if (user?.outletId && user.outlet) {
      setOutlets([
        {
          id: user.outletId,
          name: user.outlet.name,
          printNote: (user.outlet as { printNote?: string | null }).printNote ?? null,
        },
      ]);
      // The user can load after the first render (useState above saw no user yet): pick their outlet now.
      setOutletId((cur) => cur ?? user.outletId ?? null);
      return;
    }
    if (!merchantId) return;
    let live = true;
    outletsApi
      .getOutletsByMerchant(Number(merchantId))
      .then((res) => {
        if (!live || !res.success) return;
        const list = listOf<OutletLite>(res.data, 'outlets').map((o) => ({
          id: o.id,
          name: o.name,
          isDefault: o.isDefault,
          printNote: o.printNote ?? null,
        }));
        setOutlets(list);
        setOutletId((cur) => pickOutlet(cur, user?.outletId ?? null, list));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [merchantId, user?.outletId, user?.outlet]);

  // Products
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const grid = useProductGrid(q, outletId);

  // Saved items have no pricing options: load them once from their products
  // Kiểm tra còn hàng → "Tạo đơn với lịch này": ?pickup=&return=&productId=&outletId= prefill a new order
  const prefilled = useRef(false);
  useEffect(() => {
    if (editing || prefilled.current) return;
    prefilled.current = true;
    const params = new URLSearchParams(window.location.search);
    const key = /^\d{4}-\d{2}-\d{2}$/;
    const from = params.get('pickup') || '';
    const to = params.get('return') || '';
    if (key.test(from) && key.test(to) && to >= from) {
      setPickup(from);
      setRet(to);
      setDaysOpen(false);
    }
    const outlet = Number(params.get('outletId'));
    if (outlet > 0 && !user?.outletId) setOutletId(outlet);
    const productId = Number(params.get('productId'));
    if (productId > 0) {
      productsApi
        .getProduct(productId)
        .then((res) => {
          if (res.success && res.data) setLines((cur) => (cur.length ? cur : addProduct(cur, res.data as unknown as ProductLike, 'RENT')));
        })
        .catch(() => undefined);
    }
  }, [editing, user?.outletId]);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!editing || hydrated.current || !draft?.lines.length) return;
    hydrated.current = true;
    Promise.all(draft.lines.map((l) => productsApi.getProduct(l.productId).catch(() => null)))
      .then((res) => {
        const products = res.flatMap((r) => (r && r.success && r.data ? [r.data as unknown as ProductLike] : []));
        setLines((cur) => hydrateLines(cur, products));
      })
      .catch(() => undefined);
  }, [editing, draft]);

  // Stock
  const ids = useMemo(() => {
    const set = new Set<number>(grid.products.map((p) => p.id));
    lines.forEach((l) => set.add(l.productId));
    return Array.from(set);
  }, [grid.products, lines]);
  const availability = useAvailability(ids, orderType, pickup, ret, outletId, order?.id);
  const { view: stockView, result: resultOf } = availability;
  const overlap = useOverlapSetting(user?.merchant);

  // Trùng lịch (#556): rent lines other orders hold on some of the chosen days, from the same answers
  const conflicts = useMemo(() => {
    const map = new Map<number, LineConflict>();
    if (orderType !== 'RENT' || !pickup || !ret) return map;
    lines.forEach((l) => {
      const c = conflictFromResult(resultOf(l.productId), {
        outletId,
        productName: l.name,
        requested: l.quantity,
        pickupKey: pickup,
        returnKey: ret,
      });
      if (c) map.set(l.productId, c);
    });
    return map;
  }, [resultOf, lines, orderType, pickup, ret, outletId]);
  const cta = ctaState(orderType === 'RENT', conflicts.size, overlap.allowed);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const statusOf = (l: CartLine): LineStatus => {
    const c = conflicts.get(l.productId);
    if (c) {
      const range = dayRangeText(c.dayKeys);
      return {
        kind: 'conflict',
        text: c.orderNumbers.length
          ? t('editor.overlap.tag', { days: range, orders: orderListText(c.orderNumbers) })
          : t('editor.overlap.tagNoOrders', { days: range }),
      };
    }
    const s = stockView(l.productId);
    if (s.kind !== 'stock') return null;
    const free = s.stock.free;
    if (l.quantity > free) return { kind: 'short', text: free > 0 ? t('editor.cart.onlyLeft', { free }) : t('editor.cart.noneLeft') };
    return { kind: 'ok', text: orderType === 'RENT' ? t('editor.cart.fits', { free }) : t('editor.cart.inStock', { free }) };
  };

  // Money
  const days = orderType === 'RENT' ? rentalDays(pickup, ret) : 0;
  const base = computeTotals({
    lines,
    orderType,
    days,
    discountType,
    discountValue,
    depositAmount,
    securityDeposit,
  });
  const loyalty = useLoyalty({
    customerId: customer?.id ?? null,
    orderType,
    total: base.totalAmount,
    enabled: !editing,
  });
  const totals = computeTotals({
    lines,
    orderType,
    days,
    discountType,
    discountValue,
    depositAmount,
    securityDeposit,
    loyaltyDiscount: loyalty.discount,
  });
  const missing = firstMissing({
    orderType,
    pickup,
    ret,
    customerId: customer?.id ?? null,
    outletId,
    lines,
  });
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  const switchType = (next: OrderType) => {
    if (editing || next === orderType) return;
    setOrderType(next);
    setLines((cur) => repriceLines(cur, next));
    if (next === 'RENT' && (!pickup || !ret)) setDaysOpen(true);
  };

  const add = (p: GridProduct) => setLines((cur) => addProduct(cur, p, orderType));

  const onSearchEnter = async () => {
    const text = search.trim();
    if (!text) return;
    let hit = findByBarcode(grid.products, text);
    if (!hit) {
      const res = await productsApi
        .searchProducts({
          search: text,
          outletId: outletId ?? undefined,
          limit: 5,
        } as Parameters<typeof productsApi.searchProducts>[0])
        .catch(() => null);
      hit = res?.success ? findByBarcode(listOf<GridProduct>(res.data, 'products'), text) : null;
    }
    if (hit) {
      add(hit);
      setSearch('');
    }
  };

  const addPhotos = async (files: File[]) => {
    const room = MAX_NOTE_IMAGES - photos.length;
    if (room <= 0 || !files.length) return;
    setCompressing(true);
    try {
      const done = await Promise.all(files.slice(0, room).map((f) => compressImage(f, { maxSizeMB: 0.18, maxWidthOrHeight: 1920 }).catch(() => f)));
      setPhotos((p) => [...p, ...done]);
    } finally {
      setCompressing(false);
    }
  };

  // The body sent, and the source of every amount in the confirm dialog (#569)
  const payloadNow = () =>
    customer && outletId
      ? buildPayload({
          mode: editing ? 'edit' : 'create',
          orderType,
          customerId: customer.id,
          outletId,
          pickup,
          ret,
          lines,
          discountType,
          discountValue,
          depositAmount,
          securityDeposit,
          notes,
          loyaltyPoints: loyalty.redeemPoints,
          original: order ? { pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt } : null,
        })
      : null;

  const overlapLines = Array.from(conflicts.values()).map((c) => {
    const range = dayRangeText(c.dayKeys);
    return c.orderNumbers.length
      ? t('editor.overlap.line', { name: c.productName, count: c.shortBy, days: range, orders: orderListText(c.orderNumbers) })
      : t('editor.overlap.lineNoOrders', { name: c.productName, count: c.shortBy, days: range });
  });

  const confirmPayload = confirmOpen && !editing ? payloadNow() : null;
  const confirmData = confirmPayload
    ? confirmView({
        payload: confirmPayload,
        totals,
        names: Object.fromEntries(lines.map((l) => [l.productId, l.name])),
        customer,
        pickup,
        ret,
        days,
        weekdays,
        warnings: cta === 'warn' ? overlapLines : [],
      })
    : null;

  const submit = async (confirmed = false) => {
    if (missing || submitting || !customer || !outletId) {
      if (missing === 'days') setDaysOpen(true);
      if (missing === 'customer') setCustomerOpen(true);
      return;
    }
    if (cta === 'blocked') return;
    // A new order is confirmed first (iOS CreateOrderConfirmSheet, #569); an edit only on a schedule overlap
    if (!confirmed && (!editing || cta === 'warn')) {
      setConfirmOpen(true);
      return;
    }
    if (editing) setConfirmOpen(false);
    const payload = payloadNow();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (order) {
        const res = await ordersApi.updateOrder(order.id, {
          ...payload,
          id: order.id,
        } as unknown as UpdateInput);
        if (!res.success) throw scheduleError(res);
        toastSuccess(to('messages.updateSuccess'));
        router.push(`/orders/${order.orderNumber}`);
      } else {
        const res = await ordersApi.createOrder(payload as unknown as CreateInput, photos.length ? { notesImages: photos } : undefined);
        if (!res.success || !res.data) throw scheduleError(res);
        setConfirmOpen(false);
        toastSuccess(to('messages.createSuccess'));
        setReceipt(res.data as ReceiptProps['order']);
      }
    } catch (e) {
      // The global handler shows the API error (errors.json). The shop turned "trùng lịch" off: show it here too
      // Any other error keeps the confirm open for a retry
      if (e instanceof Error && e.message === 'ORDER_SCHEDULE_CONFLICT') {
        setConfirmOpen(false);
        overlap.set(false);
        availability.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const daysLabel =
    pickup && ret
      ? t('editor.daysButton', {
          from: formatDayLabel(pickup, weekdays),
          to: formatDayLabel(ret, weekdays),
          days,
        })
      : t('editor.pickDays');

  const submitLabel = submitting
    ? t('editor.saving')
    : editing
      ? t('editor.submit.save')
      : orderType === 'RENT' && totals.depositAmount > 0
        ? t('editor.submit.withDeposit', {
            amount: money(totals.depositAmount),
          })
        : t('editor.submit.create');

  const showOutletSelect = outlets.length > 1 && !user?.outletId && !editing;
  const cartRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-full flex-col text-ar-ink min-[1100px]:flex-row">
      {/* Products */}
      <div className="box-border flex min-w-0 flex-1 flex-col gap-3.5 px-4 pb-10 pt-5 sm:px-8 min-[1100px]:pl-8 min-[1100px]:pr-6">
        {editing && (
          <Link
            href={`/orders/${order.orderNumber}`}
            className="flex w-fit items-center gap-1 text-sm font-semibold text-ar-primary-ink no-underline hover:underline"
          >
            <ShellIcon d={ICONS.chevronLeft} size={16} />
            {t('editor.backToOrder', { number: order.orderNumber })}
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-2xl font-bold">{editing ? t('editor.editTitle', { number: order.orderNumber }) : t('editor.title')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {showOutletSelect && (
              <select
                value={outletId ?? ''}
                onChange={(e) => setOutletId(Number(e.target.value) || null)}
                aria-label={t('editor.outlet')}
                className="h-10 cursor-pointer rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-[15px] font-semibold text-ar-ink"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            {orderType === 'RENT' && (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setDaysOpen(true)}
                className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[15px] font-semibold ${
                  pickup && ret ? 'border-ar-line-strong bg-ar-surface text-ar-ink' : 'border-ar-primary bg-ar-primary-soft text-ar-primary-ink'
                }`}
              >
                <ShellIcon d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" size={18} />
                {daysLabel}
              </button>
            )}
          </div>
        </div>

        <label className="flex h-11 items-center gap-2 rounded-xl border border-ar-line-strong bg-ar-surface px-3 text-ar-muted focus-within:border-ar-primary">
          <ShellIcon d={ICONS.search} size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onSearchEnter();
              }
            }}
            aria-label={t('editor.grid.searchLabel')}
            placeholder={t('editor.grid.search')}
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ar-ink outline-none placeholder:text-ar-faint"
          />
        </label>

        <span className="text-sm text-ar-muted">{orderType === 'RENT' ? t('editor.grid.helpRent') : t('editor.grid.helpSale')}</span>

        {grid.failed && grid.products.length === 0 ? (
          <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-4`} role="alert">
            <span className="text-[15px]">{t('editor.grid.failed')}</span>
            <button type="button" className={outlineBtn} onClick={grid.retry}>
              {t('editor.retry')}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] max-sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
            {grid.products.map((p) => (
              <ProductCard
                key={p.id}
                name={p.name}
                image={imagesOf(p.images)[0] || null}
                prices={cardPrices(p, orderType)}
                stock={stockView(p.id)}
                inCart={lines.some((l) => l.productId === p.id)}
                onAdd={() => add(p)}
                t={t}
                money={money}
              />
            ))}
            {grid.loading &&
              Array.from({ length: grid.products.length ? 3 : 9 }, (_, i) => (
                <span key={`s${i}`} aria-hidden="true" className="block h-[236px] animate-pulse rounded-[14px] bg-ar-subtle" />
              ))}
          </div>
        )}
        {!grid.loading && !grid.failed && grid.products.length === 0 && (
          <p className="m-0 py-6 text-center text-[15px] text-ar-muted">{q ? t('editor.grid.noMatch', { q }) : t('editor.grid.empty')}</p>
        )}
        {grid.hasMore && !grid.loading && (
          <button type="button" className={`${outlineBtn} self-center`} onClick={grid.more}>
            {t('editor.grid.more')}
          </button>
        )}
      </div>

      {/* Cart */}
      <aside
        ref={cartRef}
        aria-label={t('editor.cart.label')}
        className="w-full border-t border-ar-line bg-ar-surface min-[1100px]:w-[400px] min-[1100px]:flex-none min-[1100px]:border-l min-[1100px]:border-t-0"
      >
        {/* Wide screens: the cart stays in view while the grid scrolls (65px = top bar) */}
        <div className="box-border flex flex-col gap-4 px-5 pb-24 pt-5 min-[1100px]:sticky min-[1100px]:top-0 min-[1100px]:max-h-[calc(100vh-65px)] min-[1100px]:overflow-y-auto min-[1100px]:pb-6">
          <div role="tablist" aria-label={t('editor.cart.type')} className="grid grid-cols-2 rounded-xl bg-ar-subtle p-1">
            {(['RENT', 'SALE'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={orderType === k}
                disabled={editing && orderType !== k}
                onClick={() => switchType(k)}
                className={`h-10 rounded-[9px] text-[15px] ${
                  orderType === k ? 'bg-ar-surface font-bold text-ar-ink shadow-ar' : 'font-medium text-ar-muted disabled:opacity-50'
                }`}
              >
                {t(`editor.cart.${k}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setCustomerOpen(true)}
            className={`flex min-h-14 items-center gap-3 rounded-xl border bg-ar-surface px-3 py-2 text-left ${
              customer ? 'border-ar-line-strong' : 'border-dashed border-ar-line-strong'
            }`}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-ar-muted">{t('editor.cart.customer')}</span>
              <span className={`truncate text-base font-semibold ${customer ? 'text-ar-ink' : 'text-ar-faint'}`}>
                {customer ? [customer.name, customer.phone].filter(Boolean).join(' · ') : t('editor.cart.pickCustomer')}
              </span>
            </span>
            <span className="text-sm font-semibold text-ar-primary-ink">{customer ? t('editor.cart.change') : t('editor.cart.choose')}</span>
          </button>

          {loyalty.canUse && (
            <div className="flex flex-col gap-2 rounded-xl bg-ar-subtle px-3 py-2.5 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={loyalty.usePoints}
                  onChange={(e) => loyalty.setUsePoints(e.target.checked)}
                  className="h-4 w-4 accent-ar-primary"
                />
                <span>
                  {t('editor.loyalty.use', {
                    points: loyalty.summary?.points ?? 0,
                  })}
                </span>
              </label>
              {loyalty.usePoints && (
                <span className="flex items-center gap-2">
                  <MoneyInput
                    value={loyalty.points}
                    onChange={(n) => loyalty.setPoints(Math.min(n, loyalty.max))}
                    label={t('editor.loyalty.points')}
                    className="flex-1"
                  />
                  <span className="text-ar-muted">{t('editor.loyalty.max', { max: loyalty.max })}</span>
                </span>
              )}
              {loyalty.invalid && <span className="text-ar-danger">{t('editor.loyalty.invalid')}</span>}
            </div>
          )}

          <div className="flex flex-col">
            <span className="pb-1.5 text-xs font-bold uppercase tracking-[.06em] text-ar-muted">
              {t(orderType === 'RENT' ? 'editor.cart.rentItems' : 'editor.cart.saleItems', { count: itemCount })}
            </span>
            {lines.length === 0 ? (
              <p className="m-0 border-t border-ar-line-soft py-4 text-[15px] text-ar-muted">{t('editor.cart.empty')}</p>
            ) : (
              lines.map((l) => (
                <CartLineRow
                  key={l.productId}
                  line={l}
                  orderType={orderType}
                  total={lineTotal(l, orderType, days)}
                  days={days}
                  status={statusOf(l)}
                  onQuantity={(n) => setLines((cur) => setQuantity(cur, l.productId, n))}
                  onMode={(mode) => setLines((cur) => selectMode(cur, l.productId, mode))}
                  onPrice={(price) => setLines((cur) => setLinePrice(cur, l.productId, price))}
                  t={t}
                  money={money}
                />
              ))
            )}
          </div>

          {notesOpen ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1.5 text-sm text-ar-muted">
                {t('editor.notes.label')}
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('editor.notes.placeholder')}
                  className={`${fieldClass} h-auto py-2.5 leading-[22px]`}
                />
              </label>
              {editing ? (
                <span className="text-xs text-ar-muted">{t('editor.notes.photosOnOrder')}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {photos.map((f, i) => (
                    <PhotoThumb
                      key={`${f.name}-${i}`}
                      file={f}
                      label={t('editor.notes.removePhoto')}
                      onRemove={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    />
                  ))}
                  {photos.length < MAX_NOTE_IMAGES && (
                    <button
                      type="button"
                      disabled={compressing}
                      onClick={() => fileRef.current?.click()}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-dashed border-ar-line-strong text-xs text-ar-muted hover:bg-ar-subtle disabled:opacity-60"
                    >
                      <ShellIcon d={ICONS.plus} size={16} />
                      {compressing
                        ? '…'
                        : t('editor.notes.addPhoto', {
                            count: photos.length,
                            max: MAX_NOTE_IMAGES,
                          })}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = '';
                      void addPhotos(files);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-ar-line-strong bg-ar-surface px-3 text-[15px] text-ar-ink-2 hover:bg-ar-subtle"
            >
              <ShellIcon d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" size={18} />
              {editing ? t('editor.notes.openEdit') : t('editor.notes.open')}
            </button>
          )}

          <div className="flex flex-col gap-2 border-t border-ar-line pt-3">
            <div className="flex justify-between text-[15px]">
              <span>{t(orderType === 'RENT' ? 'editor.money.rent' : 'editor.money.goods')}</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[15px]">
              <span>{t('editor.money.discount')}</span>
              {discountOpen ? (
                <span className="flex items-center gap-1.5">
                  <MoneyInput
                    value={discountValue}
                    onChange={setDiscountValue}
                    label={t('editor.money.discount')}
                    suffix={discountType === 'percentage' ? '%' : undefined}
                    className="w-[130px]"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value === 'percentage' ? 'percentage' : 'amount')}
                    aria-label={t('editor.money.discountType')}
                    className="h-11 cursor-pointer rounded-xl border border-ar-line-strong bg-ar-surface px-2 text-sm text-ar-ink"
                  >
                    <option value="amount">{t('editor.money.amount')}</option>
                    <option value="percentage">%</option>
                  </select>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDiscountOpen(true)}
                  className="h-8 rounded-lg border border-ar-line bg-ar-surface px-2.5 text-sm font-semibold text-ar-primary-ink hover:bg-ar-subtle"
                >
                  {t('editor.money.add')}
                </button>
              )}
            </div>
            {totals.discountAmount > 0 && discountType === 'percentage' && (
              <div className="flex justify-between text-sm text-ar-muted">
                <span />
                <span className="tabular-nums">−{money(totals.discountAmount)}</span>
              </div>
            )}
            {totals.loyaltyDiscount > 0 && (
              <div className="flex justify-between text-[15px]">
                <span>{t('editor.money.loyalty')}</span>
                <span className="tabular-nums">−{money(totals.loyaltyDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>{t('editor.money.total')}</span>
              <span className="tabular-nums">{money(totals.totalAmount - totals.loyaltyDiscount)}</span>
            </div>
          </div>

          {orderType === 'RENT' && (
            <>
              {/* Thế chân is taken at hand-over (Giao đồ / Thế chấp & phí), not here (#614); an edited order keeps its stored value. */}
              <label className="flex flex-col gap-1.5 text-sm text-ar-muted">
                {t('editor.money.deposit')}
                <MoneyInput value={totals.depositAmount} onChange={setDepositAmount} label={t('editor.money.deposit')} />
              </label>
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[15px] text-ar-unprepared">
                  <span>{t('editor.money.dueAtPickup')}</span>
                  <span className="font-bold tabular-nums">{money(totals.dueAtPickup)}</span>
                </div>
                {totals.securityDeposit > 0 && (
                  <span className="text-right text-xs text-ar-muted">
                    {t('editor.money.includesSecurity', {
                      amount: money(totals.securityDeposit),
                    })}
                  </span>
                )}
              </div>
            </>
          )}

          {missing && lines.length > 0 && (
            <p className="m-0 text-sm text-ar-muted" role="status">
              {missing === 'price'
                ? t('editor.missing.price', { name: lines.find((l) => l.unitPrice <= 0)?.name ?? '' })
                : t(`editor.missing.${missing}`)}
            </p>
          )}
          {cta === 'blocked' && (
            <p className="m-0 rounded-xl bg-ar-danger-soft px-3 py-2.5 text-sm font-medium text-ar-danger" role="alert">
              {t('editor.overlap.blocked')}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || compressing || cta === 'blocked' || (!!missing && missing !== 'days' && missing !== 'customer')}
            className="h-[52px] rounded-[14px] bg-ar-primary text-base font-semibold text-ar-on-primary hover:opacity-95 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </aside>

      {/* Phones: a bar that jumps to the cart */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ar-line bg-ar-surface px-4 py-3 min-[1100px]:hidden">
          <button
            type="button"
            onClick={() =>
              cartRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
            className={`${primaryBtn} h-12 w-full justify-between rounded-[14px] px-4`}
          >
            <span>{t('editor.bar', { count: itemCount })}</span>
            <span className="tabular-nums">{money(totals.totalAmount - totals.loyaltyDiscount)}</span>
          </button>
        </div>
      )}

      <DaysDialog
        open={daysOpen}
        pickup={pickup}
        ret={ret}
        todayKey={todayKey}
        weekdays={weekdays}
        maxDays={BUSINESS.MAX_RENTAL_DAYS}
        onApply={(a, b) => {
          setPickup(a);
          setRet(b);
          setDaysOpen(false);
        }}
        onClose={() => setDaysOpen(false)}
        t={t}
      />
      {/* Sửa đơn: iOS edits go to its review screen, not the create confirm; only the overlap warning here */}
      <Modal
        open={confirmOpen && editing}
        title={t('editor.overlap.title')}
        onClose={() => setConfirmOpen(false)}
        closeLabel={t('editor.close')}
        footer={
          <>
            <button type="button" className={outlineBtn} onClick={() => setConfirmOpen(false)}>
              {t('editor.cancel')}
            </button>
            <button type="button" className={primaryBtn} onClick={() => void submit(true)} disabled={submitting}>
              {t('editor.overlap.saveAnyway')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-2 rounded-xl bg-ar-unprepared-bg px-3 py-2.5 text-[15px] text-ar-ink">
          {overlapLines.map((line, i) => (
            <p key={`${i}-${line}`} className="m-0">
              {line}
            </p>
          ))}
        </div>
      </Modal>
      <CreateConfirmDialog
        open={confirmOpen && !editing}
        view={confirmData}
        busy={submitting}
        onConfirm={() => void submit(true)}
        onClose={() => setConfirmOpen(false)}
        t={t}
        money={money}
      />
      <CustomerDialog
        open={customerOpen}
        merchantId={merchantId}
        onPick={(c) => {
          setCustomer(c);
          setCustomerOpen(false);
        }}
        onClose={() => setCustomerOpen(false)}
        t={t}
      />
      <ReceiptPreviewModal
        isOpen={!!receipt}
        onClose={() => {
          const number = (receipt as { orderNumber?: string } | null)?.orderNumber;
          setReceipt(null);
          router.push(number ? `/orders/${number}` : '/orders');
        }}
        order={receipt}
        outlet={(outlets.find((o) => o.id === outletId) || null) as ReceiptProps['outlet']}
        merchant={(user?.merchant || null) as ReceiptProps['merchant']}
      />
    </div>
  );
}

/** The create / update call failed: carry the API code so the screen can react to a 409 "trùng lịch". */
function scheduleError(res: { code?: string; error?: unknown }): Error {
  return new Error(res.code === 'ORDER_SCHEDULE_CONFLICT' ? 'ORDER_SCHEDULE_CONFLICT' : String(res.error || 'SAVE_FAILED'));
}

function PhotoThumb({ file, label, onRemove }: { file: File; label: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <span className="relative block h-16 w-16 overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
      >
        <ShellIcon d={ICONS.close} size={12} />
      </button>
    </span>
  );
}
