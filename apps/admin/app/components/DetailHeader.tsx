'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export type DetailStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface DetailHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Portal-style back link above the title. */
  backHref?: string;
  backLabel?: string;
  /** Status pill next to the title. */
  status?: React.ReactNode;
  statusTone?: DetailStatusTone;
  /** Action buttons; they wrap on a phone and keep 44px targets. */
  actions?: React.ReactNode;
}

/** Admin detail header in the shop portal style (#806). Presentation only. */
export function DetailHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  status,
  statusTone = 'neutral',
  actions,
}: DetailHeaderProps) {
  return (
    <header className="ar-detail-header">
      {backHref && (
        <Link href={backHref} className="ar-detail-back">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
      )}
      <div className="ar-detail-header-row">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ar-detail-title">{title}</h1>
            {status && <span className={`ar-pill ar-pill-${statusTone}`}>{status}</span>}
          </div>
          {subtitle && <p className="ar-detail-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ar-detail-actions flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export default DetailHeader;
