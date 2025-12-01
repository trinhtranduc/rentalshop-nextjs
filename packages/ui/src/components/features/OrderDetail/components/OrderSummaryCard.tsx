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

interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
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
  calculateCollectionTotal 
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
      if (order.outletId && order.merchant?.id) {
        try {
          setLoadingBankAccount(true);
          const response = await bankAccountsApi.getBankAccounts(
            order.merchant.id,
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
  }, [(order.outlet as any)?.defaultBankAccount, order.outletId, order.merchant?.id, (user?.outlet as any)?.defaultBankAccount]);
  
  // Calculate amount to collect from customer for QR code
  // This should match the "Collection Amount" logic displayed in the UI
  const amountToPay = React.useMemo(() => {
    // For SALE orders: always collect total amount (if not yet paid)
    if (order.orderType === 'SALE') {
      return order.totalAmount;
    }
    
    // For RENT orders: only collect when status is RESERVED (before pickup)
    // Collection amount = remaining amount + security deposit
    if (order.orderType === 'RENT' && order.status === 'RESERVED') {
      return calculateCollectionTotal(order, tempSettings);
    }
    
    // For other RENT statuses (PICKUPED, RETURNED, etc.): no collection needed
    // Return 0 so QR code won't be shown
    return 0;
  }, [order.orderType, order.status, order.totalAmount, tempSettings, calculateCollectionTotal]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {t('detail.orderSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('amount.subtotal')}:</span>
          <span className="font-medium">{formatMoney(order.totalAmount || 0)}</span>
        </div>

        {/* Discount Display */}
        {(order as any).discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>
              {t('payment.discount')} {(order as any).discountType === 'percentage' && (order as any).discountValue 
                ? `(${(order as any).discountValue}%)` 
                : '(amount)'}:
            </span>
            <span className="font-medium">-{formatMoney((order as any).discountAmount)}</span>
          </div>
        )}

        {/* Deposit */}
        {order.orderType === 'RENT' && order.depositAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('amount.deposit')}:</span>
            <span className="font-medium">{formatMoney(order.depositAmount)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between text-lg font-bold text-green-700 pt-2 border-t border-gray-200">
          <span>{t('amount.grandTotal')}:</span>
          <span>{formatMoney(order.totalAmount || 0)}</span>
        </div>

        {/* Collection Amount - Single field for RENT orders */}
        {order.orderType === 'RENT' && (
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-600">{t('detail.collectionAmount')}:</span>
            <span className={`font-medium ${
              order.status === 'RESERVED' ? 'text-yellow-700' : 
              order.status === 'PICKUPED' ? 'text-blue-700' : 
              'text-gray-500'
            }`}>
              {order.status === 'RESERVED' ? (
                <span className="flex items-center gap-2">
                  <span>{formatMoney(calculateCollectionTotal(order, tempSettings))}</span>
                  {tempSettings.collateralType && tempSettings.collateralType !== 'Other' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      + {tempSettings.collateralType}
                    </span>
                  )}
                  {tempSettings.collateralType === 'Other' && tempSettings.collateralDetails && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      + {tempSettings.collateralDetails}
                    </span>
                  )}
                  {tempSettings.collateralType === 'Other' && !tempSettings.collateralDetails && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      + {t('detail.collateral')}
                    </span>
                  )}
                </span>
              ) : 
               order.status === 'PICKUPED' ? t('detail.alreadyCollected') : 
               t('detail.noCollectionNeeded')}
            </span>
          </div>
        )}

        {/* Show QR Code Button */}
        {defaultBankAccount && amountToPay > 0 && (
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
        />
      )}
    </Card>
  );
};

