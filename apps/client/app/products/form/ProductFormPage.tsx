'use client';

/**
 * Thêm / Sửa sản phẩm (#547): one form on the shell tokens for /products/add and /products/[id]/edit.
 * Same API calls as the shared ProductAddForm / ProductEdit it replaces (admin keeps those):
 * categoriesApi.getCategories, outletsApi.getOutletsByMerchant, productsApi.getProductById / createProduct /
 * updateProduct (multipart: JSON `data` + photo files) / syncProductEmbeddings / getProduct.
 * Rules and payload live in ./form-model (unit-tested).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { categoriesApi, outletsApi, productsApi } from '@rentalshop/utils';
import type { ProductCreateInput, ProductUpdateInput } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../../orders/list/parts';
import { fieldClass } from '../../orders/create/parts';
import {
  MAX_PHOTOS,
  PHOTO_ACCEPT,
  buildPayload,
  checkPhotos,
  emptyForm,
  firstError,
  formFromProduct,
  generateBarcode,
  imageSearchState,
  parseCount,
  removedAllSavedPhotos,
  setOutletStock,
  setTotalStock,
  validateForm,
  type ErrorCode,
  type FieldKey,
  type FormState,
  type OutletLite,
  type PricingMode,
  type ProductSource,
} from './form-model';

const UPLOAD_ICON = 'M12 20V9M7 14l5-5 5 5M5 4h14';
const REFRESH_ICON = 'M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4';

const inputClass = `${fieldClass} font-normal`;
const errorBorder = 'border-ar-danger focus:border-ar-danger';
const labelText = 'text-sm font-semibold text-ar-ink-2';

type Category = { id: number; name: string };

interface Loaded {
  categories: Category[];
  outlets: OutletLite[];
  product: (ProductSource & { id: number; name: string }) | null;
}

type LoadState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'notFound' } | { kind: 'ready'; data: Loaded };

function useFormData(productId: number | null, merchantId: number | null, nonce: number): LoadState {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  useEffect(() => {
    if (!merchantId) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    Promise.all([
      categoriesApi.getCategories(),
      outletsApi.getOutletsByMerchant(merchantId),
      productId ? productsApi.getProductById(productId) : Promise.resolve(null),
    ])
      .then(([cats, outs, prod]) => {
        if (cancelled) return;
        if (productId && (!prod || !prod.success || !prod.data)) return setState({ kind: 'notFound' });
        if (!cats.success || !outs.success) return setState({ kind: 'failed' });
        const outletList = ((outs.data as { outlets?: OutletLite[] } | undefined)?.outlets || []).map((o) => ({ id: o.id, name: o.name, address: o.address ?? null }));
        setState({
          kind: 'ready',
          data: {
            categories: ((cats.data as Category[] | undefined) || []).map((c) => ({ id: c.id, name: c.name })),
            outlets: outletList,
            product: prod?.data ? (prod.data as unknown as Loaded['product']) : null,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, merchantId, nonce]);
  return state;
}

// ----------------------------------------------------------------------------
// Small parts
// ----------------------------------------------------------------------------

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className={`${cardClass} flex flex-col gap-4 px-5 py-[18px]`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-ar-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={labelText}>
        {label} {required && <span className="font-normal text-ar-danger">{required}</span>}
      </label>
      {children}
      {error ? (
        <span id={id ? `${id}-error` : undefined} className="text-sm text-ar-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-ar-muted">{hint}</span>
      )}
    </div>
  );
}

const group = (n: number) => {
  const [int, dec] = String(n).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? `,${dec}` : '');
};

/** Money: digits only, shown with thousands dots (same as the Tạo đơn screen). */
function AmountInput({ id, value, onChange, invalid }: { id: string; value: number; onChange: (n: number) => void; invalid?: boolean }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      value={value ? group(value) : ''}
      placeholder="0"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      className={`${inputClass} tabular-nums ${invalid ? errorBorder : ''}`}
    />
  );
}

function CountInput({ id, value, onChange, invalid, label }: { id: string; value: number; onChange: (n: number) => void; invalid?: boolean; label?: string }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={value ? String(value) : ''}
      placeholder="0"
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(parseCount(e.target.value))}
      className={`${inputClass} w-full tabular-nums sm:w-28 ${invalid ? errorBorder : ''}`}
    />
  );
}

