'use client';

/**
 * Danh mục (#543) on the shop shell. Same calls as the old page: the list through
 * `useCategoriesWithFilters` (GET /api/categories), `categoriesApi.createCategory / updateCategory /
 * deleteCategory`. Add / edit / delete need `products.manage` (as before); everyone else only views.
 * Search, sort and page live in the URL and run on the loaded list (`pageCategories`), because the
 * API ignores `q`, `page` and `sort*` today.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, useCategoriesWithFilters, usePermissions } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { categoriesApi } from '@rentalshop/utils';
import type { Category as BaseCategory, CategoryFilters } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../components/shell/Icon';
import { Skeleton, TableFooter, cardClass, outlineBtn, primaryBtn, type T } from '../orders/list/parts';
import { Modal, fieldClass } from '../orders/create/parts';
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_FETCH_LIMIT,
  categoryPayload,
  formatCreatedAt,
  nextSort,
  pageCategories,
  parseCategoryParams,
  rowActions,
  validateCategory,
  type CategoryFieldError,
  type CategorySortBy,
} from './categories-model';

const smallBtn =
  'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle disabled:opacity-50';
const dangerBtn =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ar-ink-2';
const errorField = 'border-ar-danger focus:border-ar-danger';

/** The API also returns `isDefault` (the shop's default category cannot be deleted). */
type Category = BaseCategory & { isDefault?: boolean | null };
type FormState = { name: string; description: string };
type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; row: Category }
  | { kind: 'view'; row: Category }
  | { kind: 'delete'; row: Category }
  | null;

