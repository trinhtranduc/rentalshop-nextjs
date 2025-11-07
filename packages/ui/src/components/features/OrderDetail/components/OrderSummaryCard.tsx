import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { DollarSign } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui/base';
import type { OrderWithDetails } from '@rentalshop/types';

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
      </CardContent>
    </Card>
  );
};

