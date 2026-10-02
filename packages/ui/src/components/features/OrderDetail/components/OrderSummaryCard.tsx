import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../ui';
import { DollarSign, QrCode } from 'lucide-react';
import { useOrderTranslations, useAuth } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import { bankAccountsApi } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';
// @ts-ignore - TypeScript may not recognize the export yet
import type { BankAccountReference } from '@rentalshop/types';
import { PaymentQRCodeDialog } from './PaymentQRCodeDialog';
import { computeOrderMoney } from '../order-money';

interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  collateralImageUrl?: string;
  notes: string;
}

interface OrderSummaryCardProps {
  order: OrderWithDetails;
  tempSettings: SettingsForm;
  calculateCollectionTotal: (order: OrderWithDetails, settings: SettingsForm) => number;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ 
  order, 
  tempSettings,
}) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const { user } = useAuth();
  const [showQRCode, setShowQRCode] = useState(false);
  const [defaultBankAccount, setDefaultBankAccount] = useState<BankAccountReference | null>(null);
  const [loadingBankAccount, setLoadingBankAccount] = useState(false);

  // Get default bank account from order.outlet or user.outlet or fetch from API
  useEffect(() => {
    const fetchDefaultBankAccount = async () => {
      // First try to get from order.outlet
      const outletWithBank = order.outlet as any;
      if (outletWithBank?.defaultBankAccount) {
        setDefaultBankAccount(outletWithBank.defaultBankAccount);
        return;
      }

      // Then try to get from user.outlet
      const userOutletWithBank = user?.outlet as any;
      if (userOutletWithBank?.defaultBankAccount) {
        setDefaultBankAccount(userOutletWithBank.defaultBankAccount);
        return;
      }

      // Finally, fetch from API if we have outletId and merchantId
      // merchantId can come from: order.merchant?.id, order.outlet?.merchant?.id, or user.merchantId
      const merchantId = (order as any).merchant?.id 
        || (order.outlet as any)?.merchant?.id 
        || (order as any).merchantId
        || user?.merchant?.id 
        || (user as any)?.merchantId;

      if (order.outletId && merchantId) {
        try {
          setLoadingBankAccount(true);
          const response = await bankAccountsApi.getBankAccounts(
            merchantId,
            order.outletId
          );
          
          if (response.success && response.data) {
            // Find default bank account
            const defaultAccount = response.data.find(acc => acc.isDefault && acc.isActive);
            if (defaultAccount) {
              setDefaultBankAccount({
                id: defaultAccount.id,
                accountHolderName: defaultAccount.accountHolderName,
                accountNumber: defaultAccount.accountNumber,
                bankName: defaultAccount.bankName,
                bankCode: defaultAccount.bankCode,
                branch: defaultAccount.branch,
                isDefault: defaultAccount.isDefault,
                qrCode: defaultAccount.qrCode,
                notes: defaultAccount.notes,
                isActive: defaultAccount.isActive,
                outletId: defaultAccount.outletId,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching default bank account:', error);
        } finally {
          setLoadingBankAccount(false);
        }
      }
    };

    fetchDefaultBankAccount();
  }, [(order.outlet as any)?.defaultBankAccount, order.outletId, (order.outlet as any)?.merchant?.id, (order as any).merchant?.id, user?.merchant?.id, (user?.outlet as any)?.defaultBankAccount]);
  
  // Calculate amount to collect from customer for QR code
  // This should match the "Collection Amount" logic displayed in the UI
  // Note: QR code will always be shown if there's a bank account, but amount is only included if > 0
  // QR amount: what is collected at this stage (refunds have no QR amount)
  const amountToPay = React.useMemo(() => Math.max(0, computeOrderMoney(order as any, tempSettings).collect), [order, tempSettings]);

  const money = computeOrderMoney(order as any, tempSettings);
  const stageKey =
    money.stage === 'return' ? (money.collect < 0 ? 'refundAtReturn' : 'collectAtReturn') : money.stage;
  const collateralLabel =
    tempSettings.collateralType && tempSettings.collateralType !== 'Other'
      ? tempSettings.collateralType
      : tempSettings.collateralDetails || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {t('detail.orderSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Money as a receipt, then what to collect at this stage (same rules as iOS and Android) */}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">{order.orderType === 'RENT' ? t('form.summary.rentTotal') : t('form.summary.saleTotal')}</dt>
            <dd className="font-medium tabular-nums">{formatMoney(money.subtotal)}</dd>
          </div>
          {money.discount > 0 && (
            <div className="flex justify-between gap-3 text-green-800">
              <dt>
                {t('summary.discount')}
                {(order as any).discountType === 'percentage' && (order as any).discountValue ? ` (${(order as any).discountValue}%)` : ''}
              </dt>
              <dd className="font-medium tabular-nums">−{formatMoney(money.discount)}</dd>
            </div>
          )}
          {money.loyaltyDiscount > 0 && (
            <div className="flex justify-between gap-3 text-green-800">
              <dt>{t('receipt.loyaltyDiscount')}</dt>
              <dd className="font-medium tabular-nums">−{formatMoney(money.loyaltyDiscount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2">
            <dt className="font-semibold text-slate-900">{t('form.summary.orderTotal')}</dt>
            <dd className="text-lg font-bold tabular-nums text-slate-900">{formatMoney(money.total)}</dd>
          </div>
        </dl>

        <div className={`rounded-lg px-3 py-2.5 ${money.stage === 'done' ? 'bg-slate-50' : 'bg-blue-50'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-sm font-semibold ${money.stage === 'done' ? 'text-slate-700' : 'text-blue-900'}`}>
              {t(`detailMoney.stage.${stageKey}`)}
            </span>
            {money.stage !== 'done' && (
              <span className="text-xl font-bold tabular-nums text-blue-900">{formatMoney(Math.abs(money.collect))}</span>
            )}
          </div>
          {money.stage !== 'done' && (
            <dl className="mt-1.5 space-y-0.5 text-xs text-slate-700">
              {money.stage === 'pickup' && (
                <>
                  <div className="flex justify-between"><dt>{t('form.summary.orderTotal')}</dt><dd className="tabular-nums">{formatMoney(money.total)}</dd></div>
                  {money.deposit > 0 && (
                    <div className="flex justify-between"><dt>{t('detailMoney.depositPaid')}</dt><dd className="tabular-nums">−{formatMoney(money.deposit)}</dd></div>
                  )}
                  {money.securityDeposit > 0 && (
                    <div className="flex justify-between"><dt>{t('detailMoney.securityDeposit')}</dt><dd className="tabular-nums">+{formatMoney(money.securityDeposit)}</dd></div>
                  )}
                </>
              )}
              {money.stage === 'return' && (
                <>
                  {money.damageFee > 0 && (
                    <div className="flex justify-between"><dt>{t('detailMoney.damageFee')}</dt><dd className="tabular-nums">+{formatMoney(money.damageFee)}</dd></div>
                  )}
                  {money.lateFee > 0 && (
                    <div className="flex justify-between"><dt>{t('detailMoney.lateFee')}</dt><dd className="tabular-nums">+{formatMoney(money.lateFee)}</dd></div>
                  )}
                  {money.securityDeposit > 0 && (
                    <div className="flex justify-between"><dt>{t('detailMoney.securityBack')}</dt><dd className="tabular-nums">−{formatMoney(money.securityDeposit)}</dd></div>
                  )}
                </>
              )}
              {collateralLabel && (money.stage === 'pickup' || money.stage === 'return') && (
                <div className="flex justify-between">
                  <dt>{money.stage === 'pickup' ? t('detailMoney.holdCollateral') : t('detailMoney.returnCollateral')}</dt>
                  <dd>{collateralLabel}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Show QR Code Button - Always show if bank account exists */}
        {defaultBankAccount && (
          <div className="pt-3 border-t border-gray-200">
            <Button
              onClick={() => setShowQRCode(true)}
              className="w-full"
              variant="outline"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {t('payment.showQRCode')}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Payment QR Code Dialog */}
      {defaultBankAccount && (
        <PaymentQRCodeDialog
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          bankAccount={defaultBankAccount}
          amount={amountToPay}
          orderNumber={order.orderNumber}
          orderType={order.orderType}
          orderStatus={order.status}
          tempSettings={tempSettings}
          depositAmount={order.depositAmount}
        />
      )}
    </Card>
  );
};

