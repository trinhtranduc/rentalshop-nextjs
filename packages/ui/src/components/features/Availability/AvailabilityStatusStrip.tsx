'use client';

import React from 'react';
import { Button } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { DerivedAvailabilityResult, AvailabilityDisplayStatus } from './types';

interface AvailabilityStatusStripProps {
  displayStatus: AvailabilityDisplayStatus;
  result: DerivedAvailabilityResult | null;
  errorKey: string | null;
  quantity: number;
  missingOutlet?: boolean;
  onRetry: () => void;
}

export const AvailabilityStatusStrip: React.FC<AvailabilityStatusStripProps> = ({
  displayStatus,
  result,
  errorKey,
  quantity,
  missingOutlet,
  onRetry,
}) => {
  const t = useAvailabilityTranslations();

  if (missingOutlet) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        {t('missingOutlet')}
      </p>
    );
  }

  if (displayStatus === 'idle') {
    return (
      <p className="text-xs text-text-secondary bg-bg-secondary/50 border border-border/60 rounded-md px-3 py-2">
        {t('idle.pickDates')}
      </p>
    );
  }

  if (displayStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary py-1">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
        {t('checking')}
      </div>
    );
  }

  if (displayStatus === 'error' || errorKey) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-0.5">
        <span className="text-sm text-red-700">{t('errors.checkFailed')}</span>
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const isAvailable = result.status === 'available' || result.status === 'warning';
  const isWarning = result.status === 'warning';

  const statusLabel =
    result.status === 'available'
      ? t('status.available')
      : result.status === 'warning'
        ? t('status.warning')
        : t('status.unavailable');

  const Icon =
    result.status === 'unavailable' ? XCircle : result.status === 'warning' ? AlertTriangle : CheckCircle2;

  const stripClass = cn(
    'rounded-lg border px-3 py-3 sm:px-4',
    isAvailable && !isWarning && 'bg-green-50/90 border-green-200',
    isWarning && 'bg-amber-50/90 border-amber-200',
    !isAvailable && 'bg-red-50/90 border-red-200'
  );

  const iconClass =
    result.status === 'unavailable'
      ? 'text-red-600'
      : result.status === 'warning'
        ? 'text-amber-600'
        : 'text-green-600';

  // Calculate booked in period (conflicts only, not renting)
  const conflictsInPeriod = result.totalConflictsFound;

  return (
    <div className={stripClass} role="status" aria-live="polite">
      <div className="flex items-start gap-2.5">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconClass)} />
        <div className="flex-1 min-w-0">
          {/* Main status line */}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold text-text-primary text-base">{statusLabel}</p>
            {isAvailable ? (
              <p className="text-sm text-text-primary">
                · {t('availableUnits', { count: result.effectivelyAvailable })}
              </p>
            ) : (
              <p className="text-sm text-red-700">
                · {t('needVsHave', { need: quantity, have: result.effectivelyAvailable })}
              </p>
            )}
          </div>

          {/* Stats: Tổng kho | Đang thuê chưa trả | Đặt trùng kỳ */}
          <p className="text-xs text-text-secondary mt-1.5">
            {t('stock.total')}: {result.totalStock}
            {result.totalRenting > 0 && (
              <span className="ml-2">
                · {t('stock.renting')}: <span className="font-medium">{result.totalRenting}</span>
              </span>
            )}
            {conflictsInPeriod > 0 && (
              <span className="ml-2">
                · {t('stock.bookedInPeriod')}: <span className="text-amber-700 font-medium">{conflictsInPeriod}</span>
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
