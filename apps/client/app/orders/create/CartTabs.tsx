'use client';

/**
 * Tab bar of the carts across the top of Tạo đơn (#1293, mockup B): avatar, name, "n món · tiền" per cart,
 * × on the one in use, "+ Giỏ mới" at the end (hidden at 10 carts). Switching asks nothing; closing always asks.
 */
import React, { useState } from 'react';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { outlineBtn, primaryBtn, type T } from '../list/parts';
import { Modal } from './parts';
import { avatarColor, avatarText, cartTitle, cartTotal, itemCountOf, type DraftCart } from './cart-store';

export const TAB_BAR_HEIGHT = 48;

export function CartTabs({
  carts,
  activeId,
  canAdd,
  disabled,
  minorUnit,
  onSwitch,
  onAdd,
  onRemove,
  t,
  money,
}: {
  carts: DraftCart[];
  activeId: string;
  canAdd: boolean;
  disabled: boolean;
  minorUnit: number;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  t: T;
  money: (n: number) => string;
}) {
  const [asking, setAsking] = useState<DraftCart | null>(null);
  const title = (c: DraftCart) => cartTitle(c, (n) => t('editor.carts.title', { n }));

  return (
    <>
      <div
        role="tablist"
        aria-label={t('editor.carts.label')}
        data-testid="cart-tabs"
        className="sticky top-0 z-20 box-border flex h-12 flex-none items-end gap-1.5 overflow-x-auto border-b border-ar-line bg-ar-subtle px-3 pt-2"
      >
        {carts.map((c) => {
          const on = c.id === activeId;
          const count = itemCountOf(c);
          return (
            <div
              key={c.id}
              data-testid="cart-tab"
              className={`relative flex h-10 flex-none items-center rounded-t-[10px] border border-b-0 ${
                on ? 'border-ar-line bg-ar-page' : 'border-transparent hover:bg-ar-surface'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={on}
                disabled={disabled}
                onClick={() => onSwitch(c.id)}
                className="flex h-full max-w-[230px] items-center gap-2 pl-3 pr-2 text-left text-sm disabled:opacity-60"
              >
                <span
                  aria-hidden="true"
                  style={{ background: avatarColor(c) }}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                >
                  {avatarText(c)}
                </span>
                <span className={`truncate font-semibold ${on ? 'text-ar-ink' : 'text-ar-ink-2'}`}>{title(c)}</span>
                <span className="flex-none whitespace-nowrap text-[12.5px] text-ar-muted">
                  {count > 0 ? t('editor.carts.summary', { count, amount: money(cartTotal(c, minorUnit)) }) : t('editor.carts.count', { count })}
                </span>
              </button>
              {on && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ar-primary" />}
              {on && (
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={t('editor.carts.close')}
                  onClick={() => setAsking(c)}
                  className="mr-1.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-ar-muted hover:bg-ar-subtle disabled:opacity-60"
                >
                  <ShellIcon d={ICONS.close} size={14} />
                </button>
              )}
            </div>
          );
        })}
        {canAdd && (
          <button
            type="button"
            disabled={disabled}
            onClick={onAdd}
            className="mb-1 flex h-8 flex-none items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-sm font-bold text-ar-primary-ink hover:bg-ar-surface disabled:opacity-60"
          >
            {t('editor.carts.new')}
          </button>
        )}
      </div>
      <Modal
        open={!!asking}
        title={t('editor.carts.deleteTitle')}
        onClose={() => setAsking(null)}
        closeLabel={t('editor.close')}
        footer={
          <>
            <button type="button" className={outlineBtn} onClick={() => setAsking(null)}>
              {t('editor.cancel')}
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                if (asking) onRemove(asking.id);
                setAsking(null);
              }}
            >
              {t('editor.carts.delete')}
            </button>
          </>
        }
      >
        {asking && <p className="m-0 text-[15px]">{t('editor.carts.deleteMessage', { name: title(asking), count: itemCountOf(asking) })}</p>}
      </Modal>
    </>
  );
}
