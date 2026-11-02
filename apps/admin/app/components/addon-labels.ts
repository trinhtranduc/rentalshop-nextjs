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

/** #1187 extra branches sell on any plan. #782 loyalty: not where the plan has it, and not on Basic for now. */
export function appliesTo(kind: string, featureKey?: string | null): string {
  return isFeatureKind(kind) && featureKey === 'loyalty' ? 'Gói chưa có sẵn tính năng, trừ Basic' : 'Mọi gói';
}

type RowLike = { limitKind?: string | null; packSize?: number | null };
const unitOf = (kind: string | null | undefined) => (kind && kind in KIND_UNIT ? KIND_UNIT[kind as LimitKind] : '');

/** #782: a limit row with pack size 1 is priced per unit, and admin types the amount. Older rows keep packs. */
export const isUnitRow = (row: RowLike) => !isFeatureKind(row.limitKind) && row.packSize === 1;

/** "Số sản phẩm cộng thêm" on a unit row, "Số gói" on an older pack row. */
export const amountLabel = (row: RowLike) => (isUnitRow(row) ? `Số ${unitOf(row.limitKind)} cộng thêm` : 'Số gói');

/** "100 sản phẩm" on a unit row, "2 gói" on an older pack row. */
export function amountText(row: RowLike, amount: number): string {
  const n = new Intl.NumberFormat('vi-VN').format(amount);
  return isUnitRow(row) ? `${n} ${unitOf(row.limitKind)}` : `${n} gói`;
}

/** What one price of the row buys: "tháng", "sản phẩm", "gói 100 sản phẩm". */
export function priceUnit(row: RowLike): string {
  if (isFeatureKind(row.limitKind)) return 'tháng';
  return isUnitRow(row) ? unitOf(row.limitKind) : `gói ${row.packSize} ${unitOf(row.limitKind)}`;
}
