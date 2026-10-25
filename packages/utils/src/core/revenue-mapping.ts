/**
 * The two places every revenue screen shares (issue #1199):
 *
 * - `toRevenueOrderData`: an Order row -> the input of `revenue-calculator.ts`. Was copied by hand in 13 places.
 * - `buildEventWhere`: the Prisma `OR` that selects the orders having a revenue event in a period
 *   (created / picked up / returned / cancelled / sale completed / planned). Was written by hand in 7 places.
 *
 * Keep any new source of revenue events (for example a Payment taken in the period) here, so every screen
 * selects and maps orders the same way. Pure refactor of the old inline code: same fields, same query shapes.
 */
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import type { OrderRevenueData, OrderRevenuePlan } from './revenue-calculator';
import {
  effectivePlan,
  parseDepositPlan,
  unpaidExplicitStages,
  INSTALLMENT_PAYMENT_NOTE,
  REST_KEY,
  type PlanPaymentLike
} from './deposit-plan';

/** `Payment.notes` of the refund a cancellation gives back (#1199) */
export const CANCEL_REFUND_NOTE = 'CANCEL_REFUND';

/**
 * #1199: the fields a revenue `select` adds so deposit plans are counted. The payments filter keeps the extra rows to
 * the plan's own payments (none for an order without a plan), and only the columns the mapper reads.
 */
