#!/usr/bin/env tsx
/**
 * #1486: write the Payments that manual plan extensions never left, dated at the moment of each extension, so the admin
 * "Plan revenue" block counts them in the right month.
 *
 * Step 1 (read only):   tsx scripts/backfill-manual-extension-payments.ts plan --out manual-extensions.csv
 *   Lists every extension activity that has no Payment. Review the CSV: `include` is "yes" for the ready rows (the amount
 *   is the one stored with the extension); the admin-route rows have no stored amount, so `amount` is an ESTIMATE from the
 *   current Subscription (else the plan price) and `include` is empty: set "yes" where the money was received, fix `amount` if it was another price,
 *   leave empty where the extension was free. Nothing is written.
 * Step 2 (writes):      tsx scripts/backfill-manual-extension-payments.ts apply --csv manual-extensions.csv [--confirm-write]
 *   Without --confirm-write it only prints what it would insert. Each Payment: PLAN_EXTENSION / COMPLETED / MANUAL,
 *   processedAt = the activity time, transactionId `backfill-1486-act-<activityId>` (so a second run inserts nothing).
 *
 * Pending plan payments (an upgrade, an add-on or a renewal by transfer / manual / cash was written PENDING before #1486,
 * so the Plan revenue left it out):
 *   tsx scripts/backfill-manual-extension-payments.ts pending --out pending-payments.csv      (read only)
 *   tsx scripts/backfill-manual-extension-payments.ts complete --csv pending-payments.csv [--confirm-write]
 *   `include` is empty: set "yes" where the money was received. `complete` sets status COMPLETED and processedAt (kept, else
 *   the creation time = the payment date), only for rows still PENDING.
 * Uses DATABASE_URL from the environment; the database host is printed before anything is read or written.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import {
  ACTIVITY_TYPES,
  TRANSACTION_PREFIX,
  PENDING_METHODS,
  PENDING_TYPES,
  approvedPaymentIds,
  approvedRows,
  parseCsv,
  pendingToCsv,
  planBackfill,
  toCsv,
  transactionIdOf,
} from './lib/manual-extension-backfill';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function describeDatabase(): string {
  try {
    const url = new URL(process.env.DATABASE_URL || '');
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return 'DATABASE_URL not set or not a URL';
  }
}

async function load() {
  const activities = await prisma.subscriptionActivity.findMany({
    where: { type: { in: ACTIVITY_TYPES } },
    orderBy: { id: 'asc' },
    select: { id: true, subscriptionId: true, type: true, metadata: true, createdAt: true },
  });
  const subscriptionIds = [...new Set(activities.map((a) => a.subscriptionId))];
  const subscriptions = await prisma.subscription.findMany({
    where: { id: { in: subscriptionIds } },
    select: { id: true, merchantId: true, currency: true, amount: true, period: true, merchant: { select: { name: true } }, plan: { select: { basePrice: true } } },
  });
  const payments = await prisma.payment.findMany({
    where: { subscriptionId: { in: subscriptionIds }, type: { in: ['SUBSCRIPTION_PAYMENT', 'PLAN_EXTENSION', 'PLAN_CHANGE'] as any }, status: { in: ['COMPLETED', 'REFUNDED'] as any } },
    select: { subscriptionId: true, transactionId: true, processedAt: true, createdAt: true },
  });
  return {
    activities,
    subscriptions: subscriptions.map((s) => ({ id: s.id, merchantId: s.merchantId, currency: s.currency, amount: s.amount, period: s.period, merchantName: s.merchant?.name ?? null, planBasePrice: s.plan?.basePrice ?? null })),
    payments,
  };
}

async function plan() {
  const out = flag('--out') || 'manual-extensions.csv';
  const data = await load();
  const candidates = planBackfill(data);
  fs.writeFileSync(out, toCsv(candidates));
  const count = (status: string) => candidates.filter((c) => c.status === status).length;
  const skipped = candidates.filter((c) => c.status === 'skip');
  const reasons = new Map<string, number>();
  for (const c of skipped) reasons.set(c.reason, (reasons.get(c.reason) ?? 0) + 1);
  console.log(`activities: ${candidates.length} | ready: ${count('ready')} | estimated: ${count('estimated')} | needs amount: ${count('needs-amount')} | skipped: ${skipped.length}`);
  for (const [reason, n] of reasons) console.log(`  skipped ${n}: ${reason}`);
  console.log(`written: ${out} (nothing was written to the database)`);
}

async function apply() {
  const file = flag('--csv');
  if (!file) throw new Error('apply needs --csv <reviewed file>');
  const write = args.includes('--confirm-write');
  const { rows, problems } = approvedRows(parseCsv(fs.readFileSync(file, 'utf8')));
  if (problems.length) {
    console.error('Fix the CSV first:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const data = await load();
  const byActivity = new Map(planBackfill(data).map((c) => [c.activityId, c]));
  let inserted = 0;
  let total = 0;
  for (const row of rows) {
    const c = byActivity.get(row.activityId);
    if (!c || c.merchantId == null) { console.log(`skip activity ${row.activityId}: not found`); continue; }
    if (c.status === 'skip') {
      console.log(`skip activity ${row.activityId}: ${c.reason}`);
      continue;
    }
    const label = `activity ${row.activityId} merchant ${c.merchantId} ${c.at.toISOString()} ${row.amount} ${c.currency}`;
    if (!write) { console.log(`would insert: ${label}`); inserted++; total += row.amount; continue; }
    await prisma.payment.create({
      data: {
        amount: row.amount,
        currency: c.currency,
        method: 'MANUAL' as any,
        type: 'PLAN_EXTENSION' as any,
        status: 'COMPLETED' as any,
        transactionId: transactionIdOf(row.activityId),
        description: `Back-fill #1486: manual extension (activity ${row.activityId})`,
        metadata: JSON.stringify({ backfill: 1486, activityId: row.activityId }),
        processedAt: c.at,
        createdAt: c.at,
        merchantId: c.merchantId,
        subscriptionId: c.subscriptionId,
      },
    });
    console.log(`inserted: ${label}`);
    inserted++;
    total += row.amount;
  }
  console.log(`${write ? 'inserted' : 'would insert'} ${inserted} payment(s), total ${total}. ${write ? '' : 'Add --confirm-write to write.'}`);
}

async function pending() {
  const out = flag('--out') || 'pending-payments.csv';
  const rows = await prisma.payment.findMany({
    where: { status: 'PENDING' as any, type: { in: PENDING_TYPES as any }, method: { in: PENDING_METHODS as any } },
    orderBy: { id: 'asc' },
    select: {
      id: true, merchantId: true, type: true, method: true, amount: true, currency: true, processedAt: true, createdAt: true,
      processedBy: true, transactionId: true, description: true, merchant: { select: { name: true } },
    },
  });
  fs.writeFileSync(out, pendingToCsv(rows.map((r) => ({ ...r, type: String(r.type), method: String(r.method), merchantName: r.merchant?.name ?? null }))));
  console.log(`pending plan payments: ${rows.length}; written: ${out} (nothing was written to the database)`);
}

async function complete() {
  const file = flag('--csv');
  if (!file) throw new Error('complete needs --csv <reviewed file>');
  const write = args.includes('--confirm-write');
  const { ids, problems } = approvedPaymentIds(parseCsv(fs.readFileSync(file, 'utf8')));
  if (problems.length) {
    console.error('Fix the CSV first:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  let done = 0;
  for (const id of ids) {
    const row = await prisma.payment.findUnique({ where: { id }, select: { id: true, status: true, type: true, method: true, amount: true, processedAt: true, createdAt: true } });
    if (!row || String(row.status) !== 'PENDING' || !PENDING_TYPES.includes(String(row.type)) || !PENDING_METHODS.includes(String(row.method))) {
      console.log(`skip payment ${id}: not a pending plan payment`);
      continue;
    }
    const at = row.processedAt ?? row.createdAt;
    if (!write) { console.log(`would complete: payment ${id} ${row.amount} at ${at.toISOString()}`); done++; continue; }
    const result = await prisma.payment.updateMany({ where: { id, status: 'PENDING' as any }, data: { status: 'COMPLETED' as any, processedAt: at } });
    console.log(result.count ? `completed: payment ${id} ${row.amount} at ${at.toISOString()}` : `skip payment ${id}: changed meanwhile`);
    done += result.count;
  }
  console.log(`${write ? 'completed' : 'would complete'} ${done} payment(s). ${write ? '' : 'Add --confirm-write to write.'}`);
}

async function main() {
  console.log(`database: ${describeDatabase()}  (transaction ids: ${TRANSACTION_PREFIX}<activityId>)`);
  if (command === 'plan') await plan();
  else if (command === 'apply') await apply();
  else if (command === 'pending') await pending();
  else if (command === 'complete') await complete();
  else {
    console.error('usage: plan --out <file.csv> | apply --csv <file.csv> [--confirm-write] | pending --out <file.csv> | complete --csv <file.csv> [--confirm-write]');
    process.exit(1);
  }
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
