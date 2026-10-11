'use client';

/**
 * Pieces of the Tạo đơn screen (#523) on the shell tokens: dialogs, product card, cart line,
 * money input. Dialogs render inside the shell so they follow the light / dark theme.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { customersApi } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { formatDayLabel } from '../orders-model';
import { outlineBtn, primaryBtn, type Money, type T } from '../list/parts';
import { RangeCalendar } from '../../components/date-range/RangeCalendar';
import { checkDays, lineModes, needsPrice, quickDays, rentalDays, type CartLine, type CustomerPick, type OrderType, type Stock } from './create-model';

export const fieldClass =
  'h-11 w-full rounded-xl border border-ar-line-strong bg-ar-surface px-3 text-base text-ar-ink placeholder:text-ar-faint focus:border-ar-primary focus:outline-none';

// ----------------------------------------------------------------------------
// Modal
// ----------------------------------------------------------------------------

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel: string;
  /** Room for two calendar months side by side */
  wide?: boolean;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>('input, button:not([data-close])');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-ar-surface text-ar-ink shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-[720px]' : 'sm:max-w-[480px]'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ar-line-soft px-5 py-4">
          <h2 id={id} className="m-0 text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle"
          >
            <ShellIcon d={ICONS.close} size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ar-line-soft px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Days
// ----------------------------------------------------------------------------

export function DaysDialog({
  open,
  pickup,
  ret,
  todayKey,
  weekdays,
  maxDays,
  onApply,
  onClose,
  t,
}: {
  open: boolean;
  pickup: string;
  ret: string;
  todayKey: string;
  weekdays: string[];
  maxDays: number;
  onApply: (pickup: string, ret: string) => void;
  onClose: () => void;
  t: T;
}) {
  const [from, setFrom] = useState(pickup);
  const [to, setTo] = useState(ret);
  useEffect(() => {
    if (open) {
      setFrom(pickup);
      setTo(ret);
    }
  }, [open, pickup, ret]);
  const problem = checkDays(from, to, maxDays);
  const quick = quickDays(todayKey);
  const days = problem ? 0 : rentalDays(from, to);
  return (
    <Modal
      open={open}
      title={t('editor.days.title')}
      onClose={onClose}
      closeLabel={t('editor.close')}
      wide
      footer={
        <>
          <button type="button" className={outlineBtn} onClick={onClose}>
            {t('editor.cancel')}
          </button>
          <button type="button" className={primaryBtn} disabled={!!problem} onClick={() => onApply(from, to)}>
            {days ? t('editor.days.apply', { days }) : t('editor.days.applyEmpty')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(['today', 'tomorrow', 'weekend', 'threeDays'] as const).map((k) => {
            const on = quick[k].from === from && quick[k].to === to;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFrom(quick[k].from);
                  setTo(quick[k].to);
                }}
                className={`h-9 rounded-full px-3 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-surface' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`}
              >
                {t(`editor.days.quick.${k}`)}
              </button>
            );
          })}
        </div>
        <RangeCalendar
          from={from}
          to={to}
          todayKey={todayKey}
          hints={{ start: t('editor.days.pickPickup'), end: t('editor.days.pickReturn') }}
          onPick={(r) => {
            setFrom(r.from);
            setTo(r.to);
          }}
        />
        <p className={`m-0 text-sm ${problem && problem !== 'missing' ? 'text-ar-danger' : 'text-ar-muted'}`} role="status">
          {problem === 'reversed'
            ? t('editor.days.reversed')
            : problem === 'tooLong'
              ? t('editor.days.tooLong', { days: maxDays })
              : problem === 'missing'
                ? t('editor.days.hint')
                : t('editor.days.summary', {
                    from: formatDayLabel(from, weekdays),
                    to: formatDayLabel(to, weekdays),
                    days,
                  })}
        </p>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// Customer
// ----------------------------------------------------------------------------

interface CustomerRow {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

const nameOf = (c: CustomerRow) => [c.firstName, c.lastName].filter(Boolean).join(' ').trim();

export function CustomerDialog({
  open,
  merchantId,
  onPick,
  onClose,
  t,
}: {
  open: boolean;
  merchantId: number | null;
  onPick: (c: CustomerPick) => void;
  onClose: () => void;
  t: T;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAdding(false);
  }, [open]);

  useEffect(() => {
    if (!open || adding) return;
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      customersApi
        .getCustomersWithFilters({ search: q.trim() || undefined, isActive: true }, 1, 20)
        .then((res) => {
          if (!live) return;
          const data = res.data as { customers?: CustomerRow[] } | CustomerRow[] | undefined;
          setRows(res.success ? (Array.isArray(data) ? data : data?.customers || []) : []);
        })
        .catch(() => live && setRows([]))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, q, adding]);