export const REVENUE_PLAN_SELECT = {
  depositPlan: true as const,
  cancelKeptAmount: true as const,
  cancelledAt: true as const,
  payments: {
    where: {
      OR: [
        { status: 'COMPLETED' as const, notes: INSTALLMENT_PAYMENT_NOTE },
        { status: 'REFUNDED' as const, notes: CANCEL_REFUND_NOTE }
      ]
    },
    select: {
      amount: true as const,
      status: true as const,
      notes: true as const,
      installmentKey: true as const,
      processedAt: true as const,
      createdAt: true as const,
      type: true as const
    }
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** An Order row as the analytics routes read it: only the fields the calculator needs (a `select` may omit some) */
export interface RevenueOrderRow {
  orderType: string;
  status: string;
  totalAmount?: number | null;
  depositAmount?: number | null;
  securityDeposit?: number | null;
  damageFee?: number | null;
  lateFee?: number | null;
  pickupTotalAmount?: number | null;
  createdAt?: Date | string | null;
  pickedUpAt?: Date | string | null;
  returnedAt?: Date | string | null;
  pickupPlanAt?: Date | string | null;
  returnPlanAt?: Date | string | null;
  updatedAt?: Date | string | null;
  /** #1199: present when the `select` added `REVENUE_PLAN_SELECT` */
  depositPlan?: unknown;
  cancelKeptAmount?: number | null;
  cancelledAt?: Date | string | null;
  payments?: PlanPaymentLike[] | null;
}

function toPlan(order: RevenueOrderRow): OrderRevenuePlan | null {
  const payments = order.payments || [];
  const isCollected = (p: PlanPaymentLike) => p.status === 'COMPLETED' && p.notes === INSTALLMENT_PAYMENT_NOTE;
  const isRefund = (p: PlanPaymentLike) => p.status === 'REFUNDED' && p.notes === CANCEL_REFUND_NOTE;
  const hasPlan = parseDepositPlan(order.depositPlan) != null;
  if (!hasPlan && !payments.some((p) => isCollected(p) || isRefund(p))) return null;
  const money = (p: PlanPaymentLike) => ({ amount: p.amount || 0, at: (p.processedAt ?? p.createdAt) as Date | string });
  const stages = hasPlan
    ? effectivePlan(
        {
          status: order.status,
          orderType: order.orderType,
          totalAmount: order.totalAmount,
          pickupTotalAmount: order.pickupTotalAmount,
          depositAmount: order.depositAmount,
          depositPlan: order.depositPlan,
          createdAt: order.createdAt,
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          pickedUpAt: order.pickedUpAt,
          payments
        },
        {}
      )
    : [];
  return {
    collected: payments.filter(isCollected).map(money),
    refunded: payments.filter(isRefund).map(money),
    keptAmount: order.cancelKeptAmount ?? null,
    unpaid: unpaidExplicitStages(stages).map((s) => ({
      key: s.key,
      label: s.label,
      amount: s.amount,
      dueDateKey: s.dueDateKey
    })),
    restAmount: stages.find((s) => s.key === REST_KEY)?.amount ?? Math.max(0, (order.totalAmount || 0) - (order.depositAmount || 0))
  };
}

/**
 * Order row -> calculator input. Money fields default to 0, `pickupTotalAmount` to null (#505: null = use the
 * total); dates pass through untouched (a missing date stays missing).
 */
export function toRevenueOrderData(order: RevenueOrderRow): OrderRevenueData {
  const plan = order.orderType === ORDER_TYPE.RENT ? toPlan(order) : null;
  return {
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount || 0,
    depositAmount: order.depositAmount || 0,
    securityDeposit: order.securityDeposit || 0,
    damageFee: order.damageFee || 0,
    lateFee: order.lateFee || 0,
    pickupTotalAmount: order.pickupTotalAmount ?? null,
    createdAt: order.createdAt as OrderRevenueData['createdAt'],
    pickedUpAt: order.pickedUpAt as OrderRevenueData['pickedUpAt'],
    returnedAt: order.returnedAt as OrderRevenueData['returnedAt'],
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    updatedAt: order.updatedAt,
    ...(plan ? { plan, cancelledAt: order.cancelledAt } : {})
  };
}

/** UTC bounds of the period whose events are looked for */
export interface EventWhereRange {
  start: Date;
  end: Date;
}

/** Which events select an order, and how wide the pickup / return window is. Each screen keeps the shape it had. */
export interface EventWhereOptions {
  /** Pickup and return windows reach this many ms before `start` and after `end` (timezone margin). Default 0. */
  pickupReturnMarginMs?: number;
  /** `pickedUpAt` / `returnedAt` also say `not: null`. Default true. */
  requireEventDates?: boolean;
  /** CANCELLED orders updated in the period: `{ AND: [status, updatedAt] }` or the flat `{ updatedAt, status }`. */
  cancelledShape?: 'and' | 'flat';
  /** Also COMPLETED sales updated in the period (a sale has no pickup / return). Default false. */
  includeSaleCompleted?: boolean;
  /** Also orders whose `pickupPlanAt` / `returnPlanAt` falls in the period (expected income). Default false. */
  includePlans?: boolean;
}

/** Daily income, income summary, income orders list: the SQL range is already one civil day wider per side */
export const EVENT_WHERE_CIVIL: EventWhereOptions = {
  cancelledShape: 'and',
  includeSaleCompleted: true
};

/** Monthly income, period report, growth metrics: a day of margin on pickups/returns, plus planned dates */
export const EVENT_WHERE_PERIOD: EventWhereOptions = {
  pickupReturnMarginMs: DAY_MS,
  cancelledShape: 'flat',
  includePlans: true
};

/** System analytics: the four plain events, dates as given */
export const EVENT_WHERE_BASIC: EventWhereOptions = {
  cancelledShape: 'flat',
  requireEventDates: false
};

/**
 * The `{ OR: [...] }` that selects orders with a revenue event in `range`. Callers add `deletedAt` and the outlet scope.
 */
export function buildEventWhere(range: EventWhereRange, options: EventWhereOptions = EVENT_WHERE_CIVIL) {
  const {
    pickupReturnMarginMs = 0,
    requireEventDates = true,
    cancelledShape = 'and',
    includeSaleCompleted = false,
    includePlans = false
  } = options;
  const { start, end } = range;
  const inRange = { gte: start, lte: end };
  const eventWindow = () => ({
    gte: pickupReturnMarginMs ? new Date(start.getTime() - pickupReturnMarginMs) : start,
    lte: pickupReturnMarginMs ? new Date(end.getTime() + pickupReturnMarginMs) : end,
    ...(requireEventDates ? { not: null } : {})
  });
  const plannedIn = () => ({ gte: start, lte: end, not: null });
  // #1199: a stage collected or refunded in the period is an event, whatever happened to the order's own dates
  const paymentIn = {
    payments: {
      some: {
        status: { in: ['COMPLETED', 'REFUNDED'] },
        notes: { in: [INSTALLMENT_PAYMENT_NOTE, CANCEL_REFUND_NOTE] },
        processedAt: { gte: start, lte: end }
      }
    }
  };

  const or: Record<string, any>[] = [
    { createdAt: inRange },
    { pickedUpAt: eventWindow() },
    { returnedAt: eventWindow() },
    cancelledShape === 'and'
      ? { AND: [{ status: ORDER_STATUS.CANCELLED }, { updatedAt: { ...inRange } }] }
      : { updatedAt: { ...inRange }, status: ORDER_STATUS.CANCELLED as any }
  ];
  if (includeSaleCompleted) {
    or.push({
      AND: [{ orderType: ORDER_TYPE.SALE }, { status: ORDER_STATUS.COMPLETED }, { updatedAt: { ...inRange } }]
    });
  }
  if (includePlans) {
    or.push({ pickupPlanAt: plannedIn() }, { returnPlanAt: plannedIn() });
  }
  or.push(paymentIn);
  return { OR: or };
}
