'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import {
  Card,
  CardContent,
  Button,
} from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, PackageSearch } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { formatAvailabilityDate } from './utils';
import type { DerivedAvailabilityResult } from './types';
import type { AvailabilityDisplayStatus } from './types';

interface AvailabilityResultPanelProps {
  displayStatus: AvailabilityDisplayStatus;
  result: DerivedAvailabilityResult | null;
  errorKey: string | null;
  productName?: string;
  pickup: string;
  returnDate: string;
  quantity: number;
  missingOutlet: boolean;
  onRetry: () => void;
  onAddToOrder?: () => void;
}

export const AvailabilityResultPanel: React.FC<AvailabilityResultPanelProps> = ({
  displayStatus,
  result,
  errorKey,
  productName,
  pickup,
  returnDate,
  quantity,
  missingOutlet,
  onRetry,
  onAddToOrder,
}) => {
  const t = useAvailabilityTranslations();
  const locale = useLocale();

  const pickupLabel = formatAvailabilityDate(pickup, locale);
  const returnLabel = formatAvailabilityDate(returnDate, locale);
  const periodLabel = pickup && returnDate ? t('periodRange', { pickup: pickupLabel, return: returnLabel }) : '';

  if (missingOutlet) {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardContent className="py-12 text-center text-text-secondary">
          <PackageSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('missingOutlet')}</p>
        </CardContent>
      </Card>
    );
  }

  if (displayStatus === 'idle') {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardContent className="py-12 text-center">
          <PackageSearch className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
          <p className="font-medium text-text-primary">{t('idle.title')}</p>
          <p className="text-sm text-text-secondary mt-1">{t('idle.description')}</p>
        </CardContent>
      </Card>
    );
  }

  if (displayStatus === 'loading') {
    return (
      <Card className="lg:sticky lg:top-4">
        <CardContent className="py-12 flex flex-col items-center justify-center text-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-600" />
          <p>{t('checking')}</p>
        </CardContent>
      </Card>
    );
  }

  if (displayStatus === 'error' || errorKey) {
    return (
      <Card className="lg:sticky lg:top-4 border-red-200">
        <CardContent className="py-10 text-center">
          <XCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="text-red-700 font-medium">{t('errors.checkFailed')}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const isAvailable = result.status === 'available' || result.status === 'warning';
  const isWarning = result.status === 'warning';

  const heroClass = cn(
    'rounded-xl p-6 text-center',
    isAvailable && !isWarning && 'bg-green-50 border border-green-200',
    isWarning && 'bg-amber-50 border border-amber-200',
    !isAvailable && 'bg-red-50 border border-red-200'
  );

  const statusLabel =
    result.status === 'available'
      ? t('status.available')
      : result.status === 'warning'
        ? t('status.warning')
        : t('status.unavailable');

  const Icon =
    result.status === 'unavailable'
      ? XCircle
      : result.status === 'warning'
        ? AlertTriangle
        : CheckCircle2;

  const iconClass =
    result.status === 'unavailable'
      ? 'text-red-600'
      : result.status === 'warning'
        ? 'text-amber-600'
        : 'text-green-600';

  return (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="p-6">
        <div className={heroClass} role="status" aria-live="polite">
          <Icon className={cn('w-12 h-12 mx-auto mb-3', iconClass)} />
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{statusLabel}</h2>
          {isAvailable ? (
            <p className="mt-2 text-lg text-text-primary">
              {t('availableUnits', { count: result.effectivelyAvailable })}
            </p>
          ) : (
            <p className="mt-2 text-lg text-red-700">
              {t('needVsHave', { need: quantity, have: result.effectivelyAvailable })}
            </p>
          )}
          {periodLabel && (
            <p className="mt-1 text-sm text-text-secondary">{periodLabel}</p>
          )}
          {productName && (
            <p className="mt-2 text-sm font-medium text-text-primary truncate">{productName}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span>
            <span className="font-medium text-text-primary">{t('stock.total')}:</span>{' '}
            {result.totalStock}
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="font-medium text-text-primary">{t('stock.renting')}:</span>{' '}
            {result.totalRenting}
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="font-medium text-text-primary">{t('stock.freeInPeriod')}:</span>{' '}
            <span className={result.effectivelyAvailable > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {result.effectivelyAvailable}
            </span>
          </span>
        </div>

        {result.totalConflictsFound > 0 && (
          <p className="mt-3 text-center text-sm text-amber-700">
            {t('conflictsCount', { count: result.totalConflictsFound })}
          </p>
        )}

        {onAddToOrder && isAvailable && (
          <div className="mt-6 flex justify-center">
            <Button type="button" onClick={onAddToOrder}>
              {t('actions.addToOrder')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
