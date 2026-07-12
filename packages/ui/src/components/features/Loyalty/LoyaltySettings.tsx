'use client';

import React, { useEffect, useState } from 'react';
import { Award, Clock3, Coins, Medal, Settings2, Sparkles, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  useToast,
} from '@rentalshop/ui';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyProgram, LoyaltyTier } from '@rentalshop/types';

type EditableTier = Omit<LoyaltyTier, 'benefits' | 'color' | 'icon'> & {
  benefitsText: string;
  color: string;
  icon: string;
};

type LoyaltySection = 'overview' | 'earn' | 'redeem' | 'tiers' | 'expiry';

const sectionItems: Array<{
  id: LoyaltySection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'overview',
    label: 'Tổng quan',
    description: 'Tên chương trình và rule xếp hạng',
    icon: Settings2,
  },
  {
    id: 'earn',
    label: 'Tích điểm',
    description: 'Thiết lập điểm cho đơn thuê và đơn bán',
    icon: Coins,
  },
  {
    id: 'redeem',
    label: 'Đổi điểm',
    description: 'Giá trị điểm và điều kiện dùng điểm',
    icon: Sparkles,
  },
  {
    id: 'tiers',
    label: 'Level',
    description: 'Hạng thành viên và quyền lợi',
    icon: Medal,
  },
  {
    id: 'expiry',
    label: 'Hết hạn',
    description: 'Quy tắc reset hoặc hết hạn điểm',
    icon: Clock3,
  },
];

const defaultProgramState: Partial<LoyaltyProgram> = {
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
  tierMetric: 'total_spend',
  tierPeriod: 'lifetime',
  tierDowngrade: 'never',
  pointsExpiryMode: 'never',
  pointsExpiryDays: null,
  yearlyResetMonth: null,
  yearlyResetDay: null,
};

const parseBenefitsText = (benefits?: string) => {
  if (!benefits) return '';

  try {
    const parsed = JSON.parse(benefits);
    if (Array.isArray(parsed)) {
      return parsed.join('\n');
    }
  } catch {
    return benefits;
  }

  return benefits;
};

const serializeBenefits = (benefitsText: string) => {
  const lines = benefitsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? JSON.stringify(lines) : '[]';
};

const normalizeProgram = (program?: LoyaltyProgram | Partial<LoyaltyProgram> | null) => ({
  ...defaultProgramState,
  ...(program || {}),
  pointsExpiryDays: program?.pointsExpiryDays ?? null,
  yearlyResetMonth: program?.yearlyResetMonth ?? null,
  yearlyResetDay: program?.yearlyResetDay ?? null,
});

const toEditableTier = (tier: LoyaltyTier): EditableTier => ({
  ...tier,
  benefitsText: parseBenefitsText(tier.benefits),
  color: tier.color || '#888888',
  icon: tier.icon || '',
});

const sortTiers = (tiers: EditableTier[]) =>
  [...tiers].sort((a, b) => {
    const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortOrderDiff !== 0) return sortOrderDiff;
    return a.threshold - b.threshold;
  });

const SectionNavButton: React.FC<{
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}> = ({ active, icon: Icon, label, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
      active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-border bg-bg-card hover:bg-bg-secondary'
    }`}
  >
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 ${active ? 'text-blue-700' : 'text-text-secondary'}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${active ? 'text-blue-700' : 'text-text-primary'}`}>{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </div>
  </button>
);

const SectionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
      <p className="text-sm text-text-secondary">{description}</p>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

