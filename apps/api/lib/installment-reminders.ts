/**
 * Staff reminders for deposit stages (#1199): which stages are due today, due tomorrow, or late, for a set of outlets.
 * Display only (no message to the customer, no cron). Walks the RESERVED rent orders that have a plan and asks
 * `effectivePlan` for each; the automatic `rest` stage is not listed (the hand-over list already shows that order).
 */
import { addDaysToDateKey } from '../../../packages/utils/src/core/date-range';
import { effectivePlan } from '../../../packages/utils/src/core/deposit-plan';
import { daysBetweenDateKeys } from './outlet-operations-day';
import { loadShop } from './installments';

export const REMINDER_ROW_LIMIT = 50;
const ORDER_SCAN_LIMIT = 500;

export interface InstallmentReminderRow {
  orderId: number;
  orderNumber: string;
  outletId: number | null;
  customerName: string | null;
  key: string;
  label: string;
  amount: number;
  remaining: number;
  dueDateKey: string;
  lateDays: number;
}

export interface InstallmentReminderGroup {
  count: number;
  orders: InstallmentReminderRow[];
}

export async function loadInstallmentReminders(
  client: any,
  outletIds: number[],
  todayKey: string
): Promise<{
  installmentsDue: InstallmentReminderGroup;
  installmentsDueTomorrow: InstallmentReminderGroup;
  installmentsOverdue: InstallmentReminderGroup;
}> {
  const groups = {
    installmentsDue: [] as InstallmentReminderRow[],
    installmentsDueTomorrow: [] as InstallmentReminderRow[],
    installmentsOverdue: [] as InstallmentReminderRow[],
  };
  if (outletIds.length > 0) {
    const outlet = await client.outlet.findFirst({ where: { id: { in: outletIds } }, select: { merchantId: true } });
    const shop = await loadShop(client, outlet?.merchantId);
    const tomorrowKey = addDaysToDateKey(todayKey, 1);
    // Json columns cannot be filtered with "is not null" through the typed client; ask SQL for the ids first
    const planned: Array<{ id: number }> = await client.$queryRaw`
      SELECT "id" FROM "Order"
      WHERE "outletId" = ANY(${outletIds}::int[]) AND "status" = 'RESERVED' AND "orderType" = 'RENT'
        AND "deletedAt" IS NULL AND "depositPlan" IS NOT NULL
      ORDER BY "pickupPlanAt" ASC NULLS LAST
      LIMIT ${ORDER_SCAN_LIMIT}`;
    const orders = await client.order.findMany({
      where: { id: { in: planned.map((row) => row.id) } },
      select: {
        id: true,
        orderNumber: true,
        outletId: true,
        status: true,
        orderType: true,
        totalAmount: true,
        depositAmount: true,
        pickupTotalAmount: true,
        pickedUpAt: true,
        depositPlan: true,
        createdAt: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        customer: { select: { firstName: true, lastName: true } },
        payments: { where: { status: 'COMPLETED', notes: 'INSTALLMENT' }, select: { amount: true, status: true, notes: true, installmentKey: true, processedAt: true, createdAt: true } },
      },
      orderBy: { pickupPlanAt: 'asc' },
    });
    for (const order of orders as any[]) {
      const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ').trim() || null;
      for (const stage of effectivePlan(order, shop)) {
        if (stage.isRest || stage.remaining <= 0 || stage.status === 'VOID' || !stage.dueDateKey) continue;
        const row: InstallmentReminderRow = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          outletId: order.outletId ?? null,
          customerName,
          key: stage.key,
          label: stage.label,
          amount: stage.amount,
          remaining: stage.remaining,
          dueDateKey: stage.dueDateKey,
          lateDays: Math.max(0, daysBetweenDateKeys(stage.dueDateKey, todayKey)),
        };
        if (stage.dueDateKey < todayKey) groups.installmentsOverdue.push(row);
        else if (stage.dueDateKey === todayKey) groups.installmentsDue.push(row);
        else if (stage.dueDateKey === tomorrowKey) groups.installmentsDueTomorrow.push(row);
      }
    }
  }
  const pack = (rows: InstallmentReminderRow[]): InstallmentReminderGroup => ({
    count: rows.length,
    orders: rows.slice(0, REMINDER_ROW_LIMIT),
  });
  return {
    installmentsDue: pack(groups.installmentsDue),
    installmentsDueTomorrow: pack(groups.installmentsDueTomorrow),
    installmentsOverdue: pack(groups.installmentsOverdue.sort((a, b) => b.lateDays - a.lateDays)),
  };
}