function Notice({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col items-start gap-3 px-5 py-6`}>
      <p className="m-0 text-[15px] text-ar-ink">{text}</p>
      {action}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="flex flex-col gap-4">
        {['h-36', 'h-40', 'h-56', 'h-28'].map((h) => (
          <Skeleton key={h} className={`w-full rounded-2xl ${h}`} />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Photos
// ----------------------------------------------------------------------------

function Photos({
  kept,
  files,
  savedCount,
  onRemoveKept,
  onRemoveFile,
  onAdd,
  problems,
  t,
}: {
  kept: string[];
  files: File[];
  savedCount: number;
  onRemoveKept: (i: number) => void;
  onRemoveFile: (i: number) => void;
  onAdd: (list: FileList | null) => void;
  problems: string[];
  t: T;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const count = kept.length + files.length;
  const full = count >= MAX_PHOTOS;
  const tiles = [...kept.map((src) => ({ src, isNew: false })), ...previews.map((src) => ({ src, isNew: true }))];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {tiles.map((tile, i) => (
          <div key={tile.src} className="relative h-[104px] w-[104px] overflow-hidden rounded-xl border border-ar-line bg-ar-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tile.src} alt={t('form.photos.alt', { n: i + 1 })} className="h-full w-full object-cover" />
            {tile.isNew && (
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ar-primary px-1.5 py-0.5 text-xs font-semibold text-ar-on-primary">{t('form.photos.new')}</span>
            )}
            <button
              type="button"
              aria-label={t('form.photos.remove', { n: i + 1 })}
              onClick={() => (tile.isNew ? onRemoveFile(i - kept.length) : onRemoveKept(i))}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
            >
              <ShellIcon d={ICONS.close} size={14} />
            </button>
          </div>
        ))}
        {!full && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              onAdd(e.dataTransfer.files);
            }}
            className={`flex min-h-[104px] min-w-[220px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-center ${
              over ? 'border-ar-primary bg-ar-primary-soft' : 'border-ar-line bg-ar-surface-muted'
            }`}
          >
            <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-ar-ink-2">
              <ShellIcon d={UPLOAD_ICON} size={18} className="text-ar-muted" />
              {t('form.photos.drop')}
              <button type="button" onClick={() => inputRef.current?.click()} className="h-9 rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
                {t('form.photos.pick')}
              </button>
            </span>
            <span className="text-xs text-ar-muted">{t('form.photos.hint')}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />
      <span className="text-sm tabular-nums text-ar-muted">{full ? t('form.photos.full') : t('form.photos.count', { count })}</span>
      {problems.length > 0 && (
        <ul role="alert" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ar-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {removedAllSavedPhotos(savedCount, kept.length, files.length) && <p className="m-0 text-sm text-ar-unprepared">{t('form.photos.keepNote')}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Image search (edit, products.manage) — was the strip under the old edit form
// ----------------------------------------------------------------------------

function ImageSearchCard({ productId, initialIndexedAt, disabled, t }: { productId: number; initialIndexedAt: unknown; disabled: boolean; t: T }) {
  const { toastSuccess, toastError } = useToast();
  const [indexedAt, setIndexedAt] = useState<unknown>(initialIndexedAt ?? null);
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);
  const state = queued ? 'updating' : imageSearchState(indexedAt, busy);

  const sync = async () => {
    setBusy(true);
    try {
      const res = await productsApi.syncProductEmbeddings(productId);
      if (!res.success) throw new Error('sync');
      const fresh = await productsApi.getProduct(productId);
      const next = (fresh.success ? (fresh.data as { embeddingGeneratedAt?: unknown })?.embeddingGeneratedAt : null) ?? (res.data as { embeddingGeneratedAt?: unknown } | undefined)?.embeddingGeneratedAt ?? null;
      setIndexedAt(next);
      setQueued(!next);
      toastSuccess(t('form.imageSearch.title'), next ? t('form.imageSearch.readyToast') : t('form.imageSearch.queuedToast'));
    } catch {
      toastError(t('form.imageSearch.title'), t('form.imageSearch.failed'));
    } finally {
      setBusy(false);
    }
  };

  const pill =
    state === 'ready' ? 'bg-ar-done-bg text-ar-done' : state === 'updating' ? 'bg-ar-primary-soft text-ar-primary-ink' : 'bg-ar-subtle text-ar-muted';
  return (
    <Card title={t('form.imageSearch.title')} aside={<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pill}`}>{t(`form.imageSearch.${state}`)}</span>}>
      <p className="m-0 text-sm text-ar-muted">{t('form.imageSearch.hint')}</p>
      <button type="button" onClick={sync} disabled={busy || disabled} className={`${outlineBtn} self-start`}>
        <ShellIcon d={REFRESH_ICON} size={16} />
        {t('form.imageSearch.update')}
      </button>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export function ProductFormPage({ productId }: { productId: number | null }) {
  const isEdit = productId != null;
  const router = useRouter();
  const t = useTranslations('products.web') as unknown as T;
  const { toastSuccess, toastError } = useToast();
  const { user } = useAuth();
  const { hasPermission, canCreateProducts, canUpdateProducts, canManageProducts } = usePermissions();
  const typedUser = user as unknown as { role?: string; merchantId?: number; merchant?: { id?: number } } | null;
  const merchantId = Number(typedUser?.merchant?.id || typedUser?.merchantId) || null;
  // Prices only with products.manage and never for OUTLET_STAFF (same as iOS ProductAccess.showsPriceFields, #460)
  const canEditPricing = hasPermission('products.manage') && typedUser?.role !== 'OUTLET_STAFF';
  const allowed = isEdit ? canUpdateProducts : canCreateProducts;

  const [nonce, setNonce] = useState(0);
  const load = useFormData(allowed ? productId : null, allowed ? merchantId : null, nonce);
  const data = load.kind === 'ready' ? load.data : null;

  const [form, setForm] = useState<FormState | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, ErrorCode>>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(data.product ? formFromProduct(data.product, data.outlets, data.categories) : emptyForm(data.outlets, data.categories, generateBarcode()));
    setFiles([]);
    setErrors({});
  }, [data]);

  const patch = useCallback((next: Partial<FormState> | ((f: FormState) => FormState), clear?: FieldKey[]) => {
    setForm((f) => (f ? (typeof next === 'function' ? next(f) : { ...f, ...next }) : f));
    if (clear) setErrors((e) => (clear.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !clear.includes(k as FieldKey))) : e));
    setFailed(false);
  }, []);

  const back = isEdit ? `/products/${productId}` : '/products';
  const title = isEdit ? t('form.titleEdit') : t('form.titleAdd');
  const backLabel = isEdit && data?.product ? data.product.name : t('form.back');

  const header = (
    <div className="flex flex-col gap-1">
      <Link href={back} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        <span className="max-w-[60vw] truncate">{backLabel}</span>
      </Link>
      <h1 className="m-0 text-2xl font-bold text-ar-ink">{title}</h1>
    </div>
  );
  const wrap = (body: React.ReactNode) => (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pt-6 text-ar-ink sm:px-8">
      {header}
      {body}
    </div>
  );

  if (!allowed) {
    return wrap(<Notice text={isEdit ? t('form.noEdit') : t('form.noCreate')} action={<Link href={back} className={outlineBtn}>{t('form.back')}</Link>} />);
  }
  if (load.kind === 'notFound') return wrap(<Notice text={t('form.notFound')} action={<Link href="/products" className={outlineBtn}>{t('form.back')}</Link>} />);
  if (load.kind === 'failed') {
    return wrap(
      <Notice
        text={t('form.loadFailed')}
        action={
          <button type="button" onClick={() => setNonce((n) => n + 1)} className={outlineBtn}>
            {t('form.retry')}
          </button>
        }
      />,
    );
  }
  if (!data || !form) return wrap(<FormSkeleton />);
  if (data.categories.length === 0) return wrap(<Notice text={t('form.needCategory')} action={<Link href="/categories" className={outlineBtn}>{t('form.goCategories')}</Link>} />);
  if (data.outlets.length === 0) return wrap(<Notice text={t('form.needOutlet')} action={<Link href="/outlets" className={outlineBtn}>{t('form.goOutlets')}</Link>} />);

  const err = (k: FieldKey) => (errors[k] ? t(`form.errors.${errors[k]}`) : undefined);
  const savedPhotos = data.product ? formFromProduct(data.product, [], []).keptImages.length : 0;
  const multiOutlet = data.outlets.length > 1;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const { accepted, rejected } = checkPhotos(form.keptImages.length + files.length, Array.from(list));
    setFiles((f) => [...f, ...accepted]);
    setProblems(rejected.map((r) => t(`form.photos.problem${r.problem[0].toUpperCase()}${r.problem.slice(1)}`, { name: r.name })));
    setFailed(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateForm(form, { canEditPricing });
    setErrors(found);
    const first = firstError(found);
    if (first) {
      (document.getElementById(`pf-${first}`) || document.getElementById('pf-totalStock'))?.focus();
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      const payload = buildPayload(form, { canEditPricing, productId: productId ?? undefined, merchantId: merchantId ?? undefined });
      const res = isEdit
        ? await productsApi.updateProduct(productId, payload as unknown as ProductUpdateInput, files)
        : await productsApi.createProduct(payload as unknown as ProductCreateInput, files);
      // A refused save comes back as success=false; the global error handler shows the API message.
      if (!res.success) {
        setFailed(true);
        return;
      }
      const id = isEdit ? productId : (res.data as { id?: number } | undefined)?.id;
      toastSuccess(isEdit ? t('form.saved') : t('form.created'));
      router.push(id ? `/products/${id}` : '/products');
    } catch (error) {
      setFailed(true);
      toastError(isEdit ? t('form.saveFailed') : t('form.createFailed'), error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (mode: PricingMode, label: string) => {
    const active = form.defaultMode === mode;
    return (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => patch({ defaultMode: mode }, ['defaultMode'])}
        className={`h-9 rounded-[9px] px-4 text-sm ${active ? 'bg-ar-surface font-semibold text-ar-ink shadow-ar' : 'text-ar-ink-2 hover:text-ar-ink'}`}
      >
        {label}
      </button>
    );
  };

  return wrap(
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title={t('form.sections.info')}>
            <Field id="pf-name" label={t('form.name')} required={t('form.required')} error={err('name')}>
              <input
                id="pf-name"
                value={form.name}
                maxLength={200}
                placeholder={t('form.namePlaceholder')}
                aria-invalid={!!errors.name || undefined}
                onChange={(e) => patch({ name: e.target.value }, ['name'])}
                className={`${inputClass} ${errors.name ? errorBorder : ''}`}
              />
            </Field>
            <Field id="pf-description" label={t('form.description')}>
              <textarea
                id="pf-description"
                rows={3}
                value={form.description}
                placeholder={t('form.descriptionPlaceholder')}
                onChange={(e) => patch({ description: e.target.value })}
                className={`${inputClass} h-auto resize-y py-2.5`}
              />
            </Field>
          </Card>

          <Card title={t('form.sections.photos')}>
            <Photos
              kept={form.keptImages}
              files={files}
              savedCount={savedPhotos}
              onRemoveKept={(i) => patch((f) => ({ ...f, keptImages: f.keptImages.filter((_, j) => j !== i) }))}
              onRemoveFile={(i) => setFiles((list) => list.filter((_, j) => j !== i))}
              onAdd={addFiles}
              problems={problems}
              t={t}
            />
          </Card>

          <Card title={t('form.sections.pricing')}>
            {canEditPricing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="pf-perRental" label={t('form.perRental')} error={err('perRental')}>
                    <AmountInput id="pf-perRental" value={form.perRental} invalid={!!errors.perRental} onChange={(n) => patch({ perRental: n }, ['perRental', 'defaultMode'])} />
                  </Field>
                  <Field id="pf-perDay" label={t('form.perDay')}>
                    <AmountInput id="pf-perDay" value={form.perDay} onChange={(n) => patch({ perDay: n }, ['perRental', 'defaultMode'])} />
                  </Field>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span id="pf-mode-label" className={labelText}>
                    {t('form.defaultMode')}
                  </span>
                  <div
                    id="pf-defaultMode"
                    tabIndex={-1}
                    role="radiogroup"
                    aria-labelledby="pf-mode-label"
                    className={`inline-flex w-fit gap-1 rounded-xl border p-1 ${errors.defaultMode ? 'border-ar-danger' : 'border-ar-line'} bg-ar-subtle`}
                  >
                    {modeBtn('FIXED', t('form.modeFixed'))}
                    {modeBtn('DAILY', t('form.modeDaily'))}
                  </div>
                  {errors.defaultMode ? <span className="text-sm text-ar-danger">{err('defaultMode')}</span> : <span className="text-xs text-ar-muted">{t('form.pricesHint')}</span>}
                </div>
                <div className="grid gap-4 border-t border-ar-subtle pt-4 sm:grid-cols-3">
                  <Field id="pf-deposit" label={t('form.deposit')} error={err('deposit')}>
                    <AmountInput id="pf-deposit" value={form.deposit} invalid={!!errors.deposit} onChange={(n) => patch({ deposit: n }, ['deposit'])} />
                  </Field>
                  <Field id="pf-salePrice" label={t('form.salePrice')} required={t('form.required')} error={err('salePrice')}>
                    <AmountInput id="pf-salePrice" value={form.salePrice} invalid={!!errors.salePrice} onChange={(n) => patch({ salePrice: n }, ['salePrice'])} />
                  </Field>
                  <Field id="pf-costPrice" label={t('form.costPrice')} hint={t('form.costHint')}>
                    <AmountInput id="pf-costPrice" value={form.costPrice} onChange={(n) => patch({ costPrice: n })} />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-sm text-ar-muted">{t('form.staffPrices')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="pf-deposit" label={t('form.deposit')} error={err('deposit')}>
                    <AmountInput id="pf-deposit" value={form.deposit} invalid={!!errors.deposit} onChange={(n) => patch({ deposit: n }, ['deposit'])} />
                  </Field>
                </div>
              </>
            )}
          </Card>

          <Card title={t('form.sections.stock')} aside={multiOutlet ? <span className="text-sm font-semibold tabular-nums text-ar-ink-2">{t('form.sum', { count: form.totalStock })}</span> : undefined}>
            {multiOutlet ? (
              <div className="flex flex-col gap-1.5">
                <span className={labelText}>
                  {t('form.perOutlet')} <span className="font-normal text-ar-danger">{t('form.required')}</span>
                </span>
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.outlets.map((o, i) => {
                    const row = form.outletStock.find((r) => r.outletId === o.id);
                    return (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-ar-subtle py-2.5 first:border-t-0">
                        <span className="flex min-w-0 flex-col">
                          <span className="font-semibold text-ar-ink">{o.name}</span>
                          {o.address && <span className="truncate text-sm text-ar-muted">{o.address}</span>}
                        </span>
                        <CountInput
                          id={i === 0 ? 'pf-totalStock' : `pf-outlet-${o.id}`}
                          label={t('form.quantityOf', { outlet: o.name })}
                          value={row?.stock ?? 0}
                          invalid={!!errors.totalStock}
                          onChange={(n) => patch((f) => setOutletStock(f, o.id, n), ['totalStock', 'outletStock'])}
                        />
                      </li>
                    );
                  })}
                </ul>
                {(errors.totalStock || errors.outletStock) && <span className="text-sm text-ar-danger">{err('totalStock') || err('outletStock')}</span>}
              </div>
            ) : (
              <Field id="pf-totalStock" label={t('form.quantity')} required={t('form.required')} hint={t('form.quantityAt', { outlet: data.outlets[0].name })} error={err('totalStock') || err('outletStock')}>
                <CountInput id="pf-totalStock" value={form.totalStock} invalid={!!errors.totalStock} onChange={(n) => patch((f) => setTotalStock(f, n), ['totalStock', 'outletStock'])} />
              </Field>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title={t('form.sections.organise')}>
            <Field id="pf-categoryId" label={t('form.category')} required={t('form.required')} error={err('categoryId')}>
              <select
                id="pf-categoryId"
                value={form.categoryId || ''}
                onChange={(e) => patch({ categoryId: Number(e.target.value) || 0 }, ['categoryId'])}
                className={`${inputClass} cursor-pointer ${errors.categoryId ? errorBorder : ''}`}
              >
                {!form.categoryId && <option value="">—</option>}
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="pf-barcode" label={t('form.barcode')} hint={t('form.barcodeHint')}>
              <div className="flex gap-2">
                <input
                  id="pf-barcode"
                  value={form.barcode}
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => patch({ barcode: e.target.value })}
                  className={`${inputClass} min-w-0 flex-1 font-mono tabular-nums`}
                />
                <button type="button" onClick={() => patch({ barcode: generateBarcode() })} className={`${outlineBtn} h-11 rounded-xl`}>
                  {t('form.generate')}
                </button>
              </div>
            </Field>
          </Card>
          {isEdit && canManageProducts && data.product && (
            <ImageSearchCard productId={data.product.id} initialIndexedAt={data.product.embeddingGeneratedAt} disabled={saving} t={t} />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-ar-line bg-ar-page/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        {failed && (
          <span role="alert" className="mr-auto text-sm text-ar-danger">
            {isEdit ? t('form.saveFailed') : t('form.createFailed')}
          </span>
        )}
        <Link href={back} className={`${outlineBtn} h-11 rounded-xl px-[18px]`} aria-disabled={saving || undefined}>
          {t('form.cancel')}
        </Link>
        <button type="submit" disabled={saving} className={`${primaryBtn} h-11 rounded-xl px-[22px]`}>
          {!isEdit && !saving && <ShellIcon d={ICONS.plus} size={18} />}
          {saving ? (isEdit ? t('form.saving') : t('form.creating')) : isEdit ? t('form.save') : t('form.create')}
        </button>
      </div>
    </form>,
  );
}