function RowMenu({
  label,
  items,
}: {
  label: string;
  items: Array<{ key: string; text: string; danger?: boolean; onPick: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle"
      >
        <ShellIcon d={ICONS.more} size={18} />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 m-0 mt-1 min-w-[180px] list-none rounded-xl border border-ar-line-soft bg-ar-surface p-1 text-left shadow-ar">
          {items.map((it) => (
            <li role="none" key={it.key}>
              <button
                role="menuitem"
                type="button"
                className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-ar-subtle ${it.danger ? 'text-ar-danger' : 'text-ar-ink'}`}
                onClick={() => {
                  setOpen(false);
                  it.onPick();
                }}
              >
                {it.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryForm({
  open,
  initial,
  title,
  submitText,
  onClose,
  onSubmit,
  t,
  tv,
}: {
  open: boolean;
  initial: FormState;
  title: string;
  submitText: string;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<boolean>;
  t: T;
  tv: (key: CategoryFieldError) => string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<{ name?: CategoryFieldError; description?: CategoryFieldError }>({});
  const [saving, setSaving] = useState(false);
  const formId = 'category-form';

  useEffect(() => {
    if (open) {
      setForm(initial);
      setErrors({});
      setSaving(false);
    }
    // `initial` is a fresh object per render of the parent; reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateCategory(form);
    setErrors(found);
    if (found.name || found.description) return;
    setSaving(true);
    const ok = await onSubmit(form);
    if (!ok) setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => (saving ? undefined : onClose())}
      closeLabel={t('form.close')}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={outlineBtn}>
            {t('form.cancel')}
          </button>
          <button type="submit" form={formId} disabled={saving} className={primaryBtn}>
            {saving ? t('form.saving') : submitText}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <label className={labelClass}>
          <span>
            {t('form.name')} <span className="font-normal text-ar-danger">{t('form.required')}</span>
          </span>
          <input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
            }}
            placeholder={t('form.namePlaceholder')}
            aria-invalid={!!errors.name || undefined}
            className={`${fieldClass} font-normal ${errors.name ? errorField : ''}`}
          />
          {errors.name && <span className="text-sm font-normal text-ar-danger">{tv(errors.name)}</span>}
        </label>
        <label className={labelClass}>
          {t('form.description')}
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              if (errors.description) setErrors((er) => ({ ...er, description: undefined }));
            }}
            placeholder={t('form.descriptionPlaceholder')}
            aria-invalid={!!errors.description || undefined}
            className={`${fieldClass} h-auto resize-y py-2.5 font-normal ${errors.description ? errorField : ''}`}
          />
          <span className="flex justify-between gap-2 text-xs font-normal">
            <span className="text-ar-danger">{errors.description ? tv(errors.description) : ''}</span>
            <span className="tabular-nums text-ar-muted">
              {t('form.count', { count: form.description.trim().length, max: CATEGORY_DESCRIPTION_MAX })}
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tc = useTranslations('categories');
  const t = useTranslations('categories.web') as unknown as T;
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const { canManageProducts } = usePermissions();

  const { q, page, limit, sortBy, sortOrder } = parseCategoryParams(searchParams);
  const merchantId = user?.merchant?.id || user?.merchantId;

  // One large page; search, sort and paging happen in `pageCategories` (see CATEGORY_FETCH_LIMIT).
  const filters: CategoryFilters = useMemo(
    () => ({ merchantId: merchantId ? Number(merchantId) : undefined, page: 1, limit: CATEGORY_FETCH_LIMIT }),
    [merchantId],
  );
  const { data, loading, error, refetch } = useCategoriesWithFilters({ filters });

  const update = useCallback(
    (patch: Record<string, string | number | null>, replace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') params.delete(k);
        else params.set(k, String(v));
      }
      if (!('page' in patch)) params.delete('page');
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Search box: debounced into ?q= (the old page searched while typing too).
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    const next = draft.trim();
    if (next === q) return;
    const id = window.setTimeout(() => update({ q: next || null }, true), 300);
    return () => window.clearTimeout(id);
  }, [draft, q, update]);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleting, setDeleting] = useState(false);

  const all: Category[] = useMemo(() => data?.categories || [], [data]);
  const { rows, total, totalPages, page: shownPage } = useMemo(
    () => pageCategories(all, { q, page, limit, sortBy, sortOrder }),
    [all, q, page, limit, sortBy, sortOrder],
  );

  const tv = (key: CategoryFieldError) => tc(`validation.${key}`);
  const sort = (column: CategorySortBy) => update({ ...nextSort({ sortBy, sortOrder }, column), page: null });

  const create = async (form: FormState) => {
    try {
      const res = await categoriesApi.createCategory({
        ...categoryPayload(form),
        merchantId: Number(merchantId) || 0,
      } as Parameters<typeof categoriesApi.createCategory>[0]);
      if (res.success) {
        toastSuccess(tc('messages.createSuccess'), tc('messages.createSuccess'));
        setDialog(null);
        refetch();
        return true;
      }
    } catch {
      // The global API error handler shows the toast (as before).
    }
    return false;
  };

  const save = (row: Category) => async (form: FormState) => {
    try {
      const res = await categoriesApi.updateCategory(row.id, categoryPayload(form));
      if (res.success) {
        toastSuccess(tc('messages.updateSuccess'), tc('messages.updateSuccess'));
        setDialog(null);
        refetch();
        return true;
      }
    } catch {
      // Handled globally.
    }
    return false;
  };

  const remove = async () => {
    if (dialog?.kind !== 'delete') return;
    setDeleting(true);
    try {
      const res = await categoriesApi.deleteCategory(dialog.row.id);
      if (res.success) {
        toastSuccess(tc('messages.deleteSuccess'), tc('messages.deleteSuccess'));
        setDialog(null);
        refetch();
      }
    } catch {
      // Handled globally.
    } finally {
      setDeleting(false);
    }
  };

  const th = 'px-2 py-2.5 text-left text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
  const sortHeader = (column: CategorySortBy, label: string, extra = '') => (
    <th scope="col" className={`${th} ${extra}`} aria-sort={sortBy === column ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => sort(column)}
        aria-label={t('sortBy', { column: label })}
        className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-ar-ink"
      >
        {label}
        {sortBy === column && <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  const defaultTag = (row: Category) =>
    row.isDefault ? (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-reserved-bg px-2 py-[2px] text-xs font-bold text-ar-reserved">{t('default')}</span>
    ) : null;

  const actions = (row: Category) => {
    const allowed = rowActions(row, canManageProducts);
    if (!allowed.includes('edit')) {
      return (
        <button type="button" onClick={() => setDialog({ kind: 'view', row })} className={smallBtn}>
          {t('view')}
        </button>
      );
    }
    return (
      <span className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => setDialog({ kind: 'edit', row })} className={smallBtn}>
          {t('edit')}
        </button>
        <RowMenu
          label={t('more', { name: row.name })}
          items={[
            { key: 'view', text: t('viewDetails'), onPick: () => setDialog({ kind: 'view', row }) },
            ...(allowed.includes('delete')
              ? [{ key: 'delete', text: t('delete'), danger: true, onPick: () => setDialog({ kind: 'delete', row }) }]
              : []),
          ]}
        />
      </span>
    );
  };

  const nameButton = (row: Category, className: string) => (
    <button type="button" onClick={() => setDialog({ kind: 'view', row })} className={`min-w-0 truncate text-left font-semibold text-ar-ink hover:underline ${className}`}>
      {row.name}
    </button>
  );

  const showFooter = !error && total > limit;

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">
          {t('title')}
          {data && !error && <span className="text-base font-normal text-ar-muted"> · {all.length}</span>}
        </h1>
        {canManageProducts && (
          <button type="button" onClick={() => setDialog({ kind: 'add' })} className={primaryBtn}>
            <ShellIcon d={ICONS.plus} size={18} />
            {t('add')}
          </button>
        )}
      </div>

      <section className={`${cardClass} min-w-0 overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-ar-subtle px-4 py-3.5">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: draft.trim() || null });
            }}
            className="w-full md:w-auto"
          >
            <label className="flex h-9 items-center gap-2 rounded-[10px] bg-ar-subtle px-3 text-ar-muted focus-within:ring-2 focus-within:ring-ar-primary md:w-[320px]">
              <ShellIcon d={ICONS.search} size={16} />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t('searchLabel')}
                placeholder={t('searchPlaceholder')}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ar-ink outline-none placeholder:text-ar-muted"
              />
            </label>
          </form>
        </div>

        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
            <span>{t('loadFailed')}</span>
            <button type="button" onClick={() => refetch()} className={smallBtn}>
              {t('retry')}
            </button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-[15px] text-ar-muted">{q ? t('emptySearch') : t('empty')}</p>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
            <table className="hidden w-full table-fixed border-collapse text-[15px] md:table">
              <thead>
                <tr className="bg-ar-surface-muted">
                  {sortHeader('name', t('cols.name'), 'w-[30%] pl-4')}
                  <th scope="col" className={th}>
                    {t('cols.description')}
                  </th>
                  {sortHeader('createdAt', t('cols.createdAt'), 'w-[170px]')}
                  <th scope="col" className={`${th} w-[150px] pr-4`}>
                    <span className="sr-only">{t('cols.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-ar-subtle">
                    <td className="py-2.5 pl-4 pr-2 align-middle">
                      <span className="flex min-w-0 items-center gap-2">
                        {nameButton(row, '')}
                        {defaultTag(row)}
                      </span>
                    </td>
                    <td className="truncate px-2 py-2.5 align-middle text-ar-ink-2">{row.description || <span className="text-ar-faint">—</span>}</td>
                    <td className="px-2 py-2.5 align-middle text-sm tabular-nums text-ar-muted">{formatCreatedAt(row.createdAt)}</td>
                    <td className="py-2.5 pl-2 pr-4 text-right align-middle">{actions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="m-0 list-none p-0 md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start gap-3 border-t border-ar-subtle px-4 py-3 first:border-t-0">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2">
                      {nameButton(row, '')}
                      {defaultTag(row)}
                    </span>
                    {row.description && <span className="line-clamp-2 text-sm text-ar-ink-2">{row.description}</span>}
                    <span className="text-sm tabular-nums text-ar-muted">{formatCreatedAt(row.createdAt)}</span>
                  </span>
                  {actions(row)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showFooter && (
          <TableFooter
            page={shownPage}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPage={(p) => update({ page: p })}
            onLimit={(n) => update({ limit: n })}
            t={t}
          />
        )}
      </section>

      <CategoryForm
        open={dialog?.kind === 'add'}
        initial={{ name: '', description: '' }}
        title={t('form.addTitle')}
        submitText={t('form.create')}
        onClose={() => setDialog(null)}
        onSubmit={create}
        t={t}
        tv={tv}
      />
      <CategoryForm
        open={dialog?.kind === 'edit'}
        initial={dialog?.kind === 'edit' ? { name: dialog.row.name || '', description: dialog.row.description || '' } : { name: '', description: '' }}
        title={t('form.editTitle')}
        submitText={t('form.save')}
        onClose={() => setDialog(null)}
        onSubmit={dialog?.kind === 'edit' ? save(dialog.row) : async () => false}
        t={t}
        tv={tv}
      />

      <Modal
        open={dialog?.kind === 'view'}
        title={t('detail.title')}
        onClose={() => setDialog(null)}
        closeLabel={t('form.close')}
        footer={
          dialog?.kind === 'view' && rowActions(dialog.row, canManageProducts).includes('edit') ? (
            <>
              <button type="button" onClick={() => setDialog(null)} className={outlineBtn}>
                {t('form.close')}
              </button>
              <button type="button" onClick={() => setDialog({ kind: 'edit', row: dialog.row })} className={primaryBtn}>
                {t('edit')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setDialog(null)} className={outlineBtn}>
              {t('form.close')}
            </button>
          )
        }
      >
        {dialog?.kind === 'view' && (
          <dl className="m-0 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ar-muted">{t('form.name')}</dt>
              <dd className="m-0 flex items-center gap-2 text-[15px] font-semibold">
                {dialog.row.name}
                {defaultTag(dialog.row)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ar-muted">{t('form.description')}</dt>
              <dd className={`m-0 whitespace-pre-wrap text-[15px] ${dialog.row.description ? 'text-ar-ink-2' : 'text-ar-faint'}`}>
                {dialog.row.description || t('detail.noDescription')}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-semibold text-ar-muted">{t('cols.createdAt')}</dt>
              <dd className="m-0 text-[15px] tabular-nums text-ar-ink-2">{formatCreatedAt(dialog.row.createdAt)}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'delete'}
        title={t('confirm.deleteTitle')}
        onClose={() => (deleting ? undefined : setDialog(null))}
        closeLabel={t('form.close')}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} disabled={deleting} className={outlineBtn}>
              {t('confirm.cancel')}
            </button>
            <button type="button" onClick={remove} disabled={deleting} className={dangerBtn}>
              {deleting ? t('confirm.deleting') : t('confirm.delete')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{dialog?.kind === 'delete' ? t('confirm.deleteBody', { name: dialog.row.name }) : ''}</p>
      </Modal>
    </div>
  );
}
