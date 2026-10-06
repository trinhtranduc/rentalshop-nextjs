'use client';

/**
 * Chi tiết sản phẩm (#547) on the shell tokens. Same API calls as the old page (productsApi.getProductById,
 * productsApi.deleteProduct); prices by kind come from ../list/list-model, the default mode from ../form/form-model.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { usePermissions } from '@rentalshop/hooks';
import { productsApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../../orders/list/parts';
import { Modal } from '../../orders/create/parts';
import { PRODUCT_ICON } from '../list/parts';
import { productPrices, type ProductLike } from '../list/list-model';
import { defaultModeOf, imagesOf, type ProductSource } from '../form/form-model';

const CHECK_ICON = 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11';
const LIST_ICON = 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01';
const EDIT_ICON = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z';
const TRASH_ICON = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6';

type Product = ProductLike &
  ProductSource & {
    id: number;
    name: string;
    description?: string | null;
    costPrice?: number | null;
    deposit?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    outletStock?: Array<{ stock?: number; available?: number; renting?: number; outlet?: { id?: number | null; name?: string | null } | null }> | null;
  };

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'notFound' } | { kind: 'ready'; product: Product };

function useProduct(id: number, nonce: number): State {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    if (!(id > 0)) {
      setState({ kind: 'notFound' });
      return;
    }
    setState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }));
    productsApi
      .getProductById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setState({ kind: 'ready', product: res.data as unknown as Product });
        else setState({ kind: res.code === 'PRODUCT_NOT_FOUND' || res.code === 'NOT_FOUND' ? 'notFound' : 'failed' });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);
  return state;
}

const stamp = new Intl.DateTimeFormat('vi-VN', {
  timeZone: SHOP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const fmtStamp = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : stamp.format(d);
};

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-[18px] ${className}`}>
      <h2 className="m-0 text-lg font-bold text-ar-ink">{title}</h2>
      {children}
    </section>
  );
}

function PriceRow({ label, value, badge }: { label: string; value: React.ReactNode; badge?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ar-subtle py-2.5 first:border-t-0">
      <dt className="flex items-center gap-2 text-[15px] text-ar-ink-2">
        {label}
        {badge && <span className="rounded-md bg-ar-primary-soft px-1.5 py-0.5 text-xs font-semibold text-ar-primary-ink">{badge}</span>}
      </dt>
      <dd className="m-0 whitespace-nowrap text-[15px] font-semibold tabular-nums text-ar-ink">{value}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const t = useTranslations('products.web') as unknown as T;
  const money = useFormatCurrency();
  const { toastSuccess } = useToast();
  const { canManageProducts, canUpdateProducts } = usePermissions();
  const [nonce, setNonce] = useState(0);
  const state = useProduct(id, nonce);

  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const container = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';
  const backLink = (
    <Link href="/products" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
      <ShellIcon d={ICONS.chevronLeft} size={16} />
      {t('detail.back')}
    </Link>
  );

  if (state.kind === 'loading') {
    return (
      <div className={container} aria-busy="true">
        {backLink}
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  if (state.kind !== 'ready') {
    return (
      <div className={container}>
        {backLink}
        <div role="alert" className={`${cardClass} flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-ink`}>
          <span>{state.kind === 'notFound' ? t('detail.notFound') : t('detail.loadFailed')}</span>
          {state.kind === 'failed' && (
            <button type="button" onClick={() => setNonce((n) => n + 1)} className={outlineBtn}>
              {t('detail.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const p = state.product;
  const prices = productPrices(p);
  const mode = defaultModeOf(p);
  const both = prices.once != null && prices.day != null;
  const images = imagesOf(p.images).slice(0, 3);
  const rows = (p.outletStock || []).filter(Boolean);
  const sum = rows.reduce<{ stock: number; available: number; renting: number }>(
    (acc, r) => ({ stock: acc.stock + (Number(r.stock) || 0), available: acc.available + (Number(r.available) || 0), renting: acc.renting + (Number(r.renting) || 0) }),
    { stock: 0, available: 0, renting: 0 },
  );
  const cost = Number(p.costPrice) || 0;

  const runDelete = async () => {
    setDeleting(true);
    try {
      const res = await productsApi.deleteProduct(p.id);
      // A refused delete (e.g. PRODUCT_HAS_OPEN_ORDERS, #389) is shown by the global error handler; stay here.
      if (!res.success) {
        setConfirm(false);
        return;
      }
      toastSuccess(t('delete.done', { count: 1 }));
      router.push('/products');
    } catch {
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const th = 'px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
  return (
    <div className={container}>
      {backLink}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 break-words text-2xl font-bold text-ar-ink">{p.name}</h1>
          {p.barcode && <p className="m-0 mt-1 font-mono text-sm tabular-nums text-ar-muted">{p.barcode}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/availability?productId=${p.id}`} className={outlineBtn}>
            <ShellIcon d={CHECK_ICON} size={18} />
            {t('detail.checkStock')}
          </Link>
          <Link href={`/products/${p.id}/orders`} className={outlineBtn}>
            <ShellIcon d={LIST_ICON} size={18} />
            {t('detail.orders')}
          </Link>
          {canUpdateProducts && (
            <Link href={`/products/${p.id}/edit`} className={primaryBtn}>
              <ShellIcon d={EDIT_ICON} size={18} />
              {t('detail.edit')}
            </Link>
          )}
          {canManageProducts && (
            <button type="button" onClick={() => setConfirm(true)} className={`${outlineBtn} text-ar-danger`}>
              <ShellIcon d={TRASH_ICON} size={18} />
              {t('detail.delete')}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title={t('detail.photos')}>
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((src, i) => (
                  <a
                    key={src}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('detail.openPhoto', { n: i + 1 })}
                    className="block h-[132px] w-[132px] overflow-hidden rounded-xl border border-ar-line bg-ar-subtle sm:h-40 sm:w-40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ar-line bg-ar-surface-muted text-sm text-ar-muted">
                <ShellIcon d={PRODUCT_ICON} size={22} />
                {t('detail.noPhoto')}
              </div>
            )}
          </Card>

          <Card title={t('detail.prices')}>
            <dl className="m-0">
              <PriceRow label={t('detail.once')} value={prices.once != null ? money(prices.once) : '—'} badge={both && mode === 'FIXED' ? t('detail.default') : undefined} />
              <PriceRow
                label={t('detail.day')}
                value={prices.day != null ? t('detail.perDay', { price: money(prices.day) }) : '—'}
                badge={both && mode === 'DAILY' ? t('detail.default') : undefined}
              />
              {prices.hour != null && <PriceRow label={t('detail.hour')} value={t('detail.perHour', { price: money(prices.hour) })} />}
              <PriceRow label={t('detail.deposit')} value={money(Number(p.deposit) || 0)} />
              <PriceRow label={t('detail.sale')} value={prices.sale != null ? money(prices.sale) : '—'} />
              {canManageProducts && cost > 0 && <PriceRow label={t('detail.cost')} value={money(cost)} />}
            </dl>
          </Card>

          <Card title={t('detail.description')}>
            <p className={`m-0 whitespace-pre-wrap text-[15px] ${p.description ? 'text-ar-ink' : 'text-ar-muted'}`}>{p.description || t('detail.noDescription')}</p>
          </Card>

          <section className={`${cardClass} overflow-hidden`}>
            <h2 className="m-0 px-5 pb-2 pt-[18px] text-lg font-bold text-ar-ink">{t('detail.stock')}</h2>
            {rows.length === 0 ? (
              <p className="m-0 px-5 pb-5 text-[15px] text-ar-muted">{t('detail.noStock')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[15px]">
                  <thead>
                    <tr className="bg-ar-surface-muted text-left">
                      <th scope="col" className={`${th} pl-5`}>{t('detail.outlet')}</th>
                      <th scope="col" className={`${th} text-right`}>{t('detail.total')}</th>
                      <th scope="col" className={`${th} text-right`}>{t('detail.available')}</th>
                      <th scope="col" className={`${th} pr-5 text-right`}>{t('detail.renting')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.outlet?.id ?? i} className="border-t border-ar-subtle">
                        <td className="py-2.5 pl-5 pr-2 text-ar-ink">{r.outlet?.name || '—'}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-ar-ink">{Number(r.stock) || 0}</td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-ar-done">{Number(r.available) || 0}</td>
                        <td className="py-2.5 pl-2 pr-5 text-right tabular-nums text-ar-ink-2">{Number(r.renting) || 0}</td>
                      </tr>
                    ))}
                    {rows.length > 1 && (
                      <tr className="border-t border-ar-line bg-ar-surface-muted font-bold">
                        <td className="py-2.5 pl-5 pr-2 text-ar-ink">{t('detail.sum')}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-ar-ink">{sum.stock}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-ar-done">{sum.available}</td>
                        <td className="py-2.5 pl-2 pr-5 text-right tabular-nums text-ar-ink-2">{sum.renting}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <Card title={t('detail.organise')}>
          <dl className="m-0 flex flex-col gap-3 text-[15px]">
            <div>
              <dt className="text-sm text-ar-muted">{t('detail.category')}</dt>
              <dd className="m-0 font-semibold text-ar-ink">{p.category?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ar-muted">{t('detail.barcode')}</dt>
              <dd className="m-0 break-all font-mono tabular-nums text-ar-ink">{p.barcode || '—'}</dd>
            </div>
            <div className="border-t border-ar-subtle pt-3">
              <dt className="text-sm text-ar-muted">{t('detail.created')}</dt>
              <dd className="m-0 tabular-nums text-ar-ink-2">{fmtStamp(p.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ar-muted">{t('detail.updated')}</dt>
              <dd className="m-0 tabular-nums text-ar-ink-2">{fmtStamp(p.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Modal
        open={confirm}
        title={t('delete.title')}
        onClose={() => !deleting && setConfirm(false)}
        closeLabel={t('close')}
        footer={
          <>
            <button type="button" onClick={() => setConfirm(false)} disabled={deleting} className={outlineBtn}>
              {t('delete.cancel')}
            </button>
            <button
              type="button"
              onClick={runDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center rounded-[10px] bg-ar-danger px-4 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {deleting ? t('delete.deleting') : t('delete.confirm')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink">{t('delete.one', { name: p.name })}</p>
      </Modal>
    </div>
  );
}
