'use client';

/**
 * Tile detail (#604): a right-side drawer (bottom sheet on phones) opened from `?detail=<kind>`.
 * Each body draws the breakdown the period report already returns; the rows carry every number as text.
 */
import React from 'react';
import Link from 'next/link';
import {
  collateralRows,
  outstandingSplit,
  waterfallRows,
  type CashLike,
  type CollateralKey,
  type DetailKind,
  type MoneyBreakdown,
  type Tile,
  type WaterfallKey,
} from '../overview-model';
import { Chip, hatch, TILE_LABEL, tileValue, type Money, type T } from './sections';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const rowGrid = 'grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px]';

function Track({ children }: { children: React.ReactNode }) {
  return <span className="relative block h-3 rounded bg-ar-subtle">{children}</span>;
}

const WATERFALL_LABEL: Record<WaterfallKey, string> = {
  deposits: 'home.money.deposits',
  pickupAndSale: 'home.money.pickupAndSale',
  fees: 'home.money.fees',
  refunds: 'home.money.refunds',
  collateral: 'home.money.collateralNet',
  total: 'home.money.collectedTotal',
};

function CollectedBody({ parts, t, money }: { parts: MoneyBreakdown; t: T; money: Money }) {
  const rows = waterfallRows(parts.collected);
  if (rows.length === 0) return <p className="m-0 text-sm text-ar-muted">{t('home.detail.empty')}</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const label = t(WATERFALL_LABEL[r.key]);
        // `|| 0` turns −0 (no refunds: −(0)) into 0, which showed "+-0" (#721)
        const amount = r.amount || 0;
        const value = r.total ? money(amount) : amount < 0 ? `−${money(-amount)}` : `+${money(amount)}`;
        const tone = r.total ? 'font-bold text-ar-ink' : 'text-ar-ink-2';
        const fill = r.total ? 'bg-ar-ink' : r.negative ? 'bg-ar-chart-red' : 'bg-ar-chart-blue';
        return (
          <div key={r.key} className={`${rowGrid} ${r.total ? 'border-t border-ar-line pt-2.5' : ''}`} title={`${label}: ${value}`}>
            <span className={tone}>{label}</span>
            <Track>
              <span className={`absolute inset-y-0 rounded ${fill}`} style={{ left: `${r.left}%`, width: `${r.width}%`, minWidth: r.amount ? 2 : 0 }} />
            </Track>
            <span className={`text-right tabular-nums ${tone}`}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function OutstandingBody({ parts, t, money }: { parts: MoneyBreakdown; t: T; money: Money }) {
  const split = outstandingSplit(parts.outstanding);
  if (!split) return <p className="m-0 text-sm text-ar-muted">{t('home.detail.empty')}</p>;
  const segs = [
    { key: 'atPickup', part: split.atPickup, color: 'bg-ar-chart-blue', label: t('home.money.atPickup') },
    { key: 'overdue', part: split.overdue, color: 'bg-ar-chart-amber', label: t('home.money.overduePickup') },
  ];
  const visible = segs.filter((s) => s.part.pct > 0);
  return (
    <>
      <div className="flex h-4 gap-[2px]" aria-hidden={visible.length === 0}>
        {visible.length === 0 ? (
          <span className="flex-1 rounded bg-ar-subtle" />
        ) : (
          visible.map((s, i) => (
            <span
              key={s.key}
              title={`${s.label}: ${money(s.part.amount)}`}
              className={`${s.color} ${i === 0 ? 'rounded-l' : ''} ${i === visible.length - 1 ? 'rounded-r' : ''}`}
              style={{ width: `${s.part.pct}%` }}
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-2.5 text-[13px]">
        {segs.map((s) => (
          <div key={s.key} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] ${s.color}`} />
            <span className="text-ar-ink">
              {s.label} <span className="text-ar-muted">· {t('home.money.orders', { count: s.part.orders })}</span>
            </span>
            <span className="font-semibold tabular-nums text-ar-ink">{money(s.part.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const COLLATERAL_LABEL: Record<CollateralKey, string> = {
  received: 'home.detail.received',
  returned: 'home.detail.returned',
  toCollect: 'home.detail.toCollect',
  toReturn: 'home.detail.toReturn',
};

function CollateralBody({ parts, cash, t, money }: { parts: MoneyBreakdown; cash: CashLike | null; t: T; money: Money }) {
  const rows = collateralRows(parts.collateral, cash);
  if (rows.length === 0) return <p className="m-0 text-sm text-ar-muted">{t('home.detail.empty')}</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const token = r.key === 'received' || r.key === 'toCollect' ? 'chart-green' : 'chart-violet';
        const border = token === 'chart-green' ? 'border-ar-chart-green' : 'border-ar-chart-violet';
        const label = t(COLLATERAL_LABEL[r.key]);
        const count = r.orders != null ? ` · ${t('home.money.orders', { count: r.orders })}` : '';
        return (
          <div key={r.key} className={rowGrid} title={`${label}${count}: ${money(r.amount)}`}>
            <span className={r.upcoming ? 'text-ar-ink-2' : 'text-ar-ink'}>
              {label}
              {count && <span className="text-ar-muted">{count}</span>}
            </span>
            <Track>
              <span
                className={`absolute inset-y-0 left-0 box-border rounded border-[1.5px] ${border}`}
                style={{ width: `${r.width}%`, background: r.upcoming ? hatch(token) : `rgb(var(--ar-${token}))`, minWidth: r.amount ? 3 : 0 }}
              />
            </Track>
            <span className="text-right font-semibold tabular-nums text-ar-ink">{money(r.amount)}</span>
          </div>
        );
      })}
      {rows.some((r) => r.upcoming) && <span className="text-xs text-ar-muted">{t('home.detail.hatchNote')}</span>}
    </div>
  );
}

function OrderValueBody({ tile, newOrders, t, money }: { tile: Tile; newOrders: number | null; t: T; money: Money }) {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
        <span className="text-ar-ink">
          {t('home.detail.newOrders')}
          {newOrders != null && <span className="text-ar-muted"> · {t('home.money.orders', { count: newOrders })}</span>}
        </span>
        <span className="font-semibold tabular-nums text-ar-ink">{tileValue(tile, money)}</span>
      </div>
      {tile.chip && (
        <span>
          <Chip chip={tile.chip} t={t} />
        </span>
      )}
    </div>
  );
}

export function DetailDrawer({
  kind,
  tile,
  parts,
  cash,
  newOrders,
  periodLabel,
  ordersHref,
  onClose,
  t,
  money,
}: {
  kind: DetailKind;
  tile: Tile;
  parts: MoneyBreakdown;
  cash: CashLike | null;
  newOrders: number | null;
  periodLabel: string;
  ordersHref: string;
  onClose: () => void;
  t: T;
  money: Money;
}) {
  const titleId = `detail-${kind}-title`;
  return (
    <DrawerShell
      titleId={titleId}
      onClose={onClose}
      t={t}
      header={
        <>
          <span id={titleId} className="text-sm text-ar-ink-2">
            {t(TILE_LABEL[kind])} · {periodLabel}
          </span>
          <span className="text-[30px] font-bold leading-9 tabular-nums">{tileValue(tile, money)}</span>
        </>
      }
    >
      {/* Where the number comes from, in one sentence, before its breakdown */}
      <p className="m-0 text-sm leading-relaxed text-ar-ink-2">{t(`home.detail.rule.${kind}`)}</p>
      {kind === 'collected' && <CollectedBody parts={parts} t={t} money={money} />}
      {kind === 'outstanding' && <OutstandingBody parts={parts} t={t} money={money} />}
      {kind === 'collateral' && <CollateralBody parts={parts} cash={cash} t={t} money={money} />}
      {kind === 'orderValue' && <OrderValueBody tile={tile} newOrders={newOrders} t={t} money={money} />}

      <Link href={ordersHref} className="mt-auto self-start text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
        {t('home.detail.viewOrders')}
      </Link>
    </DrawerShell>
  );
}

/** Right-side drawer (bottom sheet on phones): focus trap, Escape and backdrop close, body scroll lock. */
export function DrawerShell({
  titleId,
  header,
  onClose,
  t,
  children,
}: {
  titleId: string;
  header: React.ReactNode;
  onClose: () => void;
  t: T;
  children: React.ReactNode;
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 box-border flex max-h-[85vh] flex-col gap-[18px] overflow-y-auto rounded-t-2xl border-t border-ar-line bg-ar-surface p-6 text-ar-ink shadow-ar sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:max-w-full sm:rounded-none sm:border-l sm:border-t-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">{header}</div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('home.detail.close')}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-ar-subtle text-ar-ink hover:bg-ar-line"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