export const LoyaltySettings: React.FC = () => {
  const { toastSuccess, toastError, toastWarning } = useToast();
  const [program, setProgram] = useState<Partial<LoyaltyProgram>>(defaultProgramState);
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<LoyaltySection>('overview');
  const [savingProgram, setSavingProgram] = useState(false);
  const [creatingTier, setCreatingTier] = useState(false);
  const [savingTierIds, setSavingTierIds] = useState<number[]>([]);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);
  const [tierPendingDelete, setTierPendingDelete] = useState<EditableTier | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings(showSpinner = true) {
    if (showSpinner) setLoading(true);

    try {
      const [programRes, tiersRes] = await Promise.all([
        loyaltyApi.getProgram(),
        loyaltyApi.getTiers(),
      ]);

      setProgram(programRes.success && programRes.data ? normalizeProgram(programRes.data) : defaultProgramState);
      setTiers(
        tiersRes.success && tiersRes.data ? sortTiers(tiersRes.data.map(toEditableTier)) : []
      );
    } finally {
      setLoading(false);
    }
  }

  const updateProgramField = <K extends keyof LoyaltyProgram>(
    field: K,
    value: Partial<LoyaltyProgram>[K]
  ) => {
    setProgram((prev) => ({ ...prev, [field]: value }));
  };

  const updateTierField = <K extends keyof EditableTier>(
    tierId: number,
    field: K,
    value: EditableTier[K]
  ) => {
    setTiers((prev) => prev.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier)));
  };

  const handleSaveProgram = async () => {
    setSavingProgram(true);

    try {
      const payload: Partial<LoyaltyProgram> & { name: string } = {
        name: (program.name || defaultProgramState.name || 'Loyalty Program').trim(),
        isActive: !!program.isActive,
        rentEarnEnabled: !!program.rentEarnEnabled,
        rentEarnRate: Number(program.rentEarnRate || 0),
        rentEarnPerAmount: Number(program.rentEarnPerAmount || 0),
        saleEarnEnabled: !!program.saleEarnEnabled,
        saleEarnRate: Number(program.saleEarnRate || 0),
        saleEarnPerAmount: Number(program.saleEarnPerAmount || 0),
        pointValue: Number(program.pointValue || 0),
        minRedeemPoints: Number(program.minRedeemPoints || 0),
        maxRedeemPercent: Number(program.maxRedeemPercent || 0),
        redeemOnRent: !!program.redeemOnRent,
        redeemOnSale: !!program.redeemOnSale,
        tierMetric: program.tierMetric || 'total_spend',
        tierPeriod: program.tierPeriod || 'lifetime',
        tierDowngrade: program.tierDowngrade || 'never',
        pointsExpiryMode: program.pointsExpiryMode || 'never',
        pointsExpiryDays:
          program.pointsExpiryMode === 'per_transaction'
            ? Number(program.pointsExpiryDays || 0)
            : null,
        yearlyResetMonth:
          program.pointsExpiryMode === 'yearly_reset'
            ? Number(program.yearlyResetMonth || 0)
            : null,
        yearlyResetDay:
          program.pointsExpiryMode === 'yearly_reset'
            ? Number(program.yearlyResetDay || 0)
            : null,
      };

      const response = await loyaltyApi.upsertProgram(payload);
      if (!response.success) {
        toastError('Không lưu được cấu hình loyalty', response.message || response.error);
        return;
      }

      setProgram(normalizeProgram(response.data || payload));
      toastSuccess('Đã lưu cấu hình loyalty', 'Cấu hình loyalty đã được cập nhật.');
    } catch {
      toastError('Không lưu được cấu hình loyalty', 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setSavingProgram(false);
    }
  };

  const handleCreateTier = async () => {
    if (!program.id) {
      toastWarning('Hãy lưu chương trình trước', 'Cần tạo loyalty program trước khi thêm hạng.');
      return;
    }

    setCreatingTier(true);

    try {
      const highestThreshold = tiers.reduce((max, tier) => Math.max(max, tier.threshold), 0);
      const response = await loyaltyApi.createTier({
        name: `Hạng ${tiers.length + 1}`,
        threshold: highestThreshold === 0 ? 1000000 : highestThreshold + 1000000,
        multiplier: 1,
        sortOrder: tiers.length,
        benefits: '[]',
        color: '#888888',
        icon: null,
      });

      if (!response.success || !response.data) {
        toastError('Không thêm được hạng', response.message || response.error);
        return;
      }

      setTiers((prev) => sortTiers([...prev, toEditableTier(response.data!)]));
      toastSuccess('Đã tạo hạng mới', 'Bạn có thể chỉnh hạng ngay bên dưới.');
    } catch {
      toastError('Không thêm được hạng', 'Có lỗi xảy ra khi tạo hạng.');
    } finally {
      setCreatingTier(false);
    }
  };

  const handleSaveTier = async (tierId: number) => {
    const tier = tiers.find((item) => item.id === tierId);
    if (!tier) return;

    setSavingTierIds((prev) => [...prev, tierId]);

    try {
      const response = await loyaltyApi.updateTier(tierId, {
        name: tier.name.trim(),
        threshold: Number(tier.threshold || 0),
        multiplier: Number(tier.multiplier || 1),
        benefits: serializeBenefits(tier.benefitsText),
        color: tier.color || null,
        icon: tier.icon.trim() || null,
        sortOrder: Number(tier.sortOrder || 0),
      });

      if (!response.success || !response.data) {
        toastError(`Không lưu được hạng ${tier.name}`, response.message || response.error);
        return;
      }

      setTiers((prev) =>
        sortTiers(prev.map((item) => (item.id === tierId ? toEditableTier(response.data!) : item)))
      );
      toastSuccess('Đã lưu hạng thành viên', `${tier.name} đã được cập nhật.`);
    } catch {
      toastError(`Không lưu được hạng ${tier.name}`, 'Có lỗi xảy ra khi lưu hạng.');
    } finally {
      setSavingTierIds((prev) => prev.filter((id) => id !== tierId));
    }
  };

  const handleDeleteTier = async () => {
    if (!tierPendingDelete) return;

    const tierId = tierPendingDelete.id;
    const tierName = tierPendingDelete.name;
    setDeletingTierId(tierId);

    try {
      const response = await loyaltyApi.deleteTier(tierId);
      if (!response.success) {
        toastError(`Không xóa được hạng ${tierName}`, response.message || response.error);
        return;
      }

      setTiers((prev) => prev.filter((tier) => tier.id !== tierId));
      toastSuccess('Đã xóa hạng thành viên', `${tierName} đã được xóa khỏi chương trình.`);
      await loadSettings(false);
    } catch {
      toastError(`Không xóa được hạng ${tierName}`, 'Có lỗi xảy ra khi xóa hạng.');
    } finally {
      setDeletingTierId(null);
      setTierPendingDelete(null);
    }
  };

  const metricUnit = program.tierMetric === 'total_orders' ? 'đơn hàng' : 'VND';
  const metricDescription =
    program.tierMetric === 'total_orders'
      ? 'Ngưỡng lên hạng được tính theo tổng số đơn hàng.'
      : 'Ngưỡng lên hạng được tính theo tổng chi tiêu tích lũy.';
  const orderedTiers = sortTiers(tiers);
  const activeSectionItem = sectionItems.find((item) => item.id === activeSection);
  const ActiveSectionIcon = activeSectionItem?.icon;

  if (loading) {
    return <div className="p-6 text-sm text-text-secondary">Đang tải loyalty...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={program.isActive ? 'secondary' : 'outline'}>
                  {program.isActive ? 'Đang bật' : 'Đang tắt'}
                </Badge>
                <Badge variant="outline">{program.tierMetric === 'total_orders' ? 'Theo đơn' : 'Theo chi tiêu'}</Badge>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">
                {program.name || 'Chương trình loyalty'}
              </h2>
              <p className="text-sm text-text-secondary">
                Tách theo từng nhóm cấu hình để dễ quản lý, dễ chỉnh, dễ hiểu.
              </p>
            </div>
            <Button onClick={handleSaveProgram} disabled={savingProgram}>
              {savingProgram ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardContent className="space-y-3 p-4">
              {sectionItems.map((item) => (
                <SectionNavButton
                  key={item.id}
                  active={activeSection === item.id}
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  onClick={() => setActiveSection(item.id)}
                />
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {ActiveSectionIcon ? <ActiveSectionIcon className="h-5 w-5" /> : null}
                  {activeSectionItem?.label}
                </CardTitle>
                <p className="text-sm text-text-secondary">{activeSectionItem?.description}</p>
              </CardHeader>
            </Card>

            {activeSection === 'overview' && (
              <SectionCard
                title="Tổng quan chương trình"
                description="Tên chương trình, trạng thái và rule xếp hạng của loyalty."
                icon={Settings2}
              >
                <div className="space-y-2">
                  <Label>Tên chương trình</Label>
                  <Input
                    value={program.name || ''}
                    onChange={(e) => updateProgramField('name', e.target.value)}
                    placeholder="Ví dụ: Thành viên AnyRent"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-text-primary">Kích hoạt loyalty</p>
                    <p className="text-sm text-text-secondary">Tắt để tạm dừng toàn bộ tính năng loyalty.</p>
                  </div>
                  <Switch
                    checked={!!program.isActive}
                    onCheckedChange={(checked) => updateProgramField('isActive', checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tiêu chí lên hạng</Label>
                    <Select
                      value={program.tierMetric || 'total_spend'}
                      onValueChange={(value: 'total_spend' | 'total_orders') =>
                        updateProgramField('tierMetric', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tiêu chí" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total_spend">Tổng chi tiêu</SelectItem>
                        <SelectItem value="total_orders">Tổng số đơn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chu kỳ theo dõi hạng</Label>
                    <Select
                      value={program.tierPeriod || 'lifetime'}
                      onValueChange={(value: 'lifetime' | 'yearly') =>
                        updateProgramField('tierPeriod', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chu kỳ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lifetime">Trọn đời</SelectItem>
                        <SelectItem value="yearly">Theo năm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cách hạ hạng</Label>
                    <Select
                      value={program.tierDowngrade || 'never'}
                      onValueChange={(value: 'never' | 'immediate' | 'grace_30d') =>
                        updateProgramField('tierDowngrade', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn rule hạ hạng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Không hạ hạng</SelectItem>
                        <SelectItem value="immediate">Hạ ngay</SelectItem>
                        <SelectItem value="grace_30d">Gia hạn 30 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-text-secondary">{metricDescription}</p>
              </SectionCard>
            )}

            {activeSection === 'earn' && (
              <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                  title="Tích điểm từ đơn thuê"
                  description="Áp dụng cho order type RENT."
                  icon={Coins}
                >
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-text-primary">Cho phép tích điểm</p>
                      <p className="text-sm text-text-secondary">Bật nếu bạn muốn đơn thuê sinh điểm.</p>
                    </div>
                    <Switch
                      checked={!!program.rentEarnEnabled}
                      onCheckedChange={(checked) => updateProgramField('rentEarnEnabled', checked)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Số điểm nhận được mỗi lần</Label>
                      <Input
                        type="number"
                        min={1}
                        value={program.rentEarnRate ?? ''}
                        disabled={!program.rentEarnEnabled}
                        onChange={(e) =>
                          updateProgramField('rentEarnRate', Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mốc tiền để nhận điểm (VND)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={program.rentEarnPerAmount ?? ''}
                        disabled={!program.rentEarnEnabled}
                        onChange={(e) =>
                          updateProgramField('rentEarnPerAmount', Number(e.target.value || 0))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Ví dụ: mỗi {(program.rentEarnPerAmount || 0).toLocaleString()} VND nhận{' '}
                    {program.rentEarnRate || 0} điểm.
                  </p>
                </SectionCard>

                <SectionCard
                  title="Tích điểm từ đơn bán"
                  description="Áp dụng cho order type SALE."
                  icon={Coins}
                >
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-text-primary">Cho phép tích điểm</p>
                      <p className="text-sm text-text-secondary">Hữu ích khi shop vừa thuê vừa bán.</p>
                    </div>
                    <Switch
                      checked={!!program.saleEarnEnabled}
                      onCheckedChange={(checked) => updateProgramField('saleEarnEnabled', checked)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Số điểm nhận được mỗi lần</Label>
                      <Input
                        type="number"
                        min={1}
                        value={program.saleEarnRate ?? ''}
                        disabled={!program.saleEarnEnabled}
                        onChange={(e) =>
                          updateProgramField('saleEarnRate', Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mốc tiền để nhận điểm (VND)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={program.saleEarnPerAmount ?? ''}
                        disabled={!program.saleEarnEnabled}
                        onChange={(e) =>
                          updateProgramField('saleEarnPerAmount', Number(e.target.value || 0))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Ví dụ: mỗi {(program.saleEarnPerAmount || 0).toLocaleString()} VND nhận{' '}
                    {program.saleEarnRate || 0} điểm.
                  </p>
                </SectionCard>
              </div>
            )}

            {activeSection === 'redeem' && (
              <SectionCard
                title="Đổi điểm thành ưu đãi"
                description="Giá trị điểm và giới hạn mức đổi cho mỗi đơn hàng."
                icon={Sparkles}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Giá trị 1 điểm (VND)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={program.pointValue ?? ''}
                      onChange={(e) => updateProgramField('pointValue', Number(e.target.value || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Điểm tối thiểu để đổi</Label>
                    <Input
                      type="number"
                      min={1}
                      value={program.minRedeemPoints ?? ''}
                      onChange={(e) =>
                        updateProgramField('minRedeemPoints', Number(e.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tối đa % giá trị đơn được đổi</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={program.maxRedeemPercent ?? ''}
                      onChange={(e) =>
                        updateProgramField('maxRedeemPercent', Number(e.target.value || 0))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-text-primary">Cho dùng điểm ở đơn thuê</p>
                      <p className="text-sm text-text-secondary">Áp dụng cho RENT.</p>
                    </div>
                    <Switch
                      checked={!!program.redeemOnRent}
                      onCheckedChange={(checked) => updateProgramField('redeemOnRent', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-text-primary">Cho dùng điểm ở đơn bán</p>
                      <p className="text-sm text-text-secondary">Áp dụng cho SALE.</p>
                    </div>
                    <Switch
                      checked={!!program.redeemOnSale}
                      onCheckedChange={(checked) => updateProgramField('redeemOnSale', checked)}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tiers' && (
              <SectionCard
                title="Hạng thành viên"
                description="Quản lý ngưỡng lên hạng, hệ số nhân điểm và quyền lợi."
                icon={Award}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-text-primary">Đơn vị ngưỡng hiện tại</p>
                    <p className="text-sm text-text-secondary">{metricDescription}</p>
                  </div>
                  <Button variant="outline" onClick={handleCreateTier} disabled={creatingTier}>
                    {creatingTier ? 'Đang thêm...' : 'Thêm hạng'}
                  </Button>
                </div>

                <div className="space-y-4">
                  {orderedTiers.map((tier) => {
                    const isSavingTier = savingTierIds.includes(tier.id);
                    const isDeletingTier = deletingTierId === tier.id;
                    const isBusy = isSavingTier || isDeletingTier;

                    return (
                      <div key={tier.id} className="rounded-xl border border-border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-current"
                                style={{ color: tier.color || '#888888' }}
                              >
                                {tier.name || 'Chưa đặt tên'}
                              </Badge>
                              {tier.threshold === 0 && (
                                <Badge variant="secondary">Hạng mặc định</Badge>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary">
                              Ngưỡng: {tier.threshold.toLocaleString()} {metricUnit} • Hệ số x
                              {tier.multiplier}
                            </p>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={tiers.length <= 1 || isBusy}
                            onClick={() => setTierPendingDelete(tier)}
                            className="md:self-start"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa hạng
                          </Button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Tên hạng</Label>
                            <Input
                              value={tier.name}
                              disabled={isBusy}
                              onChange={(e) => updateTierField(tier.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ngưỡng ({metricUnit})</Label>
                            <Input
                              type="number"
                              min={0}
                              value={tier.threshold}
                              disabled={isBusy}
                              onChange={(e) =>
                                updateTierField(tier.id, 'threshold', Number(e.target.value || 0))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hệ số nhân điểm</Label>
                            <Input
                              type="number"
                              min={1}
                              step="0.1"
                              value={tier.multiplier}
                              disabled={isBusy}
                              onChange={(e) =>
                                updateTierField(tier.id, 'multiplier', Number(e.target.value || 1))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Màu hiển thị</Label>
                            <Input
                              type="color"
                              value={tier.color || '#888888'}
                              disabled={isBusy}
                              onChange={(e) => updateTierField(tier.id, 'color', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Icon</Label>
                            <Input
                              value={tier.icon}
                              disabled={isBusy}
                              onChange={(e) => updateTierField(tier.id, 'icon', e.target.value)}
                              placeholder="Ví dụ: crown"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Thứ tự sắp xếp</Label>
                            <Input
                              type="number"
                              min={0}
                              value={tier.sortOrder}
                              disabled={isBusy}
                              onChange={(e) =>
                                updateTierField(tier.id, 'sortOrder', Number(e.target.value || 0))
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label>Quyền lợi của hạng</Label>
                          <Textarea
                            rows={4}
                            value={tier.benefitsText}
                            disabled={isBusy}
                            onChange={(e) =>
                              updateTierField(tier.id, 'benefitsText', e.target.value)
                            }
                            placeholder={`Mỗi dòng là một quyền lợi\nƯu tiên giữ hàng\nTặng voucher sinh nhật`}
                          />
                          <p className="text-xs text-text-secondary">
                            Mỗi dòng là một quyền lợi riêng.
                          </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button onClick={() => handleSaveTier(tier.id)} disabled={isBusy}>
                            {isSavingTier ? 'Đang lưu...' : 'Lưu hạng này'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {orderedTiers.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-sm text-text-secondary">
                      Chưa có hạng thành viên. Hãy lưu chương trình trước, sau đó thêm level cho khách hàng.
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {activeSection === 'expiry' && (
              <SectionCard
                title="Hết hạn điểm"
                description="Chọn cách giữ, reset hoặc hết hạn điểm theo chính sách của shop."
                icon={Clock3}
              >
                <div className="space-y-2">
                  <Label>Chế độ hết hạn điểm</Label>
                  <Select
                    value={program.pointsExpiryMode || 'never'}
                    onValueChange={(value: 'never' | 'per_transaction' | 'yearly_reset') =>
                      updateProgramField('pointsExpiryMode', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chế độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Không hết hạn</SelectItem>
                      <SelectItem value="per_transaction">Theo từng giao dịch</SelectItem>
                      <SelectItem value="yearly_reset">Reset hằng năm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {program.pointsExpiryMode === 'per_transaction' && (
                  <div className="space-y-2">
                    <Label>Số ngày điểm có hiệu lực</Label>
                    <Input
                      type="number"
                      min={1}
                      value={program.pointsExpiryDays ?? ''}
                      onChange={(e) =>
                        updateProgramField('pointsExpiryDays', Number(e.target.value || 0))
                      }
                    />
                  </div>
                )}

                {program.pointsExpiryMode === 'yearly_reset' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tháng reset</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={program.yearlyResetMonth ?? ''}
                        onChange={(e) =>
                          updateProgramField('yearlyResetMonth', Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ngày reset</Label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={program.yearlyResetDay ?? ''}
                        onChange={(e) =>
                          updateProgramField('yearlyResetDay', Number(e.target.value || 0))
                        }
                      />
                    </div>
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={!!tierPendingDelete}
        onOpenChange={(open) => {
          if (!open) setTierPendingDelete(null);
        }}
        type="danger"
        title="Xóa hạng thành viên"
        description={
          tierPendingDelete
            ? `Bạn có chắc muốn xóa hạng "${tierPendingDelete.name}" không? Khách ở hạng này sẽ được chuyển về hạng thấp hơn.`
            : 'Bạn có chắc muốn xóa hạng này không?'
        }
        confirmText="Xóa hạng"
        cancelText="Giữ lại"
        onConfirm={handleDeleteTier}
        disabled={deletingTierId != null}
      />
    </>
  );
};
