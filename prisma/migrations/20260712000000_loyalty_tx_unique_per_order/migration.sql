-- Loyalty ledger integrity (see .kiro/specs/loyalty-program/architecture.md INV-4).
-- Enforce at the DB level: at most ONE 'earn' and ONE 'redeem' transaction per order.
-- Partial unique indexes are not expressible in the Prisma schema, so they live here.
-- These make earn/redeem idempotent and race-safe even under concurrent completions.

-- Defensive one-time cleanup: drop any pre-existing duplicate earn/redeem rows (keep the
-- earliest id per order+type) so the unique indexes below can be created. On a clean install
-- this is a no-op. After recreating the indexes, run POST /api/loyalty/recalculate to
-- reconcile balances if any rows were removed.
DELETE FROM "LoyaltyTransaction" a
USING "LoyaltyTransaction" b
WHERE a."type" = b."type"
  AND a."type" IN ('earn', 'redeem')
  AND a."orderId" IS NOT NULL
  AND a."orderId" = b."orderId"
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_tx_earn_once_per_order"
  ON "LoyaltyTransaction" ("orderId")
  WHERE "type" = 'earn';

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_tx_redeem_once_per_order"
  ON "LoyaltyTransaction" ("orderId")
  WHERE "type" = 'redeem';
