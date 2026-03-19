'use client';

import React, { useState } from 'react';
import { Button, useToast } from '@rentalshop/ui';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SepaySubscriptionTransferQrResponse } from '@rentalshop/utils';

export interface SePayVietQrPanelProps {
  loading: boolean;
  errorMessage: string | null;
  data: SepaySubscriptionTransferQrResponse | null;
  usdVndRate: number;
  planCurrency: string | undefined;
  showUsdConvertNote: boolean;
  onSubmitProof?: () => void;
}

export function SePayVietQrPanel({
  loading,
  errorMessage,
  data,
  usdVndRate,
  planCurrency,
  showUsdConvertNote,
  onSubmitProof,
}: SePayVietQrPanelProps) {
  const t = useTranslations('subscription.sepayVietQr');
  const { toastSuccess } = useToast();
  const [copiedField, setCopiedField] = useState<'content' | 'amount' | null>(null);

  const copyText = async (text: string, field: 'content' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toastSuccess(t('copiedTitle'), t('copiedBody'));
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard may be denied — ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        {t('loading')}
      </div>
    );
  }

  if (errorMessage) {
    return <p className="text-sm text-destructive py-2">{errorMessage}</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showUsdConvertNote && planCurrency?.toUpperCase() !== 'VND' && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          {t('usdConvertNote', { rate: usdVndRate })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
      <div className="flex justify-center rounded-lg border bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- external dynamic VietQR URL from SePay */}
        <img
          src={data.qrImageUrl}
          alt=""
          className="max-w-[220px] w-full h-auto"
          loading="lazy"
        />
      </div>
      <div className="grid gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">{t('amountVnd')}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono font-semibold">{data.amountVnd.toLocaleString('vi-VN')} ₫</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyText(String(data.amountVnd), 'amount')}
            >
              {copiedField === 'amount' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{t('copyAmount')}</span>
            </Button>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t('bank')}</p>
          <p className="font-medium">{data.bankName}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{t('account')}</p>
          <p className="font-mono font-medium">{data.accountNumber}</p>
        </div>
        {data.accountHolderName ? (
          <div>
            <p className="text-muted-foreground text-xs">{t('accountName')}</p>
            <p className="font-medium">{data.accountHolderName}</p>
          </div>
        ) : null}
        <div>
          <p className="text-muted-foreground text-xs">{t('transferContent')}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono text-xs break-all">{data.transferContent}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyText(data.transferContent, 'content')}
            >
              {copiedField === 'content' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{t('copyContent')}</span>
            </Button>
          </div>
        </div>
      </div>
      {onSubmitProof ? (
        <Button type="button" variant="secondary" className="w-full" onClick={onSubmitProof}>
          {t('openSubmitProof')}
        </Button>
      ) : null}
    </div>
  );
}
