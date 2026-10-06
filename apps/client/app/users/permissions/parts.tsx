'use client';

/**
 * Shared bits of Phân quyền and Quyền theo vai trò (#542) on the shell tokens.
 */
import React from 'react';
import Link from 'next/link';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { cardClass } from '../../orders/list/parts';

export const pageClass = 'mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8';
export const smallBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-ar-line-strong bg-ar-surface px-3 text-sm font-semibold text-ar-ink no-underline hover:bg-ar-subtle disabled:opacity-50';

/** Back link to Nhân viên, title, one-line hint, and an action on the right. */
export function PageHead({ back, title, hint, action }: { back: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Link href="/users" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {back}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-2xl font-bold">{title}</h1>
          {hint && <p className="m-0 text-[15px] text-ar-muted">{hint}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function NoAccess({ title, text }: { title: string; text: string }) {
  return (
    <div className={pageClass}>
      <h1 className="m-0 text-2xl font-bold">{title}</h1>
      <p className={`${cardClass} m-0 px-5 py-6 text-[15px] text-ar-muted`}>{text}</p>
    </div>
  );
}

/** On / off switch (button role="switch"), drawn on the shell tokens. */
export function Switch({
  checked,
  onChange,
  disabled,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-ar-primary' : 'bg-ar-line-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}
