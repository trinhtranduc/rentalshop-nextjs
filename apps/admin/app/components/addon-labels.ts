/** #850: Vietnamese labels of the add-on screens (mockup PjnxEfi3tXwS8GWM775kZY). */
import type { LimitKind } from '@rentalshop/utils';

export const KIND_UNIT: Record<LimitKind, string> = {
  outlets: 'chi nhánh',
  users: 'user',
  products: 'sản phẩm',
  customers: 'khách hàng',
  orders: 'đơn',
};

export const KIND_DEFAULT_NAME: Record<LimitKind, string> = {
  outlets: 'Thêm chi nhánh',
  users: 'Thêm nhân viên',
  products: 'Thêm sản phẩm',
  customers: 'Thêm khách hàng',
  orders: 'Thêm đơn',
};

export const KINDS: LimitKind[] = ['users', 'outlets', 'products', 'customers', 'orders'];

/** 30000 → "30.000 ₫" */
export function formatVnd(amount: number | null | undefined): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount) || 0))} ₫`;
}

/** "+2 user" */
export function plusLabel(kind: string | null | undefined, units: number | null | undefined): string {
  const unit = kind && kind in KIND_UNIT ? KIND_UNIT[kind as LimitKind] : '';
  return `+${new Intl.NumberFormat('vi-VN').format(Number(units) || 0)} ${unit}`.trim();
}

/** #943: modules sold as a feature add-on (on/off, no packs). Tính lương comes later and needs Chấm công. */
export const FEATURE_LABEL: Record<string, { name: string; hint: string }> = {
  attendance: { name: 'Chấm công', hint: 'QR + GPS, ca, bảng công' },
  // #967: on through the plan or this add-on
  loyalty: { name: 'Khách thân thiết', hint: 'Tích điểm, hạng, đổi điểm' },
};

/** #967 where a shop's feature comes from: "theo gói", "theo add-on", "theo gói + add-on"; null when off. */
export function featureSourceLabel(s: { active: boolean; plan: boolean; addon: boolean; legacy?: boolean }): string | null {
  if (!s.active) return null;
  const parts = [s.plan && 'gói', s.addon && 'add-on', s.legacy && 'Module cũ'].filter(Boolean);
  return parts.length ? `theo ${parts.join(' + ')}` : null;
}
export const FEATURE_KEYS = Object.keys(FEATURE_LABEL);

export const isFeatureKind = (kind: string | null | undefined) => kind === 'feature';

/** "Tính năng · Chấm công" */
export function featureLabel(featureKey: string | null | undefined): string {
  const f = featureKey ? FEATURE_LABEL[featureKey] : undefined;
  return `Tính năng · ${f?.name ?? featureKey ?? '—'}`;
}

export function appliesTo(kind: string): string {
  return kind === 'outlets' ? 'Chỉ gói nhiều chi nhánh (Enterprise)' : 'Mọi gói';
}
