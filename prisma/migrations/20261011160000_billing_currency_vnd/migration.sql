-- #821: plans, subscriptions and plan payments are billed in VND. They were stored as 'USD' although the prices
-- are VND (79,000 / 199,000 / 399,000). Data update + new column defaults only: no DROP, no type change, no NOT NULL.
-- Rows whose amount looks like a real USD price (between 0 and 1000, exclusive) are left alone.
UPDATE "Plan" SET "currency" = 'VND'
 WHERE "currency" = 'USD' AND ("basePrice" = 0 OR "basePrice" >= 1000);

UPDATE "Subscription" SET "currency" = 'VND'
 WHERE "currency" = 'USD' AND ("amount" = 0 OR "amount" >= 1000);

UPDATE "Payment" SET "currency" = 'VND'
 WHERE "currency" = 'USD' AND ("amount" = 0 OR "amount" >= 1000);

ALTER TABLE "Plan" ALTER COLUMN "currency" SET DEFAULT 'VND';
ALTER TABLE "Subscription" ALTER COLUMN "currency" SET DEFAULT 'VND';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'VND';
