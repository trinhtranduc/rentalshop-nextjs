'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock3, Coins, Medal, Settings2 } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmationDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useToast,
} from '@rentalshop/ui';
import { loyaltyApi } from '@rentalshop/utils';
import type { LoyaltyProgram, LoyaltyTier } from '@rentalshop/types';

type EditableTier = Omit<LoyaltyTier, 'benefits' | 'color' | 'icon'> & {
  benefitsText: string;
  color: string;
  icon: string;
};

type LoyaltySection = 'overview' | 'earn' | 'tiers' | 'expiry';
type LoyaltyAccessState = 'loading' | 'available' | 'inactive' | 'unavailable';

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
  { key: 'member', name: 'Thành viên', icon: 'user', color: '#6B7280', threshold: 0 },
  { key: 'bronze', name: 'Đồng', icon: 'medal', color: '#CD7F32', threshold: 500000 },
  { key: 'silver', name: 'Bạc', icon: 'award', color: '#C0C0C0', threshold: 2000000 },
  { key: 'gold', name: 'Vàng', icon: 'crown', color: '#FFD700', threshold: 5000000 },
  { key: 'platinum', name: 'Bạch Kim', icon: 'gem', color: '#E5E4E2', threshold: 10000000 },
  { key: 'diamond', name: 'Kim Cương', icon: 'diamond', color: '#B9F2FF', threshold: 20000000 },
  { key: 'vip', name: 'VIP', icon: 'star', color: '#FF6B6B', threshold: 50000000 },
];

const defaultProgramState: Partial<LoyaltyProgram> = {
  name: 'Chương trình khách hàng thân thiết',
  isActive: false,
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
    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
      active
        ? 'border-blue-600 bg-blue-50 text-blue-700'
        : 'border-transparent text-text-primary hover:bg-bg-secondary/60'
    }`}
  >
    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-700' : 'text-text-secondary'}`} />
    <div className="min-w-0 flex-1">
      <p className={`font-semibold ${active ? 'text-blue-700' : 'text-text-primary'}`}>{label}</p>
      <p className="truncate text-xs text-text-secondary">{description}</p>
    </div>
  </button>
);

const SectionCard: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="rounded-lg border border-border bg-white px-5 py-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

const statusBadgeClass = (enabled: boolean) =>
  enabled
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';

