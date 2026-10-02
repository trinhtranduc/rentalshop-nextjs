/**
 * Money on the order detail page. `totalAmount` is stored after discounts, so the subtotal is the
 * item sum. "To collect" follows the order state, with the same rules as iOS
 * (`OrderViewModel.getPaymentType`) and Android (`PaymentModels.actionFor`):
 * - rental, RESERVED  → at pickup: total − deposit already paid + security deposit
 * - rental, PICKUPED  → at return: damage fee + late fee − security deposit (negative = refund)
 * - sale, not COMPLETED/CANCELLED → the total
 * - otherwise nothing
 */
export interface OrderMoneyInput {
  orderType: string;
  status: string;
  orderItems?: Array<{ quantity?: number | null; unitPrice?: number | null; totalPrice?: number | null }> | null;
  totalAmount?: number | null;
  discountAmount?: number | null;
  loyaltyDiscount?: number | null;
  depositAmount?: number | null;
  lateFee?: number | null;
}

export interface OrderMoneySettings {
  securityDeposit?: number | null;
  damageFee?: number | null;
}

export type CollectStage = 'pickup' | 'return' | 'sale' | 'done';

export interface OrderMoney {
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
  deposit: number;
  securityDeposit: number;
  damageFee: number;
  lateFee: number;
  stage: CollectStage;
  /** Positive: collect from the customer. Negative: refund (return stage only). */
  collect: number;
}

export function computeOrderMoney(order: OrderMoneyInput, settings: OrderMoneySettings): OrderMoney {
  const items = order.orderItems || [];
  const discount = order.discountAmount || 0;
  const loyaltyDiscount = order.loyaltyDiscount || 0;
  const total = order.totalAmount || 0;
  const subtotal = items.length
    ? items.reduce((sum, item) => sum + (item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0)), 0)
    : total + discount + loyaltyDiscount;
  const isRent = order.orderType === 'RENT';
  const deposit = isRent ? order.depositAmount || 0 : 0;
  const securityDeposit = isRent ? settings.securityDeposit || 0 : 0;
  const damageFee = isRent ? settings.damageFee || 0 : 0;
  const lateFee = isRent ? order.lateFee || 0 : 0;

  let stage: CollectStage = 'done';
  let collect = 0;
  if (!isRent) {
    if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
      stage = 'sale';
      collect = total;
    }
  } else if (order.status === 'RESERVED') {
    stage = 'pickup';
    collect = Math.max(0, total - deposit + securityDeposit);
  } else if (order.status === 'PICKUPED') {
    stage = 'return';
    collect = damageFee + lateFee - securityDeposit;
  }

  return { subtotal, discount, loyaltyDiscount, total, deposit, securityDeposit, damageFee, lateFee, stage, collect };
}
