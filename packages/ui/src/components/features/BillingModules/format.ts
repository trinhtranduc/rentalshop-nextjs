import type { BillingModuleLimits } from '@rentalshop/utils';

/** 100000 -> "100.000đ" (Vietnamese grouping, VND has no decimals). */
export function formatVnd(amount: number | null | undefined): string {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('vi-VN')}đ`;
}

/** Classes that make a Dialog full screen below 768 px (same as ManualRenewalModal). */
export const PHONE_DIALOG_CLASS =
  'max-w-xl max-h-[90vh] overflow-hidden flex flex-col max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:pb-0 max-md:gap-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5';

export const PHONE_DIALOG_BODY_CLASS =
  'space-y-4 overflow-y-auto flex-1 pr-2 max-md:min-h-0 max-md:pr-0 max-md:pb-4';

export const LIMIT_FIELDS: { key: keyof BillingModuleLimits; label: string; unit: string }[] = [
  { key: 'outlets', label: 'Chi nhánh', unit: 'chi nhánh' },
  { key: 'users', label: 'Nhân viên', unit: 'nhân viên' },
  { key: 'products', label: 'Sản phẩm', unit: 'sản phẩm' },
  { key: 'customers', label: 'Khách hàng', unit: 'khách hàng' },
  { key: 'orders', label: 'Đơn hàng', unit: 'đơn hàng' },
];

export const FEATURE_LABELS: Record<string, string> = {
  loyalty: 'Loyalty',
  payroll: 'Bảng lương',
};

/** "+1 nhân viên, +3 chi nhánh" for a quantity item, "Bật Loyalty" for a feature item. */
export function describeModule(m: { kind: string; limits?: BillingModuleLimits | null; featureKey?: string | null }): string {
  if (m.kind === 'feature') {
    return `Bật ${FEATURE_LABELS[m.featureKey || ''] || m.featureKey || 'tính năng'}`;
  }
  const parts = LIMIT_FIELDS.filter((f) => (m.limits?.[f.key] || 0) > 0).map((f) => `+${m.limits![f.key]} ${f.unit}`);
  return parts.join(', ') || '-';
}

const ERROR_TEXT: Record<string, string> = {
  MODULE_NOT_AVAILABLE_FOR_PLAN: 'Gói hiện tại không dùng được module này (module chi nhánh chỉ cho gói nhiều chi nhánh).',
  CANNOT_REMOVE_MODULE_LIMIT_EXCEEDED: 'Không bỏ được: số lượng đang dùng vượt giới hạn nếu không có module này. Giảm số chi nhánh / nhân viên trước.',
  MODULE_ALREADY_ACTIVE: 'Cửa hàng đã bật module này.',
  PLAN_HAS_BRANCH_MODULES: 'Cửa hàng còn module chi nhánh, bỏ module đó trước khi đổi sang gói một chi nhánh.',
  MODULE_NOT_FOUND: 'Không tìm thấy module.',
  INVALID_QUANTITY: 'Số lượng không hợp lệ.',
};

/** Readable Vietnamese text for an API error: known code first, then the API message unless it is just a code. */
export function moduleErrorText(res: { code?: string; message?: string } | null | undefined, fallback: string): string {
  if (res?.code && ERROR_TEXT[res.code]) return ERROR_TEXT[res.code];
  const msg = res?.message || '';
  if (msg && ERROR_TEXT[msg]) return ERROR_TEXT[msg];
  if (msg && !/^[A-Z0-9_]+$/.test(msg)) return msg;
  return fallback;
}