export const LoyaltySettings: React.FC = () => {
  const { toastSuccess, toastError, toastWarning } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [program, setProgram] = useState<Partial<LoyaltyProgram>>(defaultProgramState);
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [accessState, setAccessState] = useState<LoyaltyAccessState>('loading');
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    const nextSection: LoyaltySection =
      tab === 'overview' || tab === 'earn' || tab === 'tiers' || tab === 'expiry'
        ? tab
        : 'overview';

    setActiveSection(nextSection);

    if (tab && tab !== nextSection) {
      router.replace('/loyalty?tab=overview');
    }
  }, [router, searchParams]);

  async function loadSettings(showSpinner = true) {
    if (showSpinner) setLoading(true);

    try {
      const [programRes, tiersRes] = await Promise.all([
        loyaltyApi.getProgram(),
        loyaltyApi.getTiers(),
      ]);

      if (programRes.success) {
        const nextProgram = programRes.data ? normalizeProgram(programRes.data) : defaultProgramState;
        setProgram(nextProgram);
        setAccessState(nextProgram.isActive ? 'available' : 'inactive');
      } else if (programRes.code === 'PLAN_UPGRADE_REQUIRED') {
        setProgram(defaultProgramState);
        setAccessState('unavailable');
      } else {
        setProgram(defaultProgramState);
        setAccessState('inactive');
      }

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

  const handleSectionChange = (section: LoyaltySection) => {
    setActiveSection(section);
    router.push(`/loyalty?tab=${section}`);
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

      const nextProgram = normalizeProgram(response.data || payload);
      setProgram(nextProgram);
      setAccessState(nextProgram.isActive ? 'available' : 'inactive');
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
          'Import lịch sử thành công',
          `Đã xử lý ${data.customersProcessed} khách hàng, cộng ${data.totalPointsIssued} điểm ban đầu.`
        );
      } else {
        toastError('Import lịch sử thất bại', response.message || response.error || 'Có lỗi xảy ra.');
      }
    } catch {
      toastError('Import lịch sử thất bại', 'Có lỗi xảy ra khi import lịch sử loyalty.');
    } finally {
      setSyncing(false);
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
        sortOrder: TIER_PRESETS.findIndex((item) => item.key === preset.key),
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

  const metricDescription =
    program.tierMetric === 'total_orders'
      ? 'Ngưỡng lên hạng được tính theo tổng số đơn hàng.'
      : 'Ngưỡng lên hạng được tính theo tổng chi tiêu tích lũy.';
  const orderedTiers = sortTiers(tiers);
  const isProgramUnavailable = accessState === 'unavailable';
  const isProgramActive = accessState !== 'unavailable' && !!program.isActive;
  const isProgramInactive = accessState === 'inactive' || (!program.isActive && !isProgramUnavailable);

  if (loading) {
    return <div className="p-6 text-sm text-text-secondary">Đang tải loyalty...</div>;
  }

  if (isProgramUnavailable) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Loyalty</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              Cấu hình chương trình khách hàng thân thiết
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                Professional plan
              </Badge>
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-white px-5 py-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Settings2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-text-primary">Loyalty bị khóa theo plan</h2>
              <p className="text-sm text-text-secondary">
                Loyalty chỉ khả dụng ở Professional plan. Khi nâng cấp, chương trình sẽ sẵn sàng để bật và cấu hình ngay.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-bg-secondary/40 px-4 py-4 text-sm text-text-secondary">
            Dữ liệu loyalty của khách vẫn được giữ lại để mở lại sau này, nhưng các thao tác tích điểm, đổi điểm và sync lịch sử đều bị khóa.
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header — matches Settings page style */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Loyalty</h1>
            <p className="text-sm text-text-secondary flex flex-wrap items-center gap-2 mt-1">
              Cấu hình chương trình khách hàng thân thiết
              <Badge variant={isProgramActive ? 'secondary' : 'outline'} className={statusBadgeClass(isProgramActive)}>
                {isProgramActive ? 'Đang bật' : 'Chưa kích hoạt'}
              </Badge>
            </p>
          </div>
          <Button onClick={handleSaveProgram} disabled={savingProgram}>
            {savingProgram ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>

        {isProgramInactive && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Loyalty đang ở trạng thái tắt</p>
                <p className="text-sm text-amber-800">
                  Chương trình đã sẵn sàng cấu hình. Bật loyalty khi shop muốn bắt đầu tích điểm và phân hạng khách.
                </p>
              </div>
              <Badge variant="outline" className="border-amber-200 bg-white text-amber-700">
                Draft
              </Badge>
            </div>
          </section>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <nav className="divide-y divide-border">
                {sectionItems.map((item) => (
                  <SectionNavButton
                      key={item.id}
                      active={activeSection === item.id}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => handleSectionChange(item.id)}
                    />
                  ))}
                </nav>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            {activeSection === 'overview' && (
              <SectionCard
                title="Tổng quan chương trình"
                description="Bật/tắt loyalty và rule xếp hạng của shop."
                action={
                  <Badge variant={isProgramActive ? 'secondary' : 'outline'} className={statusBadgeClass(isProgramActive)}>
                    {isProgramActive ? 'Đang bật' : 'Chưa kích hoạt'}
                  </Badge>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">Kích hoạt loyalty</p>
                      <p className="text-sm text-text-secondary">Tắt để tạm dừng toàn bộ tính năng loyalty.</p>
                    </div>
                    <Switch
                      checked={!!program.isActive}
                      onCheckedChange={(checked) => {
                        updateProgramField('isActive', checked);
                        setAccessState(checked ? 'available' : 'inactive');
                      }}
                    />
                  </div>

                  {isProgramActive && program.id && (
                    <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium text-text-primary">Import lịch sử một lần</p>
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                            Migration
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">
                          Dùng khi migrate dữ liệu ban đầu để tạo điểm mở đầu từ lịch sử đơn hàng cũ.
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleSyncHistory} disabled={syncing}>
                        {syncing ? 'Đang import...' : 'Bắt đầu import'}
                      </Button>
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Tiêu chí lên hạng</Label>
                        <Select
                          disabled
                          value={program.tierMetric || 'total_spend'}
                          onValueChange={(value: 'total_spend' | 'total_orders') =>
                            updateProgramField('tierMetric', value)
                          }
                        >
                          <SelectTrigger disabled>
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
                          disabled
                          value={program.tierPeriod || 'lifetime'}
                          onValueChange={(value: 'lifetime' | 'yearly') =>
                            updateProgramField('tierPeriod', value)
                          }
                        >
                          <SelectTrigger disabled>
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
                          disabled
                          value={program.tierDowngrade || 'never'}
                          onValueChange={(value: 'never' | 'immediate' | 'grace_30d') =>
                            updateProgramField('tierDowngrade', value)
                          }
                        >
                          <SelectTrigger disabled>
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
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs text-text-secondary">{metricDescription}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Các mục này đang được khóa trên UI.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'earn' && (
              <div className="space-y-6">
                <SectionCard
                  title="Tích điểm"
                  description="Thiết lập cách cộng điểm cho đơn thuê và đơn bán."
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium text-text-primary">Đơn thuê</p>
                          <Badge variant="outline" className={statusBadgeClass(!!program.rentEarnEnabled)}>
                            {program.rentEarnEnabled ? 'Đang bật' : 'Đang tắt'}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">Bật nếu bạn muốn đơn thuê sinh điểm.</p>
                      </div>
                      <Switch
                        checked={!!program.rentEarnEnabled}
                        onCheckedChange={(checked) => updateProgramField('rentEarnEnabled', checked)}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Số điểm nhận cho mỗi mốc</Label>
                        <Input
                          type="number"
                          min={1}
                          value={program.rentEarnRate ?? ''}
                          disabled={!program.rentEarnEnabled || !isProgramActive}
                          onChange={(e) =>
                            updateProgramField('rentEarnRate', Number(e.target.value || 0))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mỗi bao nhiêu VND sẽ nhận điểm</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={(program.rentEarnPerAmount || 0).toLocaleString('en-US')}
                          disabled={!program.rentEarnEnabled || !isProgramActive}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updateProgramField('rentEarnPerAmount', Number(raw || 0));
                          }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <p className="font-medium text-text-primary">Đơn bán</p>
                            <Badge variant="outline" className={statusBadgeClass(!!program.saleEarnEnabled)}>
                              {program.saleEarnEnabled ? 'Đang bật' : 'Đang tắt'}
                            </Badge>
                          </div>
                          <p className="text-sm text-text-secondary">Hữu ích khi shop vừa thuê vừa bán.</p>
                        </div>
                        <Switch
                          checked={!!program.saleEarnEnabled}
                          onCheckedChange={(checked) => updateProgramField('saleEarnEnabled', checked)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Số điểm nhận cho mỗi mốc</Label>
                        <Input
                          type="number"
                          min={1}
                          value={program.saleEarnRate ?? ''}
                          disabled={!program.saleEarnEnabled || !isProgramActive}
                          onChange={(e) =>
                            updateProgramField('saleEarnRate', Number(e.target.value || 0))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mỗi bao nhiêu VND sẽ nhận điểm</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={(program.saleEarnPerAmount || 0).toLocaleString('en-US')}
                          disabled={!program.saleEarnEnabled || !isProgramActive}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updateProgramField('saleEarnPerAmount', Number(raw || 0));
                          }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="rounded-lg bg-bg-secondary/50 px-3 py-2 text-xs text-text-secondary">
                        <p>
                          Ví dụ: nếu đơn thuê là 120,000đ và bạn đặt 1 điểm / 10,000đ, khách sẽ nhận 12 điểm.
                        </p>
                        <p className="mt-1">
                          Nếu đơn bán là 250,000đ với cùng cấu hình, khách sẽ nhận 25 điểm.
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Đổi điểm"
                  description="Quy đổi giá trị điểm và giới hạn dùng điểm trên đơn."
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Giá trị quy đổi của 1 điểm</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={(program.pointValue || 0).toLocaleString('en-US')}
                          disabled={!isProgramActive}
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
                          disabled={!isProgramActive}
                          onChange={(e) =>
                            updateProgramField('minRedeemPoints', Number(e.target.value || 0))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mức giảm tối đa của đơn</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={program.maxRedeemPercent ?? ''}
                          disabled={!isProgramActive}
                          onChange={(e) =>
                            updateProgramField('maxRedeemPercent', Number(e.target.value || 0))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-bg-secondary/50 px-3 py-2 text-xs text-text-secondary">
                      <p>
                        Ví dụ: nếu 1 điểm = 1,000đ, khách có 20 điểm sẽ đổi được 20,000đ.
                      </p>
                      <p className="mt-1">
                        Nếu đơn là 300,000đ và giới hạn giảm tối đa 50%, thì mức giảm lớn nhất là 150,000đ.
                      </p>
                    </div>

                    <div className="grid gap-0 md:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                        <div>
                          <p className="font-medium text-text-primary">Dùng điểm ở đơn thuê</p>
                          <p className="text-sm text-text-secondary">Áp dụng cho RENT.</p>
                        </div>
                        <Switch
                          checked={!!program.redeemOnRent}
                          disabled={!isProgramActive}
                          onCheckedChange={(checked) => updateProgramField('redeemOnRent', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-4 md:pt-0 md:pl-4">
                        <div>
                          <p className="font-medium text-text-primary">Dùng điểm ở đơn bán</p>
                          <p className="text-sm text-text-secondary">Áp dụng cho SALE.</p>
                        </div>
                        <Switch
                          checked={!!program.redeemOnSale}
                          disabled={!isProgramActive}
                          onCheckedChange={(checked) => updateProgramField('redeemOnSale', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {activeSection === 'tiers' && (
              <SectionCard
                title="Hạng thành viên"
                description="Hạng mặc định luôn bật. Các hạng còn lại có thể bật/tắt bằng checkbox."
              >
                <div className="space-y-4">
                  <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {TIER_PRESETS.map((preset) => {
                      const existing = tiers.find((tier) => tier.name === preset.name);
                      const isDefault = preset.threshold === 0;
                      const isEnabled = isDefault || !!existing;
                      const isChecked = isDefault || !!existing;
                      const tierData = existing || (isDefault ? preset : null);
                      const tierId = existing?.id ?? null;
                      const isBusy = existing ? savingTierIds.includes(existing.id) : creatingTier;

                      return (
                        <div
                          key={preset.key}
                          className={`flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between ${
                            isEnabled ? 'bg-white' : 'bg-white/70 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isBusy || !isProgramActive}
                              readOnly={isDefault}
                              aria-disabled={isDefault || isBusy || !isProgramActive}
                              onClick={(e) => {
                                if (isDefault) e.preventDefault();
                              }}
                              onChange={async () => {
                                if (!isProgramActive) return;
                                if (!isDefault && isEnabled && existing) {
                                  setTierPendingDelete(existing);
                                } else if (!isDefault) {
                                  await handleCreatePresetTier(preset);
                                }
                              }}
                              className={`h-5 w-5 rounded border-border text-blue-600 focus:ring-blue-500 ${
                                isDefault ? 'cursor-default accent-blue-600' : 'cursor-pointer'
                              } disabled:cursor-not-allowed`}
                            />

                            <div className="flex items-center gap-2 min-w-[140px]">
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ring-1 ring-border/60"
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
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                            {isEnabled && tierData ? (
                              <div className="grid gap-3 md:flex md:items-center">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-text-secondary whitespace-nowrap">Ngưỡng</Label>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={(tierData.threshold || 0).toLocaleString('en-US')}
                                    disabled={isDefault || isBusy || !existing || !isProgramActive}
                                    onChange={(e) => {
                                      if (tierId == null) return;
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      updateTierField(tierId, 'threshold', Number(raw || 0));
                                    }}
                                    className="h-8 w-32 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-text-secondary whitespace-nowrap">x</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    step="0.1"
                                    value={tierData.multiplier}
                                    disabled={isBusy || !existing || !isProgramActive}
                                    onChange={(e) => {
                                      if (tierId == null) return;
                                      updateTierField(tierId, 'multiplier', Number(e.target.value || 1));
                                    }}
                                    className="h-8 w-20 text-sm"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (tierId == null) return;
                                    handleSaveTier(tierId);
                                  }}
                                  disabled={isBusy || !existing || !isProgramActive}
                                  className="h-8 text-xs"
                                >
                                  {isBusy ? '...' : 'Lưu'}
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-text-secondary">
                                Hạng mặc định luôn được bật.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-text-secondary">
                  Ngưỡng lên hạng được tính theo{' '}
                  {program.tierMetric === 'total_orders' ? 'tổng số đơn hoàn thành' : 'tổng chi tiêu tích lũy'}.
                  </p>
                </div>
              </SectionCard>
            )}

            {activeSection === 'expiry' && (
              <SectionCard
                title="Hết hạn"
                description="Chọn cách giữ, reset hoặc hết hạn điểm."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Chế độ hết hạn điểm</p>
                      <p className="text-sm text-text-secondary">Chọn cách giữ, reset hoặc hết hạn điểm.</p>
                    </div>
                    <Select
                      value={program.pointsExpiryMode || 'never'}
                      onValueChange={(value: 'never' | 'per_transaction' | 'yearly_reset') =>
                        updateProgramField('pointsExpiryMode', value)
                      }
                    >
                      <SelectTrigger className="w-[220px]">
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
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-text-primary">Số ngày điểm có hiệu lực</p>
                          <p className="text-sm text-text-secondary">Áp dụng khi chọn theo từng giao dịch.</p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          className="w-28"
                          value={program.pointsExpiryDays ?? ''}
                          onChange={(e) =>
                            updateProgramField('pointsExpiryDays', Number(e.target.value || 0))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {program.pointsExpiryMode === 'yearly_reset' && (
                    <div className="grid gap-0 border-t border-border pt-4 md:grid-cols-2">
                      <div className="flex items-center justify-between gap-4 md:pr-4">
                        <div>
                          <p className="font-medium text-text-primary">Tháng reset</p>
                          <p className="text-sm text-text-secondary">Chọn tháng reset hằng năm.</p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          className="w-24"
                          value={program.yearlyResetMonth ?? ''}
                          onChange={(e) =>
                            updateProgramField('yearlyResetMonth', Number(e.target.value || 0))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-border pt-4 md:border-t-0 md:border-l md:pl-4">
                        <div>
                          <p className="font-medium text-text-primary">Ngày reset</p>
                          <p className="text-sm text-text-secondary">Ngày trong tháng để reset điểm.</p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          className="w-24"
                          value={program.yearlyResetDay ?? ''}
                          onChange={(e) =>
                            updateProgramField('yearlyResetDay', Number(e.target.value || 0))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
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
