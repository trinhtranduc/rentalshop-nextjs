/**
 * #546 shop web Khách thân thiết: pure model (same rules as the old shared LoyaltySettings).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_PROGRAM,
  TIER_PRESETS,
  accessFrom,
  formatThousands,
  locks,
  parseBenefitsText,
  parseDigits,
  parseSection,
  presetRow,
  presetTierPayload,
  programPayload,
  serializeBenefits,
  sortTiers,
  tierPayload,
  toEditableTier,
} from '../apps/client/app/loyalty/loyalty-model';

describe('parseSection', () => {
  it('known tabs pass, missing tab is overview without a URL fix', () => {
    expect(parseSection('tiers')).toEqual({ section: 'tiers', fixUrl: false });
    expect(parseSection(null)).toEqual({ section: 'overview', fixUrl: false });
  });
  it('an unknown tab falls back to overview and asks for a URL fix', () => {
    expect(parseSection('level')).toEqual({ section: 'overview', fixUrl: true });
  });
});

describe('accessFrom', () => {
  it('inactive program → inactive, defaults filled', () => {
    const { program, access } = accessFrom({ success: true, data: { id: 1, isActive: false, pointValue: 2000 } });
    expect(access).toBe('inactive');
    expect(program.pointValue).toBe(2000);
    expect(program.rentEarnPerAmount).toBe(10000);
    expect(program.pointsExpiryDays).toBeNull();
  });
  it('active program → available', () => {
    expect(accessFrom({ success: true, data: { id: 1, isActive: true } }).access).toBe('available');
  });
  it('no program yet → defaults, inactive', () => {
    expect(accessFrom({ success: true, data: null })).toEqual({ program: DEFAULT_PROGRAM, access: 'inactive' });
  });
  it('plan without loyalty → unavailable; other errors → inactive', () => {
    expect(accessFrom({ success: false, code: 'PLAN_UPGRADE_REQUIRED' }).access).toBe('unavailable');
    expect(accessFrom({ success: false, code: 'FORBIDDEN' }).access).toBe('inactive');
  });
});

describe('programPayload', () => {
  it('never sends isActive and keeps numbers as numbers', () => {
    const body = programPayload({ ...DEFAULT_PROGRAM, id: 1, isActive: true, name: '  Thân thiết ', rentEarnPerAmount: 20000 });
    expect(body).not.toHaveProperty('isActive');
    expect(body).not.toHaveProperty('id');
    expect(body.name).toBe('Thân thiết');
    expect(body.rentEarnPerAmount).toBe(20000);
  });
  it('expiry fields only for their mode', () => {
    const per = programPayload({ ...DEFAULT_PROGRAM, pointsExpiryMode: 'per_transaction', pointsExpiryDays: 90, yearlyResetMonth: 1, yearlyResetDay: 1 });
    expect([per.pointsExpiryDays, per.yearlyResetMonth, per.yearlyResetDay]).toEqual([90, null, null]);
    const yearly = programPayload({ ...DEFAULT_PROGRAM, pointsExpiryMode: 'yearly_reset', pointsExpiryDays: 90, yearlyResetMonth: 12, yearlyResetDay: 28 });
    expect([yearly.pointsExpiryDays, yearly.yearlyResetMonth, yearly.yearlyResetDay]).toEqual([null, 12, 28]);
    const never = programPayload({ ...DEFAULT_PROGRAM, pointsExpiryDays: 90 });
    expect([never.pointsExpiryMode, never.pointsExpiryDays]).toEqual(['never', null]);
  });
  it('blank name falls back to the default program name', () => {
    expect(programPayload({ ...DEFAULT_PROGRAM, name: '' }).name).toBe('Chương trình khách hàng thân thiết');
  });
});

describe('tiers', () => {
  it('benefits round-trip between JSON lines and text', () => {
    expect(parseBenefitsText('["Giảm 5%","Ưu tiên giữ đồ"]')).toBe('Giảm 5%\nƯu tiên giữ đồ');
    expect(parseBenefitsText('plain text')).toBe('plain text');
    expect(parseBenefitsText(null)).toBe('');
    expect(serializeBenefits(' Giảm 5% \n\n Ưu tiên ')).toBe('["Giảm 5%","Ưu tiên"]');
    expect(serializeBenefits('  ')).toBe('[]');
  });
  it('sorts by sortOrder, then threshold', () => {
    const rows = [
      { id: 1, sortOrder: 3, threshold: 0 },
      { id: 2, sortOrder: 1, threshold: 9 },
      { id: 3, sortOrder: 1, threshold: 5 },
    ];
    expect(sortTiers(rows).map((r) => r.id)).toEqual([3, 2, 1]);
  });
  it('preset payload uses the preset index as sortOrder', () => {
    expect(presetTierPayload(TIER_PRESETS[3])).toEqual({
      name: 'Vàng',
      threshold: 5000000,
      multiplier: 1,
      sortOrder: 3,
      benefits: '[]',
      color: '#FFD700',
      icon: 'crown',
    });
  });
  it('tier payload trims and defaults', () => {
    const tier = toEditableTier({ id: 9, name: ' Bạc ', threshold: 2000000, multiplier: 0, benefits: '["A"]', color: null, icon: null, sortOrder: 2 });
    expect(tierPayload(tier)).toEqual({ name: 'Bạc', threshold: 2000000, multiplier: 1, benefits: '["A"]', color: '#888888', icon: null, sortOrder: 2 });
  });
  it('preset rows match tiers by name; the 0-threshold preset is always on', () => {
    const tiers = [toEditableTier({ id: 1, name: 'Thành viên', threshold: 0, multiplier: 1 }), toEditableTier({ id: 5, name: 'Bạc', threshold: 2000000, multiplier: 1.5 })];
    expect(presetRow(TIER_PRESETS[0], tiers)).toMatchObject({ isDefault: true, enabled: true, existing: { id: 1 } });
    expect(presetRow(TIER_PRESETS[2], tiers)).toMatchObject({ isDefault: false, enabled: true, existing: { id: 5 } });
    expect(presetRow(TIER_PRESETS[3], tiers)).toEqual({ isDefault: false, enabled: false, existing: null });
  });
});

describe('numbers', () => {
  it('parseDigits drops separators and letters', () => {
    expect(parseDigits('10,000')).toBe(10000);
    expect(parseDigits('1.500.000đ')).toBe(1500000);
    expect(parseDigits('')).toBe(0);
  });
  it('formatThousands groups with commas', () => {
    expect(formatThousands(5000000)).toBe('5,000,000');
    expect(formatThousands(null)).toBe('0');
  });
});

describe('locks (same as the old page)', () => {
  it('inactive program: amounts, redeem and tiers locked; earn switches and expiry stay open', () => {
    expect(locks({ ...DEFAULT_PROGRAM }, false)).toEqual({ rentAmounts: true, saleAmounts: true, redeem: true, tiers: true, overview: true });
  });
  it('active program: amounts follow their switch', () => {
    expect(locks({ ...DEFAULT_PROGRAM, rentEarnEnabled: true, saleEarnEnabled: false }, true)).toEqual({
      rentAmounts: false,
      saleAmounts: true,
      redeem: false,
      tiers: false,
      overview: true,
    });
  });
});