  const startAdd = () => {
    const digits = q.replace(/[^\d+]/g, '');
    const looksLikePhone = digits.length >= 6 && digits.length >= q.trim().replace(/\s/g, '').length - 1;
    setName(looksLikePhone ? '' : q.trim());
    setPhone(looksLikePhone ? digits : '');
    setAdding(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await customersApi.createCustomer({
        firstName: name.trim(),
        phone: phone.trim() || undefined,
        isActive: true,
        ...(merchantId ? { merchantId } : {}),
      } as unknown as Parameters<typeof customersApi.createCustomer>[0]);
      const c = res.data as CustomerRow | undefined;
      if (res.success && c?.id)
        onPick({
          id: c.id,
          name: nameOf(c) || name.trim(),
          phone: c.phone || phone.trim(),
        });
    } catch {
      // The global handler shows the API error (for example a phone already used)
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={adding ? t('editor.customer.newTitle') : t('editor.customer.title')}
      onClose={onClose}
      closeLabel={t('editor.close')}
      footer={
        adding ? (
          <>
            <button type="button" className={outlineBtn} onClick={() => setAdding(false)}>
              {t('editor.customer.back')}
            </button>
            <button type="button" className={primaryBtn} disabled={!name.trim() || saving} onClick={save}>
              {saving ? t('editor.saving') : t('editor.customer.save')}
            </button>
          </>
        ) : undefined
      }
    >
      {adding ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm text-ar-muted">
            {t('editor.customer.name')}
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ar-muted">
            {t('editor.customer.phone')}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={fieldClass} autoComplete="off" />
          </label>
          <button type="submit" className="hidden" />
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-ar-line-strong bg-ar-surface px-3 text-ar-muted focus-within:border-ar-primary">
            <ShellIcon d={ICONS.search} size={18} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('editor.customer.search')}
              aria-label={t('editor.customer.search')}
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-ar-ink outline-none placeholder:text-ar-faint"
            />
          </label>
          <button
            type="button"
            onClick={startAdd}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-ar-line-strong px-3 text-[15px] font-semibold text-ar-primary-ink hover:bg-ar-subtle"
          >
            <ShellIcon d={ICONS.plus} size={18} />
            {q.trim() ? t('editor.customer.addNamed', { q: q.trim() }) : t('editor.customer.add')}
          </button>
          <ul className="m-0 flex list-none flex-col p-0" aria-busy={loading}>
            {rows.map((c) => (
              <li key={c.id} className="border-t border-ar-line-soft first:border-t-0">
                <button
                  type="button"
                  onClick={() => onPick({ id: c.id, name: nameOf(c), phone: c.phone || '' })}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2.5 text-left hover:bg-ar-subtle"
                >
                  <span className="text-[15px] font-semibold text-ar-ink">{nameOf(c) || c.phone || `#${c.id}`}</span>
                  {c.phone && <span className="text-sm tabular-nums text-ar-muted">{c.phone}</span>}
                </button>
              </li>
            ))}
            {!loading && rows.length === 0 && <li className="py-3 text-sm text-ar-muted">{t('editor.customer.none')}</li>}
            {loading && rows.length === 0 && <li className="py-3 text-sm text-ar-muted">{t('editor.loading')}</li>}
          </ul>
        </div>
      )}
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// Product card
// ----------------------------------------------------------------------------

export type StockView = { kind: 'stock'; stock: Stock } | { kind: 'loading' } | { kind: 'noDays' } | { kind: 'unknown' };

export function ProductCard({
  name,
  image,
  prices,
  stock,
  inCart,
  onAdd,
  t,
  money,
}: {
  name: string;
  image: string | null;
  prices: Array<{ type: string; price: number }>;
  stock: StockView;
  inCart: boolean;
  onAdd: () => void;
  t: T;
  money: Money;
}) {
  const out = stock.kind === 'stock' && stock.stock.free <= 0;
  return (
    <article
      className={`flex min-w-0 flex-col gap-2 rounded-[14px] bg-ar-surface p-2.5 ${inCart ? 'border-2 border-ar-primary p-[9px]' : 'border border-ar-line-soft'} ${out ? 'opacity-60' : ''}`}
    >
      <span className="flex h-[120px] items-center justify-center overflow-hidden rounded-[10px] bg-ar-subtle text-ar-faint">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={t('editor.grid.image', { name })} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ShellIcon d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z" size={30} />
        )}
      </span>
      <span className="line-clamp-2 text-[15px] font-semibold leading-5 text-ar-ink">{name}</span>
      <span className="text-sm tabular-nums text-ar-muted">{prices.map((p) => t(`editor.per.${p.type}`, { price: money(p.price) })).join(' · ')}</span>
      <span className="mt-auto flex items-center justify-between gap-2">
        <span className={`min-w-0 text-sm ${stock.kind === 'stock' ? (out ? 'text-ar-muted' : 'font-semibold text-ar-done') : 'text-ar-faint'}`}>
          {stock.kind === 'stock'
            ? out
              ? t('editor.grid.out')
              : t('editor.grid.left', {
                  free: stock.stock.free,
                  total: stock.stock.total,
                })
            : stock.kind === 'loading'
              ? '…'
              : stock.kind === 'noDays'
                ? t('editor.grid.pickDays')
                : ''}
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={t('editor.grid.add', { name })}
          className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${
            out ? 'border border-ar-line bg-ar-surface text-ar-muted' : 'bg-ar-primary text-ar-on-primary hover:opacity-95'
          }`}
        >
          <ShellIcon d={ICONS.plus} size={18} />
        </button>
      </span>
    </article>
  );
}

// ----------------------------------------------------------------------------
// Cart line
// ----------------------------------------------------------------------------

/** What the cart says about a line's units for the chosen days (#556). */
export type LineStatus = { kind: 'conflict' | 'short' | 'ok'; text: string } | null;

const MODE_KEYS = ['FIXED', 'DAILY', 'HOURLY'];
const modeKey = (type: string) => (MODE_KEYS.includes(type) ? type : 'OTHER');

export function CartLineRow({
  line,
  orderType,
  total,
  days,
  status,
  onQuantity,
  onMode,
  onPrice,
  onNote,
  t,
  money,
}: {
  line: CartLine;
  orderType: OrderType;
  total: number;
  days: number;
  status: LineStatus;
  onQuantity: (q: number) => void;
  onMode: (mode: string) => void;
  onPrice: (price: number) => void;
  /** #684: this line's note */
  onNote?: (note: string) => void;
  t: T;
  money: Money;
}) {
  const rent = orderType === 'RENT';
  const type = rent ? line.pricingType : 'SALE';
  const [editing, setEditing] = useState(false);
  const [noting, setNoting] = useState(false);
  const panelId = useId();
  const notePanelId = useId();
  const note = (line.notes || '').trim();
  const missingPrice = needsPrice(line, orderType);
  const chip = missingPrice
    ? t('editor.pricing.chipEmpty', { mode: t(`editor.pricing.mode.${modeKey(type)}`, { type }) })
    : t(`editor.option.${['DAILY', 'HOURLY', 'FIXED', 'SALE'].includes(type) ? type : 'FIXED'}`, { price: money(line.unitPrice) });
  return (
    <div className="flex flex-col gap-2 border-t border-ar-line-soft py-3">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-ar-ink">{line.name}</span>
        <span className="text-[15px] font-bold tabular-nums text-ar-ink">{money(total)}</span>
      </div>
      <div className="flex items-center gap-2">
        {rent ? (
          <button
            type="button"
            aria-expanded={editing}
            aria-controls={panelId}
            onClick={() => setEditing((v) => !v)}
            aria-label={t('editor.cart.priceFor', { name: line.name })}
            className={`flex h-9 min-w-0 flex-1 items-center justify-between gap-1 rounded-[10px] border px-2.5 text-left text-sm ${
              missingPrice ? 'border-ar-danger text-ar-danger' : 'border-ar-line-strong text-ar-ink'
            } bg-ar-surface hover:bg-ar-subtle`}
          >
            <span className="truncate">{chip}</span>
            <ShellIcon d={editing ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} size={16} />
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-ar-muted">{t('editor.option.SALE', { price: money(line.unitPrice) })}</span>
        )}
        <div className="flex h-9 flex-none items-center rounded-[10px] border border-ar-line-strong">
          <button
            type="button"
            onClick={() => onQuantity(line.quantity - 1)}
            aria-label={t('editor.cart.less', { name: line.name })}
            className="h-[34px] w-[34px] text-lg text-ar-ink hover:bg-ar-subtle"
          >
            −
          </button>
          <span className="min-w-[22px] text-center text-[15px] font-semibold tabular-nums">{line.quantity}</span>
          <button
            type="button"
            onClick={() => onQuantity(line.quantity + 1)}
            aria-label={t('editor.cart.more', { name: line.name })}
            className="h-[34px] w-[34px] text-lg text-ar-ink hover:bg-ar-subtle"
          >
            +
          </button>
        </div>
      </div>
      {/* #684: the line's own note, in its own panel (mobile: the "Ghi chú món" sheet) */}
      {onNote && !noting &&
        (note ? (
          <button
            type="button"
            onClick={() => setNoting(true)}
            aria-expanded={false}
            aria-controls={notePanelId}
            aria-label={t('editor.lineNote.for', { name: line.name })}
            className="line-clamp-2 rounded-[10px] bg-ar-subtle px-2.5 py-2 text-left text-sm text-ar-ink-2 hover:bg-ar-line-soft"
          >
            <span className="font-semibold text-ar-muted">{t('editor.lineNote.label')}</span> · {note}{' '}
            <span className="font-semibold text-ar-primary">{t('editor.lineNote.edit')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setNoting(true)}
            aria-expanded={false}
            aria-controls={notePanelId}
            aria-label={t('editor.lineNote.for', { name: line.name })}
            className="self-start text-sm font-semibold text-ar-muted hover:text-ar-ink"
          >
            {t('editor.lineNote.add')}
          </button>
        ))}
      {onNote && noting && (
        <div id={notePanelId} className="flex flex-col gap-2 rounded-xl bg-ar-subtle p-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ar-ink">
            {t('editor.lineNote.title')}
            <textarea
              autoFocus
              rows={3}
              defaultValue={line.notes || ''}
              onBlur={(e) => onNote(e.target.value)}
              onChange={(e) => onNote(e.target.value)}
              placeholder={t('editor.lineNote.placeholder')}
              className="w-full resize-y rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 py-2 text-[15px] font-normal text-ar-ink outline-none focus:border-ar-primary"
            />
          </label>
          <span className="text-xs text-ar-muted">{t('editor.lineNote.hint')}</span>
          <div className="flex justify-end gap-2">
            {note && (
              <button type="button" onClick={() => { onNote(''); setNoting(false); }} className={`${outlineBtn} text-ar-danger`}>
                {t('editor.lineNote.clear')}
              </button>
            )}
            <button type="button" onClick={() => setNoting(false)} className={outlineBtn}>
              {t('editor.lineNote.done')}
            </button>
          </div>
        </div>
      )}
      {rent && editing && (
        <div id={panelId} className="flex flex-col gap-2.5 rounded-xl bg-ar-subtle p-3">
          <span className="text-sm font-semibold text-ar-ink">{t('editor.pricing.title')}</span>
          <div role="radiogroup" aria-label={t('editor.pricing.title')} className="flex rounded-[10px] bg-ar-surface p-0.5">
            {lineModes(line).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={type === m}
                onClick={() => onMode(m)}
                className={`h-9 min-w-0 flex-1 truncate rounded-[8px] px-2 text-sm ${
                  type === m ? 'bg-ar-primary-soft font-bold text-ar-primary-ink' : 'font-medium text-ar-muted hover:text-ar-ink'
                }`}
              >
                {t(`editor.pricing.mode.${modeKey(m)}`, { type: m })}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm text-ar-muted">
            {t('editor.pricing.price')}
            <MoneyInput
              value={line.unitPrice}
              onChange={onPrice}
              label={t('editor.pricing.priceFor', { name: line.name })}
              suffix={t(`editor.pricing.unit.${modeKey(type)}`)}
              className={missingPrice ? '[&_input]:border-ar-danger' : ''}
            />
          </label>
          <span className="text-xs text-ar-muted">{t('editor.pricing.note')}</span>
          <button type="button" onClick={() => setEditing(false)} className={`${outlineBtn} self-end`}>
            {t('editor.pricing.done')}
          </button>
        </div>
      )}
      {rent && type === 'DAILY' && days > 1 && !missingPrice && (
        <span className="text-xs tabular-nums text-ar-muted">
          {t('editor.cart.perDayTimes', {
            price: money(line.unitPrice),
            qty: line.quantity,
            days,
          })}
        </span>
      )}
      {status && (
        <span
          role="status"
          className={
            status.kind === 'ok'
              ? 'text-sm text-ar-done'
              : status.kind === 'conflict'
                ? 'w-fit rounded-md bg-ar-danger-soft px-2 py-0.5 text-sm font-semibold text-ar-danger'
                : 'text-sm text-ar-danger'
          }
        >
          {status.text}
        </span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Money input: digits only, shown with thousands dots
// ----------------------------------------------------------------------------

const group = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function MoneyInput({
  value,
  onChange,
  label,
  className = '',
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  className?: string;
  suffix?: string;
}) {
  return (
    <span className={`relative block ${className}`}>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value ? group(value) : ''}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        className={`${fieldClass} tabular-nums ${suffix ? (suffix.length > 2 ? 'pr-20' : 'pr-9') : ''}`}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ar-muted">{suffix}</span>}
    </span>
  );
}
