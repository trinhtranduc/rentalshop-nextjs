'use client';

import React from 'react';
import { Button } from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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

  const Icon =
    result.status === 'unavailable' ? XCircle : CheckCircle2;

  const stripClass = cn(
    'rounded-lg border px-4 py-3',
    isAvailable && 'bg-green-50/90 border-green-200',
    !isAvailable && 'bg-red-50/90 border-red-200'
  );

  const iconClass = isAvailable ? 'text-green-600' : 'text-red-600';

  const conflictsInPeriod = result.totalConflictsFound;

  return (
    <div className={stripClass} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className={cn('w-6 h-6 shrink-0 mt-0.5', iconClass)} />
        <div className="flex-1 min-w-0">
          {/* Main result: big number */}
          {isAvailable ? (
            <p className="text-lg font-bold text-text-primary">
              {t('result.canRent', { count: result.effectivelyAvailable })}
            </p>
          ) : (
            <p className="text-lg font-bold text-red-700">
              {t('result.cannotRent')}
            </p>
          )}

          {/* Stock breakdown with highlighted numbers */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm">
            <span className="text-text-secondary">
              {t('stock.total')}: <span className="font-semibold text-text-primary">{result.totalStock}</span>
            </span>
            {result.totalRenting > 0 && (
              <span className="text-text-secondary">
                {t('stock.renting')}: <span className="font-semibold text-orange-600">{result.totalRenting}</span>
              </span>
            )}
            {conflictsInPeriod > 0 && (
              <span className="text-text-secondary">
                {t('stock.bookedInPeriod')}: <span className="font-semibold text-amber-700">{conflictsInPeriod}</span>
              </span>
            )}
          </div>

          {/* Insufficient stock message */}
          {!isAvailable && (
            <p className="text-sm text-red-600 mt-1.5">
              {t('result.insufficient', { need: quantity, have: result.effectivelyAvailable })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
