/**
 * #1459 Plain Vietnamese lines for the plan history (`SubscriptionActivity.description`) and payment rows written by the
 * billing webhooks. No product ids or SDK names; dates are the Vietnam civil day as dd/mm/yyyy.
 */
import { formatDateKeyInTimeZone } from '../../../packages/utils/src/core/date-range';
import type { BillingChannel } from './plan-renewal';

const VN = 'Asia/Ho_Chi_Minh';

/** 2027-11-02T02:00Z → "02/11/2027" (the Vietnam day) */
export function vnDate(instant: Date): string {
  const [y, m, d] = formatDateKeyInTimeZone(new Date(instant), VN).split('-');
  return `${d}/${m}/${y}`;
}

export function storeName(channel: BillingChannel): string {
  switch (channel) {
    case 'APP_STORE':
      return 'App Store';
    case 'PLAY_STORE':
      return 'Google Play';
    case 'LEMON':
      return 'Lemon Squeezy';
    default:
      return 'cửa hàng ứng dụng';
  }
}

/** "gói Basic 12 tháng" */
function planPeriod(planName: string, months: number): string {
  return `gói ${planName} ${months} tháng`;
}

export const planHistory = {
  purchase: (planName: string, months: number, channel: BillingChannel, end: Date) =>
    `Mua ${planPeriod(planName, months)} qua ${storeName(channel)}. Dùng đến ${vnDate(end)}.`,
  renewal: (planName: string, months: number, channel: BillingChannel, end: Date) =>
    `Tự gia hạn ${planPeriod(planName, months)} qua ${storeName(channel)}. Dùng đến ${vnDate(end)}.`,
  upgrade: (planName: string, months: number, channel: BillingChannel, end: Date) =>
    `Nâng lên ${planPeriod(planName, months)} qua ${storeName(channel)}. Dùng đến ${vnDate(end)}.`,
  changeNextPeriod: (planName: string, months: number, channel: BillingChannel) =>
    `Từ kỳ sau đổi sang ${planPeriod(planName, months)} (${storeName(channel)}).`,
  cancel: (channel: BillingChannel, end: Date) =>
    `Đã tắt tự gia hạn trên ${storeName(channel)}. Gói vẫn dùng đến ${vnDate(end)}.`,
  uncancel: (channel: BillingChannel) => `Đã bật lại tự gia hạn trên ${storeName(channel)}.`,
  refund: (channel: BillingChannel, end: Date) => `${storeName(channel)} đã hoàn tiền. Gói dừng từ ${vnDate(end)}.`,
  refundOtherProduct: (channel: BillingChannel) => `${storeName(channel)} đã hoàn tiền một lần trả trước. Gói hiện tại không đổi.`,
  billingIssue: (channel: BillingChannel) =>
    `${storeName(channel)} chưa thu được tiền gia hạn. Chủ shop cần kiểm tra cách thanh toán.`,
  expired: () => 'Gói đã hết hạn.',
  expirationIgnored: (end: Date) => `Cửa hàng ứng dụng báo hết hạn nhưng gói vẫn dùng đến ${vnDate(end)}.`,
  otherProductEvent: (channel: BillingChannel) => `${storeName(channel)} báo thay đổi của gói trước. Gói hiện tại không đổi.`,
  /** Payment row: "Gói Basic 12 tháng — gia hạn (App Store)" */
  payment: (planName: string, months: number, channel: BillingChannel, renewal: boolean) =>
    `Gói ${planName} ${months} tháng — ${renewal ? 'gia hạn' : 'mua mới'} (${storeName(channel)})`,
};
