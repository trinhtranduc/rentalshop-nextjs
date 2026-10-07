/**
 * Khách thân thiết (#546): the rules of the old shared LoyaltySettings, as pure helpers for the
 * shop-web page. No `@rentalshop/*` imports (types are restated) so
 * `tests/web-loyalty-model.test.ts` runs them under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */

export type TierMetric = 'total_spend' | 'total_orders';
export type TierPeriod = 'lifetime' | 'yearly';
export type TierDowngrade = 'never' | 'immediate' | 'grace_30d';
export type ExpiryMode = 'never' | 'per_transaction' | 'yearly_reset';

export interface ProgramState {
  id?: number;
  name?: string;
  isActive?: boolean;
  rentEarnEnabled?: boolean;
  rentEarnRate?: number;
  rentEarnPerAmount?: number;
  saleEarnEnabled?: boolean;
  saleEarnRate?: number;
  saleEarnPerAmount?: number;
  pointValue?: number;
  minRedeemPoints?: number;
  maxRedeemPercent?: number;
  redeemOnRent?: boolean;
  redeemOnSale?: boolean;
  tierMetric?: TierMetric;
  tierPeriod?: TierPeriod;
  tierDowngrade?: TierDowngrade;
  pointsExpiryMode?: ExpiryMode;
  pointsExpiryDays?: number | null;
  yearlyResetMonth?: number | null;
  yearlyResetDay?: number | null;
}

export interface TierRow {
  id: number;
  name: string;
  threshold: number;
  multiplier: number;
  benefits?: string | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
}

export interface EditableTier extends Omit<TierRow, 'benefits' | 'color' | 'icon'> {
  benefitsText: string;
  color: string;
  icon: string;
}

export const LOYALTY_SECTIONS = ['overview', 'earn', 'tiers', 'expiry'] as const;
export type LoyaltySection = (typeof LOYALTY_SECTIONS)[number];
export type AccessState = 'loading' | 'available' | 'inactive' | 'unavailable';

/**
 * Tier presets. `name` is stored on the tier and matched by name, so it stays as before
 * (Vietnamese) whatever the UI language.
 */
export const TIER_PRESETS = [
  { key: 'member', name: 'Thành viên', icon: 'user', color: '#6B7280', threshold: 0 },
  { key: 'bronze', name: 'Đồng', icon: 'medal', color: '#CD7F32', threshold: 500000 },
  { key: 'silver', name: 'Bạc', icon: 'award', color: '#C0C0C0', threshold: 2000000 },
  { key: 'gold', name: 'Vàng', icon: 'crown', color: '#FFD700', threshold: 5000000 },
  { key: 'platinum', name: 'Bạch Kim', icon: 'gem', color: '#E5E4E2', threshold: 10000000 },
  { key: 'diamond', name: 'Kim Cương', icon: 'diamond', color: '#B9F2FF', threshold: 20000000 },
  { key: 'vip', name: 'VIP', icon: 'star', color: '#FF6B6B', threshold: 50000000 },
] as const;
export type TierPreset = (typeof TIER_PRESETS)[number];

export const TIER_EMOJI: Record<string, string> = {
  user: '👤',
  medal: '🥉',
  award: '🥈',
  crown: '🥇',
  gem: '💎',
  diamond: '💠',
  star: '⭐',
};

/** The program name the old page created; stored data, not UI text. */
export const DEFAULT_PROGRAM_NAME = 'Chương trình khách hàng thân thiết';

