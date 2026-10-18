'use client';

import React from 'react';
import { useVisualViewportVars } from './visual-viewport';

interface ResponsiveDialogFooterProps {
  /** Cancel / secondary button (rendered first). */
  secondary: React.ReactNode;
  /** Primary action button (rendered last, full width on a phone). */
  primary: React.ReactNode;
  /** Optional summary on a phone: label on the left, amount on the right. Hidden from 768 px. */
  summaryLabel?: React.ReactNode;
  summaryAmount?: React.ReactNode;
  /** Short line on a phone saying why the primary button is disabled (#1050). Hidden from 768 px. */
  hint?: React.ReactNode;
  /** Extra classes for the footer (use `md:` prefixes to keep the old desktop look, e.g. `md:border-t md:pt-4`). */
  className?: string;
}

/**
 * Footer for the subscription dialogs.
 * Below 768 px: sticky at the bottom of the dialog, border-top, safe-area padding, optional summary, buttons in a row
 * (primary takes the free width, 44 px high). From 768 px: the old footer, buttons in a right-aligned row.
 * While mounted it keeps --ar-vvh / --ar-vvt in step with the visible viewport, so a phone dialog sized with
 * them keeps this footer above the on-screen keyboard (#1050).
 */
export function ResponsiveDialogFooter({
  secondary,
  primary,
  summaryLabel,
  summaryAmount,
  hint,
  className = '',
}: ResponsiveDialogFooterProps) {
  useVisualViewportVars();
  const hasSummary = summaryAmount !== undefined && summaryAmount !== null && summaryAmount !== '';
  return (
    <div
      className={[
        'shrink-0',
        'max-md:sticky max-md:bottom-0 max-md:z-10 max-md:border-t max-md:bg-bg-card max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'md:flex md:flex-row md:justify-end md:gap-2',
        className,
      ].join(' ')}
    >
      {hasSummary && (
        <div className="mb-2 flex items-baseline justify-between gap-3 md:hidden" data-testid="dialog-footer-summary">
          <span className="text-sm text-gray-600">{summaryLabel}</span>
          <span className="text-lg font-bold text-gray-900">{summaryAmount}</span>
        </div>
      )}
      {hint && (
        <p className="mb-2 text-xs text-amber-700 md:hidden" data-testid="dialog-footer-hint">
          {hint}
        </p>
      )}
      <div className="flex gap-2 md:contents max-md:[&_button]:min-h-11 max-md:[&>button:last-child]:flex-1">
        {secondary}
        {primary}
      </div>
    </div>
  );
}

/** Small "Details" switch for a phone; the caller hides the long lines with `max-md:hidden` while it is closed. */
export function DetailsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex items-center text-xs font-medium text-action-primary underline md:hidden max-md:min-h-11"
    >
      Details
    </button>
  );
}
