import React from 'react';
import { Badge, Input, Label, Switch, useFormatCurrency } from '@rentalshop/ui';
import { Coins } from 'lucide-react';
import type { LoyaltyCustomerSummary } from '@rentalshop/types';

interface LoyaltyRedeemSectionProps {
  summary: LoyaltyCustomerSummary | null;
  usePoints: boolean;
  onUsePointsChange: (value: boolean) => void;
  redeemPoints: number;
  onRedeemPointsChange: (value: number) => void;
  loyaltyDiscount: number;
  amountDue: number;
  loading?: boolean;
  validationError?: string | null;
  enabled?: boolean;
  earnPreview?: number | null;
  orderType?: 'RENT' | 'SALE';
}

export const LoyaltyRedeemSection: React.FC<LoyaltyRedeemSectionProps> = ({
  summary,
  usePoints,
  onUsePointsChange,
  redeemPoints,
  onRedeemPointsChange,
  loyaltyDiscount,
  amountDue,
  loading = false,
  validationError,
  enabled = true,
  earnPreview,
  orderType,
}) => {
  const formatMoney = useFormatCurrency();

  if (!enabled) return null;

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-primary">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">Khách hàng thân thiết</h4>
        {summary?.tier?.name && (
          <Badge variant="secondary">{summary.tier.name}</Badge>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-secondary">Đang tải điểm...</p>
      ) : summary ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Số dư điểm</span>
            <span className="font-medium">{summary.points}</span>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="use-loyalty-points" className="text-sm">
              Dùng điểm
            </Label>
            <Switch
              id="use-loyalty-points"
              checked={usePoints}
              onCheckedChange={onUsePointsChange}
              disabled={!summary.canRedeem}
            />
          </div>

          {usePoints && (
            <div className="space-y-2">
              <Label htmlFor="loyalty-points-input" className="text-sm">
                Số điểm đổi (tối đa {summary.maxRedeemPoints})
              </Label>
              <Input
                id="loyalty-points-input"
                type="number"
                min={0}
                max={summary.maxRedeemPoints}
                value={redeemPoints || ''}
                onChange={(e) => onRedeemPointsChange(Number(e.target.value) || 0)}
              />
              {validationError && (
                <p className="text-xs text-action-danger">{validationError}</p>
              )}
            </div>
          )}

          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-action-success">
              <span>Giảm từ điểm</span>
              <span>-{formatMoney(loyaltyDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span>Khách cần trả</span>
            <span>{formatMoney(amountDue)}</span>
          </div>

          {/* Next Tier Info */}
          {summary.nextTier && summary.nextTier.remaining > 0 && (
            <div className="text-xs text-text-secondary pt-1">
              Cần chi thêm {formatMoney(summary.nextTier.remaining)} để lên {summary.nextTier.name}
            </div>
          )}

          {/* Earn Preview */}
          {earnPreview != null && earnPreview > 0 && (
            <div className="flex items-center gap-2 text-sm text-action-success pt-2 border-t border-border">
              <Coins className="w-4 h-4 flex-shrink-0" />
              <span>
                {orderType === 'RENT'
                  ? `Ước tính tích ~${earnPreview} điểm khi trả đồ`
                  : `Tích ${earnPreview} điểm`}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-text-secondary">Chưa có chương trình loyalty hoặc chưa chọn khách hàng.</p>
      )}
    </div>
  );
};