export const DEFAULT_PROGRAM: ProgramState = {
  name: DEFAULT_PROGRAM_NAME,
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

/** `?tab=` → section; anything else is Tổng quan, and an unknown value asks for a URL fix. */
export function parseSection(tab: string | null): { section: LoyaltySection; fixUrl: boolean } {
  const known = (LOYALTY_SECTIONS as readonly string[]).includes(tab || '');
  return { section: known ? (tab as LoyaltySection) : 'overview', fixUrl: !!tab && !known };
}

export function normalizeProgram(program?: ProgramState | null): ProgramState {
  return {
    ...DEFAULT_PROGRAM,
    ...(program || {}),
    pointsExpiryDays: program?.pointsExpiryDays ?? null,
    yearlyResetMonth: program?.yearlyResetMonth ?? null,
    yearlyResetDay: program?.yearlyResetDay ?? null,
  };
}

/** GET /api/loyalty/program result → what the page shows (same rules as before). */
export function accessFrom(res: { success?: boolean; code?: string; data?: ProgramState | null }): {
  program: ProgramState;
  access: AccessState;
} {
  if (res.success) {
    const program = res.data ? normalizeProgram(res.data) : DEFAULT_PROGRAM;
    return { program, access: program.isActive ? 'available' : 'inactive' };
  }
  if (res.code === 'PLAN_UPGRADE_REQUIRED') return { program: DEFAULT_PROGRAM, access: 'unavailable' };
  return { program: DEFAULT_PROGRAM, access: 'inactive' };
}

export function parseBenefitsText(benefits?: string | null): string {
  if (!benefits) return '';
  try {
    const parsed = JSON.parse(benefits);
    if (Array.isArray(parsed)) return parsed.join('\n');
  } catch {
    return benefits;
  }
  return benefits;
}

export function serializeBenefits(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? JSON.stringify(lines) : '[]';
}

export function toEditableTier(tier: TierRow): EditableTier {
  return {
    id: tier.id,
    name: tier.name,
    threshold: tier.threshold,
    multiplier: tier.multiplier,
    sortOrder: tier.sortOrder,
    benefitsText: parseBenefitsText(tier.benefits),
    color: tier.color || '#888888',
    icon: tier.icon || '',
  };
}

export function sortTiers<R extends { sortOrder?: number | null; threshold: number }>(tiers: R[]): R[] {
  return [...tiers].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.threshold - b.threshold);
}

/** PUT /api/loyalty/program body. Never sends `isActive` (Super Admin only). */
export function programPayload(program: ProgramState) {
  const mode = program.pointsExpiryMode || 'never';
  return {
    name: (program.name || DEFAULT_PROGRAM_NAME).trim(),
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
    pointsExpiryMode: mode,
    pointsExpiryDays: mode === 'per_transaction' ? Number(program.pointsExpiryDays || 0) : null,
    yearlyResetMonth: mode === 'yearly_reset' ? Number(program.yearlyResetMonth || 0) : null,
    yearlyResetDay: mode === 'yearly_reset' ? Number(program.yearlyResetDay || 0) : null,
  };
}

/** POST /api/loyalty/tiers body for a preset (as before: multiplier 1, no benefits, sortOrder = preset index). */
export function presetTierPayload(preset: TierPreset) {
  return {
    name: preset.name,
    threshold: preset.threshold,
    multiplier: 1,
    sortOrder: TIER_PRESETS.findIndex((p) => p.key === preset.key),
    benefits: '[]',
    color: preset.color,
    icon: preset.icon,
  };
}

/** PUT /api/loyalty/tiers/{id} body. */
export function tierPayload(tier: EditableTier) {
  return {
    name: tier.name.trim(),
    threshold: Number(tier.threshold || 0),
    multiplier: Number(tier.multiplier || 1),
    benefits: serializeBenefits(tier.benefitsText),
    color: tier.color || null,
    icon: tier.icon.trim() || null,
    sortOrder: Number(tier.sortOrder || 0),
  };
}

/** One preset row: the matching tier (by name), and whether it is the always-on default. */
export function presetRow(preset: TierPreset, tiers: EditableTier[]) {
  const existing = tiers.find((tier) => tier.name === preset.name) || null;
  const isDefault = preset.threshold === 0;
  return { existing, isDefault, enabled: isDefault || !!existing };
}

/** "10,000" → 10000; anything that is not a digit is dropped (as the old inputs did). */
export function parseDigits(raw: string): number {
  return Number(raw.replace(/[^0-9]/g, '') || 0);
}

/** Thousands with commas, as the old inputs showed them. */
export function formatThousands(value: number | null | undefined): string {
  return Math.round(Number(value || 0)).toLocaleString('en-US');
}

/**
 * Which inputs are locked, exactly as the old page: earn amounts need the program active and that
 * earn switch on; redeem fields and tiers need the program active; the earn switches and the expiry
 * section stay editable; the overview rules are always locked.
 */
export function locks(program: ProgramState, active: boolean) {
  return {
    rentAmounts: !program.rentEarnEnabled || !active,
    saleAmounts: !program.saleEarnEnabled || !active,
    redeem: !active,
    tiers: !active,
    overview: true,
  };
}
