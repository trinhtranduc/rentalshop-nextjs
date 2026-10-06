'use client';

/**
 * Kiểm tra còn hàng (#527). One product and a period of Vietnam civil days:
 * - "Còn n/m" for the whole period from GET /api/products/{id}/availability (outlet stock),
 * - free units per day and the orders holding the product from GET /api/orders?productId=,
 * - same-category products still free, from GET /api/products + POST /api/products/batch-availability.
 * Product, period, quantity and outlet are kept in the URL.
 */
import React, { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { formatDateKeyInTimeZone, getLocalDateKey, ordersApi, outletsApi, productsApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import { ShellIcon } from '../components/shell/Icon';
import { formatDayLabel } from '../dashboard/overview-model';
import { Skeleton, cardClass, primaryBtn, type Money, type T } from '../orders/list/parts';
import { fieldClass } from '../orders/create/parts';
import { cardPrices, chunk, dayRangeIso, imagesOf, stockOf, type AvailabilityLike, type ProductLike, type Stock } from '../orders/create/create-model';
import {
  addDays,
  barColumns,
  barText,
  dayLevel,
  dayMonth,
  daysBetween,
  freeByDay,
  parsePeriod,
  parseQty,
  quickPeriods,
  similarFree,
  stripDays,
  toHolders,
  verdictOf,
  type Holder,
  type RawOrderLike,
} from './availability-model';

const PRODUCT_ICON = 'M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z';
const toDayKey = (iso: string) => getLocalDateKey(iso);

interface ProductRow extends ProductLike {
  categoryId?: number | null;
  category?: { id?: number | null; name?: string | null } | null;
}

interface OutletLite {
  id: number;
  name: string;
  isDefault?: boolean;
}

const listOf = <X,>(data: unknown, key: string): X[] => {
  if (Array.isArray(data)) return data as X[];
  const inner = data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : null;
  return Array.isArray(inner) ? (inner as X[]) : [];
};

// ----------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------

/** The user's outlet, else the merchant's outlets (default first) for owners. */
function useOutlets(user: ReturnType<typeof useAuth>['user'], authLoading: boolean) {
  const [outlets, setOutlets] = useState<OutletLite[]>([]);
  const [loading, setLoading] = useState(true);
  const merchantId = user?.merchant?.id ?? user?.merchantId;
  useEffect(() => {
    if (authLoading) return;
    if (user?.outletId) {
      setOutlets([{ id: user.outletId, name: (user.outlet as { name?: string } | undefined)?.name || '' }]);
      setLoading(false);
      return;
    }
    if (!merchantId) {
      setLoading(false);
      return;
    }
    let live = true;
    outletsApi
      .getOutletsByMerchant(Number(merchantId))
      .then((res) => {
        if (!live || !res.success) return;
        const list = listOf<OutletLite>(res.data, 'outlets').map((o) => ({ id: o.id, name: o.name, isDefault: o.isDefault }));
        setOutlets([...list.filter((o) => o.isDefault), ...list.filter((o) => !o.isDefault)]);
      })
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [authLoading, user?.outletId, user?.outlet, merchantId]);
  return { outlets, loading };
}

type CheckState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'failed' } | { kind: 'done'; stock: Stock };

/** Free units for the whole period at the outlet (debounced). */
function usePeriodCheck(productId: number | null, from: string, to: string, quantity: number, outletId: number | null, nonce: number): CheckState {
  const [state, setState] = useState<CheckState>({ kind: 'idle' });
  useEffect(() => {
    if (!productId || !outletId || !from || !to || to < from) {
      setState({ kind: 'idle' });
      return;
    }
    let live = true;
    setState({ kind: 'loading' });
    const timer = setTimeout(() => {
      productsApi
        .checkProductAvailability(productId, {
          ...dayRangeIso(from, to),
          quantity,
          outletId,
          includeTimePrecision: true,
          timeZone: SHOP_TIMEZONE,
        })
        .then((res) => {
          if (!live) return;
          const stock = res.success && res.data ? stockOf({ ...(res.data as unknown as AvailabilityLike), productId }, outletId) : null;
          setState(stock ? { kind: 'done', stock } : { kind: 'failed' });
        })
        .catch(() => live && setState({ kind: 'failed' }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [productId, from, to, quantity, outletId, nonce]);
  return state;
}

/** Active orders of the product at the outlet (RESERVED, PICKUPED), as the old page loaded them. */
function useProductOrders(productId: number | null, outletId: number | null, nonce: number) {
  const [state, setState] = useState<{ orders: RawOrderLike[]; loading: boolean; failed: boolean }>({ orders: [], loading: false, failed: false });
  useEffect(() => {
    if (!productId || !outletId) {
      setState({ orders: [], loading: false, failed: false });
      return;
    }
    let live = true;
    setState({ orders: [], loading: true, failed: false });
    ordersApi
      .searchOrders({ productId, outletId, limit: 50, sortBy: 'pickupPlanAt', sortOrder: 'asc' } as Parameters<typeof ordersApi.searchOrders>[0])
      .then((res) => {
        if (!live) return;
        if (!res.success || !res.data) throw new Error('ORDERS');
        const rows = listOf<RawOrderLike>(res.data, 'orders').filter((o) => o.status === 'RESERVED' || o.status === 'PICKUPED');
        setState({ orders: rows, loading: false, failed: false });
      })
      .catch(() => live && setState({ orders: [], loading: false, failed: true }));
    return () => {
      live = false;
    };
  }, [productId, outletId, nonce]);
  return state;
}

/** Products of the same category with their free units for the period. */
function useSimilar(product: ProductRow | null, from: string, to: string, outletId: number | null) {
  const categoryId = product?.categoryId ?? product?.category?.id ?? null;
  const [state, setState] = useState<{ products: ProductRow[]; stock: Map<number, Stock | null>; loading: boolean }>({
    products: [],
    stock: new Map(),
    loading: false,
  });
  useEffect(() => {
    if (!product || !categoryId || !outletId || !from || !to || to < from) {
      setState({ products: [], stock: new Map(), loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await productsApi.searchProducts({ categoryId, outletId, limit: 20, page: 1 } as Parameters<typeof productsApi.searchProducts>[0]);
        const products = listOf<ProductRow>(res.success ? res.data : null, 'products').filter((p) => p.id !== product.id);
        const stock = new Map<number, Stock | null>();
        for (const part of chunk(products.map((p) => p.id), 100)) {
          if (!part.length) continue;
          const batch = await productsApi.checkBatchProductAvailability({
            products: part.map((productId) => ({ productId, quantity: 1 })),
            orderType: 'RENT',
            ...dayRangeIso(from, to),
            timeZone: SHOP_TIMEZONE,
            outletId,
          });
          const results = (batch.success && batch.data?.results) || [];
          part.forEach((id) => stock.set(id, stockOf(results.find((r) => r.productId === id) as AvailabilityLike | undefined, outletId)));
        }
        if (live) setState({ products, stock, loading: false });
      } catch {
        if (live) setState({ products: [], stock: new Map(), loading: false });
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [product, categoryId, from, to, outletId]);
  return state;
}

// ----------------------------------------------------------------------------
// Product picker
// ----------------------------------------------------------------------------

function ProductPicker({
  value,
  outletId,
  onPick,
  t,
}: {
  value: ProductRow | null;
  outletId: number | null;
  onPick: (p: ProductRow) => void;
  t: T;
}) {
  const [text, setText] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  useEffect(() => setText(value?.name ?? ''), [value?.id, value?.name]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    const q = text.trim() === (value?.name ?? '') ? '' : text.trim();
    const timer = setTimeout(() => {
      productsApi
        .searchProducts({ search: q || undefined, outletId: outletId ?? undefined, limit: 8, page: 1 } as Parameters<typeof productsApi.searchProducts>[0])
        .then((res) => {
          if (!live) return;
          setRows(listOf<ProductRow>(res.success ? res.data : null, 'products'));
          setActive(0);
        })
        .catch(() => live && setRows([]))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, text, outletId, value?.name]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (p: ProductRow) => {
    onPick(p);
    setText(p.name);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex min-w-0 flex-[2_1_280px] flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm text-ar-muted">
        {t('product')}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        placeholder={t('productPlaceholder')}
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(rows.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && open && rows[active]) {
            e.preventDefault();
            choose(rows[active]);
          }
        }}
        className={fieldClass}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('product')}
          className="absolute left-0 right-0 top-full z-30 m-0 mt-1 max-h-[320px] list-none overflow-y-auto rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar"
        >
          {loading && rows.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ar-muted">{t('searching')}</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ar-muted">{t('noProducts')}</li>
          ) : (
            rows.map((p, i) => {
              const img = imagesOf(p.images)[0];
              return (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] text-ar-ink ${i === active ? 'bg-ar-subtle' : ''}`}
                  >
                    <Thumb image={img} name={p.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.barcode && <span className="flex-none text-xs text-ar-muted">{p.barcode}</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function Thumb({ image, name, size }: { image?: string; name: string; size: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-xl' : size === 'md' ? 'h-11 w-11 rounded-[10px]' : 'h-8 w-8 rounded-lg';
  return (
    <span className={`flex flex-none items-center justify-center overflow-hidden border border-ar-line bg-ar-subtle text-ar-muted ${box}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <ShellIcon d={PRODUCT_ICON} size={size === 'lg' ? 22 : 18} />
      )}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

function AvailabilityContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('availability.web') as unknown as T;
  const money = useFormatCurrency() as Money;
  const { user, loading: authLoading } = useAuth();

  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);
  const weekdays = useMemo(() => t('weekdays').split(','), [t]);

  // URL state
  const period = parsePeriod(searchParams.get('pickup'), searchParams.get('return'), todayKey);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [quantity, setQuantity] = useState(parseQty(searchParams.get('qty')));
  const productParam = Number(searchParams.get('productId')) || null;

  const { outlets, loading: outletsLoading } = useOutlets(user, authLoading);
  const showOutletSelect = !user?.outletId && outlets.length > 1;
  const [pickedOutlet, setPickedOutlet] = useState<number | null>(Number(searchParams.get('outletId')) || null);
  const outletId: number | null = user?.outletId ?? (outlets.some((o) => o.id === pickedOutlet) ? pickedOutlet : outlets[0]?.id ?? null);

  const [product, setProduct] = useState<ProductRow | null>(null);
  useEffect(() => {
    if (!productParam || product?.id === productParam) return;
    let live = true;
    productsApi
      .getProduct(productParam)
      .then((res) => live && res.success && res.data && setProduct(res.data as unknown as ProductRow))
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link only
  }, [productParam]);

  const reversed = !!from && !!to && to < from;
  useEffect(() => {
    const params = new URLSearchParams();
    if (product) params.set('productId', String(product.id));
    if (from) params.set('pickup', from);
    if (to) params.set('return', to);
    if (quantity > 1) params.set('qty', String(quantity));
    if (showOutletSelect && outletId) params.set('outletId', String(outletId));
    const qs = params.toString();
    if (typeof window !== 'undefined' && window.location.search !== (qs ? `?${qs}` : '')) router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [product, from, to, quantity, outletId, showOutletSelect, pathname, router]);

  const [nonce, setNonce] = useState(0);
  const check = usePeriodCheck(product?.id ?? null, reversed ? '' : from, to, quantity, outletId, nonce);
  const orders = useProductOrders(product?.id ?? null, outletId, nonce);
  const similar = useSimilar(product, reversed ? '' : from, to, outletId);

  const days = useMemo(() => (reversed || !from || !to ? [] : stripDays(from, to)), [from, to, reversed]);
  const holders = useMemo(() => (product ? toHolders(orders.orders, product.id, { from, to }, toDayKey) : []), [orders.orders, product, from, to]);
  const total = check.kind === 'done' ? check.stock.total : null;
  const perDay = useMemo(() => (total == null ? [] : freeByDay(total, holders, days)), [total, holders, days]);
  const shownHolders = holders.filter((h) => barColumns(h, days));
  const hiddenHolders = holders.length - shownHolders.length;

  const setPeriod = (f: string, tt: string) => {
    setFrom(f);
    setTo(tt);
  };
  // A tap on a day keeps the period length and starts it there
  const startOn = (day: string) => setPeriod(day, addDays(day, from && to && !reversed ? daysBetween(from, to) : 0));

  const quick = quickPeriods(todayKey);
  const verdict = check.kind === 'done' ? verdictOf(check.stock, quantity) : null;
  const img = product ? imagesOf(product.images)[0] : undefined;
  const createHref = product ? `/orders/create?productId=${product.id}&pickup=${from}&return=${to}${outletId ? `&outletId=${outletId}` : ''}` : '/orders/create';
  const label = (k: string) => formatDayLabel(k, weekdays);
  const gridCols = `minmax(150px, 200px) repeat(${days.length}, minmax(40px, 1fr))`;

  if (authLoading || outletsLoading) {
    return (
      <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
        {showOutletSelect && (
          <select
            value={outletId ?? ''}
            onChange={(e) => setPickedOutlet(Number(e.target.value) || null)}
            aria-label={t('outlet')}
            className="h-10 max-w-full cursor-pointer rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-[15px] font-semibold text-ar-ink"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <form
        className={`${cardClass} flex flex-col gap-3 px-4 py-4 sm:px-5`}
        onSubmit={(e) => {
          e.preventDefault();
          setNonce((n) => n + 1);
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <ProductPicker value={product} outletId={outletId} onPick={setProduct} t={t} />
          <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5 text-sm text-ar-muted">
            {t('pickup')}
            <input
              type="date"
              value={from}
              onChange={(e) => {
                const v = e.target.value;
                setFrom(v);
                if (v && (!to || to < v)) setTo(v);
              }}
              className={fieldClass}
            />
          </label>
          <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5 text-sm text-ar-muted">
            {t('return')}
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex min-w-0 flex-[0_1_110px] flex-col gap-1.5 text-sm text-ar-muted">
            {t('quantity')}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseQty(e.target.value))}
              className={fieldClass}
            />
          </label>
          <button type="submit" className={`${primaryBtn} h-11 rounded-xl px-5`} disabled={!product}>
            {t('check')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'tomorrow', 'weekend', 'threeDays'] as const).map((k) => {
            const on = quick[k].from === from && quick[k].to === to;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setPeriod(quick[k].from, quick[k].to)}
                className={`h-9 rounded-full px-3 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-surface' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`}
              >
                {t(`quick.${k}`)}
              </button>
            );
          })}
        </div>
        {reversed && (
          <p role="alert" className="m-0 text-sm text-ar-danger">
            {t('reversed')}
          </p>
        )}
      </form>

      {!outletId ? (
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('pickOutlet')}</p>
      ) : !product ? (
        <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{t('pickProduct')}</p>
      ) : (
        <section aria-label={product.name} className={`${cardClass} flex min-w-0 flex-col gap-4 px-4 pb-5 pt-4 sm:px-5`}>
          <div className="flex flex-wrap items-center gap-3.5">
            <Thumb image={img} name={product.name} size="lg" />
            <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
              <span className="text-lg font-bold">{product.name}</span>
              <span className="text-sm tabular-nums text-ar-muted">
                {total != null && !reversed ? t('has', { total, from: label(from), to: label(to) }) : `${label(from)} → ${label(to)}`}
              </span>
            </span>
            {reversed ? null : check.kind === 'loading' ? (
              <span className="flex h-10 items-center rounded-xl bg-ar-subtle px-3.5 text-[15px] text-ar-muted" role="status">
                {t('checking')}
              </span>
            ) : check.kind === 'failed' ? (
              <span role="alert" className="flex items-center gap-2 text-sm text-ar-danger">
                {t('checkFailed')}
                <button type="button" onClick={() => setNonce((n) => n + 1)} className="h-8 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
                  {t('retry')}
                </button>
              </span>
            ) : verdict ? (
              <span
                role="status"
                className={`flex items-center rounded-xl px-3.5 py-2 text-[17px] font-bold tabular-nums ${
                  verdict.kind === 'ok' ? 'bg-ar-done-bg text-ar-done' : 'bg-ar-late-bg text-ar-late'
                }`}
              >
                {verdict.kind === 'ok'
                  ? t('free', { free: verdict.free, total: verdict.total })
                  : verdict.kind === 'short'
                    ? t('short', { missing: verdict.missing, free: verdict.free, total: verdict.total })
                    : t('none')}
              </span>
            ) : null}
            <Link href={createHref} className={`${primaryBtn} h-11 rounded-xl px-[18px]`}>
              {t('createOrder')}
            </Link>
          </div>

          {days.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              <div className="grid gap-y-1.5" style={{ gridTemplateColumns: gridCols, minWidth: 150 + days.length * 44 }}>
                <span />
                {days.map((d) => {
                  const inWin = d >= from && d <= to;
                  return (
                    <span
                      key={`h-${d}`}
                      className={`flex flex-col items-center rounded-t-lg py-1.5 ${inWin ? 'bg-ar-primary-soft' : ''} ${d === todayKey ? 'text-ar-primary-ink' : 'text-ar-muted'}`}
                    >
                      <span className="text-xs">{label(d).split(' ')[0]}</span>
                      <span className="text-sm font-semibold tabular-nums">{d.slice(8, 10)}</span>
                    </span>
                  );
                })}

                <span className="flex items-center text-sm font-bold">{t('dayLeft')}</span>
                {days.map((d, i) => {
                  const inWin = d >= from && d <= to;
                  const free = perDay[i];
                  const level = free == null ? null : dayLevel(free, quantity);
                  return (
                    <button
                      key={`f-${d}`}
                      type="button"
                      onClick={() => startOn(d)}
                      aria-label={free == null ? label(d) : t('dayAria', { day: label(d), count: free })}
                      className={`flex h-9 items-center justify-center border-0 text-[15px] font-bold tabular-nums hover:bg-ar-subtle ${inWin ? 'bg-ar-primary-soft' : 'bg-transparent'} ${
                        level === 'none' ? 'text-ar-danger' : level === 'tight' ? 'text-ar-unprepared' : level === 'ok' ? 'text-ar-done' : 'text-ar-faint'
                      }`}
                    >
                      {free == null ? (check.kind === 'loading' ? '…' : '–') : free}
                    </button>
                  );
                })}

                {shownHolders.map((h) => (
                  <HolderRow key={h.id} h={h} days={days} t={t} />
                ))}
              </div>
            </div>
          )}

          {orders.failed ? (
            <p role="alert" className="m-0 text-sm text-ar-danger">
              {t('holdersFailed')}
            </p>
          ) : orders.loading ? (
            <Skeleton className="h-8 w-full" />
          ) : holders.length === 0 ? (
            <p className="m-0 text-sm text-ar-muted">{t('noHolders')}</p>
          ) : hiddenHolders > 0 ? (
            <HolderList holders={holders.filter((h) => !barColumns(h, days))} t={t} label={label} />
          ) : null}

          <p className="m-0 text-sm text-ar-muted">{t('note')}</p>
        </section>
      )}

      {product && outletId && !reversed && (
        <section className={`${cardClass} overflow-hidden`}>
          <h2 className="m-0 px-5 pb-2 pt-4 text-lg font-bold">{t('similar')}</h2>
          {similar.loading ? (
            <div className="flex flex-col gap-2 px-5 pb-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <SimilarList similar={similar} productId={product.id} quantity={quantity} onPick={setProduct} t={t} money={money} />
          )}
        </section>
      )}
    </div>
  );
}

function HolderRow({ h, days, t }: { h: Holder; days: string[]; t: T }) {
  const cols = barColumns(h, days);
  if (!cols) return null;
  const text = barText(h);
  const barLabel =
    text.kind === 'returnOn' ? t('bar.returnOn', { day: dayMonth(text.day) }) : text.kind === 'single' ? dayMonth(text.day) : t('bar.range', { from: dayMonth(text.from), to: dayMonth(text.to) });
  const units = h.quantity > 1 ? ` · ${t('units', { count: h.quantity })}` : '';
  // A one-day bar is one strip column wide: show only the day, with the full label as a tooltip.
  const narrow = cols.end === cols.start;
  const shortLabel = text.kind === 'returnOn' || text.kind === 'single' ? dayMonth(text.day) : dayMonth(text.from);
  return (
    <>
      <Link href={`/orders/${h.orderNumber}`} className="col-start-1 flex min-h-[40px] min-w-0 flex-col justify-center pr-2 text-inherit no-underline">
        <span className="truncate text-sm font-semibold text-ar-ink">{h.name || t('walkIn')}</span>
        <span className="truncate text-xs text-ar-muted">
          #{h.orderNumber} · {t(`status.${h.status}`)}
          {units}
        </span>
      </Link>
      <Link
        href={`/orders/${h.orderNumber}`}
        style={{ gridColumn: `${cols.start + 2} / ${cols.end + 3}` }}
        title={barLabel}
        className={`flex h-8 items-center self-center overflow-hidden whitespace-nowrap rounded-lg text-xs ${narrow ? 'justify-center px-1' : 'px-2.5'} font-semibold no-underline ${
          h.status === 'PICKUPED' ? 'bg-ar-renting-bg text-ar-renting' : 'bg-ar-reserved-bg text-ar-reserved'
        } ${h.inPeriod ? 'ring-1 ring-inset ring-current' : ''}`}
      >
        {narrow ? shortLabel : barLabel}
      </Link>
    </>
  );
}

/** Orders outside the strip (far ahead), so none is lost. */
function HolderList({ holders, t, label }: { holders: Holder[]; t: T; label: (k: string) => string }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {holders.map((h) => (
        <li key={h.id} className="border-t border-ar-subtle first:border-t-0">
          <Link href={`/orders/${h.orderNumber}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm text-inherit no-underline">
            <span className="font-semibold text-ar-ink">{h.name || t('walkIn')}</span>
            <span className="text-ar-muted">
              #{h.orderNumber} · {t(`status.${h.status}`)}
            </span>
            <span className="tabular-nums text-ar-ink-2">{h.pickupKey === h.returnKey ? label(h.pickupKey) : `${label(h.pickupKey)} → ${label(h.returnKey)}`}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SimilarList({
  similar,
  productId,
  quantity,
  onPick,
  t,
  money,
}: {
  similar: { products: ProductRow[]; stock: Map<number, Stock | null> };
  productId: number;
  quantity: number;
  onPick: (p: ProductRow) => void;
  t: T;
  money: Money;
}) {
  const rows = similarFree(similar.products, productId, (id) => similar.stock.get(id), quantity);
  if (rows.length === 0) return <p className="m-0 border-t border-ar-subtle px-5 py-4 text-sm text-ar-muted">{t('similarEmpty')}</p>;
  return (
    <ul className="m-0 list-none p-0">
      {rows.map(({ product: p, free }) => (
        <li key={p.id} className="border-t border-ar-subtle">
          <button
            type="button"
            onClick={() => {
              onPick(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex w-full items-center gap-3 bg-transparent px-5 py-2.5 text-left text-inherit hover:bg-ar-surface-muted"
          >
            <Thumb image={imagesOf(p.images)[0]} name={p.name} size="md" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-ar-ink">{p.name}</span>
              <span className="truncate text-sm tabular-nums text-ar-muted">
                {cardPrices(p, 'RENT')
                  .map((x) => t(`priceSuffix.${x.type in PRICE_KEYS ? x.type : 'FIXED'}`, { price: money(x.price) }))
                  .join(' · ')}
              </span>
            </span>
            <span className="whitespace-nowrap text-[15px] font-semibold text-ar-done">{t('similarFree', { count: free })}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const PRICE_KEYS: Record<string, true> = { DAILY: true, HOURLY: true, FIXED: true, WEEKLY: true, MONTHLY: true };

export default function AvailabilityPage() {
  return (
    <Suspense fallback={null}>
      <AvailabilityContent />
    </Suspense>
  );
}
