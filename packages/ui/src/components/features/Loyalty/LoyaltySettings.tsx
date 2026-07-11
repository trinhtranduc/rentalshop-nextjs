'use client';

import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  useToast,
} from '@rentalshop/ui';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyProgram, LoyaltyTier } from '@rentalshop/types';

export const LoyaltySettings: React.FC = () => {
  const { toast } = useToast();
  const [program, setProgram] = useState<Partial<LoyaltyProgram>>({
    name: 'Chương trình khách hàng thân thiết',
    isActive: true,
    rentEarnEnabled: true,
    rentEarnRate: 1,
    rentEarnPerAmount: 10000,
    saleEarnEnabled: true,
    saleEarnRate: 1,
    saleEarnPerAmount: 10000,
    pointValue: 1000,
    minRedeemPoints: 10,
    maxRedeemPercent: 50,
    redeemOnRent: true,
    redeemOnSale: true,
  });
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loyaltyApi.getProgram(), loyaltyApi.getTiers()])
      .then(([programRes, tiersRes]) => {
        if (programRes.success && programRes.data) {
          setProgram(programRes.data);
        }
        if (tiersRes.success && tiersRes.data) {
          setTiers(tiersRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProgram = async () => {
    setSaving(true);
    try {
      const response = await loyaltyApi.upsertProgram({
        name: program.name || 'Chương trình khách hàng thân thiết',
        ...program,
      } as LoyaltyProgram);
      if (response.success) {
        toast({ title: 'Đã lưu cấu hình loyalty' });
        setProgram(response.data || program);
      }
    } catch (error) {
      toast({ title: 'Lưu thất bại', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTier = async () => {
    const response = await loyaltyApi.createTier({
      name: `Hạng ${tiers.length + 1}`,
      threshold: tiers.length * 1000000,
      multiplier: 1,
      sortOrder: tiers.length,
      benefits: '[]',
      color: '#888888',
      icon: null,
    });
    if (response.success && response.data) {
      setTiers((prev) => [...prev, response.data!]);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-text-secondary">Đang tải loyalty...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình chương trình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tên chương trình</Label>
            <Input
              value={program.name || ''}
              onChange={(e) => setProgram((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Kích hoạt</Label>
            <Switch
              checked={!!program.isActive}
              onCheckedChange={(checked) => setProgram((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Giá trị 1 điểm (VND)</Label>
              <Input
                type="number"
                value={program.pointValue || 0}
                onChange={(e) => setProgram((prev) => ({ ...prev, pointValue: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tối đa % đổi điểm</Label>
              <Input
                type="number"
                value={program.maxRedeemPercent || 0}
                onChange={(e) => setProgram((prev) => ({ ...prev, maxRedeemPercent: Number(e.target.value) }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveProgram} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hạng thành viên</CardTitle>
          <Button variant="outline" onClick={handleCreateTier}>
            Thêm hạng
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-text-secondary">
                  Ngưỡng: {tier.threshold.toLocaleString()} · Hệ số: x{tier.multiplier}
                </p>
              </div>
            </div>
          ))}
          {tiers.length === 0 && (
            <p className="text-sm text-text-secondary">Chưa có hạng thành viên.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
