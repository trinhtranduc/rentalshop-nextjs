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

const TIER_PRESETS = [
  { key: 'member',   name: 'Thành viên', icon: 'user',    color: '#6B7280', threshold: 0 },
  { key: 'bronze',   name: 'Đồng',       icon: 'medal',   color: '#CD7F32', threshold: 500000 },
  { key: 'silver',   name: 'Bạc',        icon: 'award',   color: '#C0C0C0', threshold: 2000000 },
  { key: 'gold',     name: 'Vàng',       icon: 'crown',   color: '#FFD700', threshold: 5000000 },
  { key: 'platinum', name: 'Bạch Kim',   icon: 'gem',     color: '#E5E4E2', threshold: 10000000 },
  { key: 'diamond',  name: 'Kim Cương',  icon: 'diamond', color: '#B9F2FF', threshold: 20000000 },
  { key: 'vip',      name: 'VIP',        icon: 'star',    color: '#FF6B6B', threshold: 50000000 },
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
    className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors rounded-md ${
      active
        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
        : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon className="h-5 w-5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="font-medium">{label}</p>
      <p className="text-xs text-gray-500 truncate">{description}</p>
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
  const [syncing, setSyncing] = useState(false);
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

  const handleSyncHistory = async () => {
    setSyncing(true);
    try {
      const response = await loyaltyApi.syncHistory();
      if (response.success && response.data) {
        const data = response.data;
        toastSuccess(
          'Đồng bộ thành công',
          `Đã xử lý ${data.customersProcessed} khách hàng, cộng ${data.totalPointsIssued} điểm.`
        );
      } else {
        toastError('Đồng bộ thất bại', response.message || response.error || 'Có lỗi xảy ra.');
      }
    } catch {
      toastError('Đồng bộ thất bại', 'Có lỗi xảy ra khi đồng bộ lịch sử.');
    } finally {
      setSyncing(false);
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

  const handleCreatePresetTier = async (preset: typeof TIER_PRESETS[number]) => {
    if (!program.id) {
      toastWarning('Hãy lưu chương trình trước', 'Cần tạo loyalty program trước khi thêm hạng.');
      return;
    }

    setCreatingTier(true);

    try {
      const response = await loyaltyApi.createTier({
        name: preset.name,
        threshold: preset.threshold,
        multiplier: 1,
        sortOrder: TIER_PRESETS.findIndex((p) => p.key === preset.key),
        benefits: '[]',
        color: preset.color,
        icon: preset.icon,
      });

      if (!response.success || !response.data) {
        toastError('Không thêm được hạng', response.message || response.error);
        return;
      }

      setTiers((prev) => sortTiers([...prev, toEditableTier(response.data!)]));
      toastSuccess(`Đã thêm hạng ${preset.name}`, '');
    } catch {
      toastError('Không thêm được hạng', 'Có lỗi xảy ra.');
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
        {/* Page Header — matches Settings page style */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Loyalty</h1>
            <p className="text-sm text-text-secondary flex items-center gap-2 mt-1">
              Cấu hình chương trình khách hàng thân thiết
              <Badge variant={program.isActive ? 'secondary' : 'outline'}>
                {program.isActive ? 'Đang bật' : 'Đang tắt'}
              </Badge>
            </p>
          </div>
          <Button onClick={handleSaveProgram} disabled={savingProgram}>
            {savingProgram ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
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
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            {activeSection === 'overview' && (
              <SectionCard
                title="Tổng quan chương trình"
                description="Trạng thái và rule xếp hạng của loyalty."
                icon={Settings2}
              >
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">Kích hoạt loyalty</p>
                    <p className="text-sm text-text-secondary">Tắt để tạm dừng toàn bộ tính năng loyalty.</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <Switch
                      checked={!!program.isActive}
                      onCheckedChange={(checked) => updateProgramField('isActive', checked)}
                    />
                  </div>
                </div>

                {program.isActive && program.id && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">Đồng bộ lịch sử</p>
                      <p className="text-sm text-text-secondary">
                        Tính điểm và xếp hạng cho khách hàng dựa trên lịch sử đơn hàng đã hoàn thành.
                        Có thể chạy lại nhiều lần (dữ liệu sẽ được tính lại từ đầu).
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Button variant="outline" onClick={handleSyncHistory} disabled={syncing}>
                        {syncing ? 'Đang đồng bộ...' : 'Bắt đầu đồng bộ'}
                      </Button>
                    </div>
                  </div>
                )}

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
                        type="text"
                        inputMode="numeric"
                        value={(program.rentEarnPerAmount || 0).toLocaleString('en-US')}
                        disabled={!program.rentEarnEnabled}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updateProgramField('rentEarnPerAmount', Number(raw || 0));
                        }}
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
                        type="text"
                        inputMode="numeric"
                        value={(program.saleEarnPerAmount || 0).toLocaleString('en-US')}
                        disabled={!program.saleEarnEnabled}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updateProgramField('saleEarnPerAmount', Number(raw || 0));
                        }}
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
                      type="text"
                      inputMode="numeric"
                      value={(program.pointValue || 0).toLocaleString('en-US')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        updateProgramField('pointValue', Number(raw || 0));
                      }}
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
                description="Chọn các hạng áp dụng cho shop. Mỗi hạng có ngưỡng và hệ số nhân điểm riêng."
                icon={Award}
              >
                <p className="text-sm text-text-secondary">
                  Tick chọn hạng muốn dùng, nhập ngưỡng ({metricUnit}) và hệ số nhân. &quot;Thành viên&quot; là hạng mặc định, luôn bật.
                </p>

                <div className="space-y-3">
                  {TIER_PRESETS.map((preset) => {
                    const existing = tiers.find((t) => t.name === preset.name);
                    const isEnabled = !!existing;
                    const isDefault = preset.threshold === 0;
                    const isBusy = existing ? savingTierIds.includes(existing.id) : creatingTier;

                    return (
                      <div
                        key={preset.key}
                        className={`rounded-lg border p-4 transition-colors ${
                          isEnabled ? 'border-blue-200 bg-blue-50/50' : 'border-border bg-bg-card opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={isDefault || isBusy}
                            onChange={async () => {
                              if (isEnabled && existing) {
                                // Remove tier
                                setTierPendingDelete(existing);
                              } else {
                                // Create tier with preset values
                                await handleCreatePresetTier(preset);
                              }
                            }}
                            className="h-5 w-5 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />

                          {/* Preset info */}
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <span
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm"
                              style={{ backgroundColor: preset.color + '20', color: preset.color }}
                            >
                              {preset.icon === 'user' && '👤'}
                              {preset.icon === 'medal' && '🥉'}
                              {preset.icon === 'award' && '🥈'}
                              {preset.icon === 'crown' && '🥇'}
                              {preset.icon === 'gem' && '💎'}
                              {preset.icon === 'diamond' && '💠'}
                              {preset.icon === 'star' && '⭐'}
                            </span>
                            <span className="font-medium text-text-primary">{preset.name}</span>
                            {isDefault && <Badge variant="secondary" className="text-xs">Mặc định</Badge>}
                          </div>

                          {/* Threshold + Multiplier inputs */}
                          {isEnabled && existing && (
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-text-secondary whitespace-nowrap">Từ</Label>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={existing.threshold.toLocaleString('en-US')}
                                  disabled={isDefault || isBusy}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    updateTierField(existing.id, 'threshold', Number(raw || 0));
                                  }}
                                  className="w-32 h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-text-secondary whitespace-nowrap">x</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  step="0.1"
                                  value={existing.multiplier}
                                  disabled={isBusy}
                                  onChange={(e) => updateTierField(existing.id, 'multiplier', Number(e.target.value || 1))}
                                  className="w-20 h-8 text-sm"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveTier(existing.id)}
                                disabled={isBusy}
                                className="h-8 text-xs"
                              >
                                {isBusy ? '...' : 'Lưu'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-text-secondary mt-2">
                  Ngưỡng lên hạng được tính theo {program.tierMetric === 'total_orders' ? 'tổng số đơn hoàn thành' : 'tổng chi tiêu tích lũy'}.
                </p>
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
