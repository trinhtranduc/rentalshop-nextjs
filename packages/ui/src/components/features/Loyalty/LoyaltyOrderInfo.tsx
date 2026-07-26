'use client';

import React from 'react';
import { useFormatCurrency } from '@rentalshop/ui';
import { Gift, Coins, Clock } from 'lucide-react';

interface LoyaltyOrderInfoProps {
  loyaltyPointsRedeemed?: number | null;
  loyaltyDiscount?: number | null;
  loyaltyPointsEarned?: number | null;
  orderType: 'RENT' | 'SALE';
  orderStatus: string;
}

export const LoyaltyOrderInfo: React.FC<LoyaltyOrderInfoProps> = ({
  loyaltyPointsRedeemed,
  loyaltyDiscount,
  loyaltyPointsEarned,
  orderType,
  orderStatus,
}) => {
  const formatMoney = useFormatCurrency();

  const hasRedeemed = (loyaltyPointsRedeemed ?? 0) > 0;
  const hasEarned = (loyaltyPointsEarned ?? 0) > 0;
  const isRentPendingEarn =
    orderType === 'RENT' &&
    !hasEarned &&
    orderStatus !== 'RETURNED' &&
    orderStatus !== 'CANCELLED';

  // Don't render if no loyalty activity and no pending earn
  if (!hasRedeemed && !hasEarned && !isRentPendingEarn) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-bg-primary">
      <h4 className="text-sm font-semibold text-text-primary">Điểm thưởng</h4>

      {hasRedeemed && (
        <div className="flex items-center gap-2 text-sm text-action-danger">
          <Gift className="w-4 h-4 flex-shrink-0" />
          <span>
            Đã dùng {loyaltyPointsRedeemed} điểm (-{formatMoney(loyaltyDiscount ?? 0)})
          </span>
        </div>
      )}

      {hasEarned && (
        <div className="flex items-center gap-2 text-sm text-action-success">
          <Coins className="w-4 h-4 flex-shrink-0" />
          <span>Đã tích {loyaltyPointsEarned} điểm</span>
        </div>
      )}

      {isRentPendingEarn && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Sẽ tích điểm khi trả đồ</span>
        </div>
      )}
    </div>
  );
};
