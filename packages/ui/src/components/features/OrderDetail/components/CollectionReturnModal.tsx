import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  useFormatCurrency,
} from '@rentalshop/ui';
import { Package, RotateCcw } from 'lucide-react';
import { OrderWithDetails } from '@rentalshop/types';
import { useOrderTranslations } from '@rentalshop/hooks';
import { computeOrderMoney } from '../order-money';
import { collateralKey } from '../collateral';

interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  collateralImageUrl?: string;
  notes: string;
}

interface CollectionReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithDetails;
  settingsForm: SettingsForm;
  mode: 'collection' | 'return';
  onConfirmPickup?: () => void | Promise<void>;
  /** Called with the damage fee entered in the dialog */
  onConfirmReturn?: (overrides?: { damageFee?: number }) => void | Promise<void>;
}

/**
 * Hand-over and take-back dialog. Same money rules as the order page (computeOrderMoney):
 * pickup = total − deposit paid + security deposit; return = damage + late fee − security deposit.
 * The damage fee is entered here, when the item is back and its state is known.
 */
export const CollectionReturnModal: React.FC<CollectionReturnModalProps> = ({
  isOpen,
  onClose,
  order,
  settingsForm,
  mode,
  onConfirmPickup,
  onConfirmReturn,
}) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const isPickup = mode === 'collection';
  const [damageFee, setDamageFee] = useState<number>(settingsForm.damageFee || 0);
  const [damageText, setDamageText] = useState<string>(settingsForm.damageFee ? String(settingsForm.damageFee) : '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDamageFee(settingsForm.damageFee || 0);
      setDamageText(settingsForm.damageFee ? String(settingsForm.damageFee) : '');
    }
  }, [isOpen, settingsForm.damageFee]);

  const money = computeOrderMoney(order as any, { ...settingsForm, damageFee });
  const customer = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ').trim() || (order as any).customerName || '';
  const code = collateralKey(settingsForm.collateralType);
  // Details that only repeat the type ("ID Card" next to ID_CARD) are not shown twice
  const details = collateralKey(settingsForm.collateralDetails) === code ? '' : settingsForm.collateralDetails || '';
  const papers = [code && code !== 'OTHER' ? t(`detailSettings.collateral.${code}`) : '', details]
    .filter(Boolean)
    .join(' · ');

  const resultLabel = isPickup
    ? t('dialogs.handover.collect')
    : money.collect > 0
    ? t('dialogs.takeBack.collectMore')
    : money.collect < 0
    ? t('dialogs.takeBack.refund')
    : t('dialogs.takeBack.nothing');

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      if (isPickup) await onConfirmPickup?.();
      else await onConfirmReturn?.({ damageFee });
      onClose();
    } catch (error) {
      // The parent shows the error toast
      console.error('Error in modal confirmation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const row = (label: React.ReactNode, value: React.ReactNode, tone = 'text-slate-900') => (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`font-medium tabular-nums ${tone}`}>{value}</dd>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isPickup ? <Package className="h-5 w-5 text-blue-700" aria-hidden="true" /> : <RotateCcw className="h-5 w-5 text-blue-700" aria-hidden="true" />}
            {isPickup ? t('dialogs.handover.title') : t('dialogs.takeBack.title')}
          </DialogTitle>
          <p className="text-sm text-slate-600">
            #{order.orderNumber}
            {customer && ` · ${customer}`}
            {' · '}
            {t(`detailHeader.status.${order.status}`)}
          </p>
        </DialogHeader>

        <dl className="divide-y divide-slate-100 text-sm">
          {isPickup ? (
            <>
              {row(t('form.summary.orderTotal'), formatMoney(money.total))}
              {money.deposit > 0 && row(t('detailMoney.depositPaid'), `−${formatMoney(money.deposit)}`)}
              {money.securityDeposit > 0 && row(t('detailMoney.securityDeposit'), `+${formatMoney(money.securityDeposit)}`)}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt>
                  <label htmlFor="return-damage-fee" className="text-slate-600">
                    {t('detailMoney.damageFee')}
                  </label>
                </dt>
                <dd>
                  <Input
                    id="return-damage-fee"
                    inputMode="decimal"
                    value={damageText}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, '');
                      setDamageText(raw);
                      setDamageFee(Math.max(0, parseFloat(raw) || 0));
                    }}
                    className="h-9 w-32 text-right tabular-nums"
                  />
                </dd>
              </div>
              {money.lateFee > 0 && row(t('detailMoney.lateFee'), `+${formatMoney(money.lateFee)}`)}
              {money.securityDeposit > 0 && row(t('detailMoney.securityBack'), formatMoney(money.securityDeposit))}
            </>
          )}
        </dl>

        {/* The answer: how much changes hands, and which papers */}
        <div className={`rounded-lg px-4 py-3 ${money.collect < 0 ? 'bg-green-50' : 'bg-blue-50'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-sm font-semibold ${money.collect < 0 ? 'text-green-900' : 'text-blue-900'}`}>{resultLabel}</span>
            <span className={`text-2xl font-bold tabular-nums ${money.collect < 0 ? 'text-green-800' : 'text-blue-900'}`}>
              {formatMoney(Math.abs(money.collect))}
            </span>
          </div>
          {papers && (
            <p className="mt-1 text-sm text-slate-700">
              {isPickup ? t('detailMoney.holdCollateral') : t('detailMoney.returnCollateral')}: <span className="font-medium">{papers}</span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t('detail.close')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting} className="font-semibold">
            {isPickup ? t('dialogs.handover.confirm') : t('dialogs.takeBack.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
