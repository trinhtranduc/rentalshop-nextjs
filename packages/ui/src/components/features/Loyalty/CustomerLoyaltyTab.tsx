'use client';

import React, { useEffect, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, useFormatCurrency } from '@rentalshop/ui';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyCustomerSummary, LoyaltyTransaction } from '@rentalshop/types';

interface CustomerLoyaltyTabProps {
  customerId: number;
}

export const CustomerLoyaltyTab: React.FC<CustomerLoyaltyTabProps> = ({ customerId }) => {
  const formatMoney = useFormatCurrency();
  const [summary, setSummary] = useState<LoyaltyCustomerSummary | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setLoading(true);
    setUnavailable(false);
    Promise.all([
      loyaltyApi.getCustomerSummary(customerId),
      loyaltyApi.getCustomerTransactions(customerId, { page: 1, limit: 20 }),
    ])
      .then(([summaryRes, txRes]) => {
        if (summaryRes.success) {
          setSummary(summaryRes.data || null);
        } else {
          setSummary(null);
          setUnavailable(true);
        }
        if (txRes.success && txRes.data) setTransactions(txRes.data.transactions || []);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Đang tải loyalty...</div>;
  }

  if (unavailable) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/30 p-4">
            <p className="font-medium text-text-primary">Loyalty chưa kích hoạt</p>
            <p className="mt-1 text-sm text-text-secondary">
              Bật loyalty để xem điểm thưởng, lịch sử giao dịch và phân hạng khách hàng.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Điểm thưởng
            {summary?.tier?.name && <Badge>{summary.tier.name}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Số dư</p>
            <p className="text-xl font-semibold">{summary?.points ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Tích lũy</p>
            <p className="text-xl font-semibold">{summary?.totalEarned ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Đã đổi</p>
            <p className="text-xl font-semibold">{summary?.totalRedeemed ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Chi tiêu</p>
            <p className="text-xl font-semibold">{formatMoney(summary?.totalSpent ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-sm text-text-secondary">Chưa có giao dịch loyalty.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium">{tx.description || tx.type}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(tx.createdAt).toLocaleString()}
                    {tx.outletName ? ` · ${tx.outletName}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={tx.points >= 0 ? 'text-action-success' : 'text-action-danger'}>
                    {tx.points >= 0 ? '+' : ''}
                    {tx.points}
                  </p>
                  <p className="text-xs text-text-secondary">Sau: {tx.balanceAfter}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
