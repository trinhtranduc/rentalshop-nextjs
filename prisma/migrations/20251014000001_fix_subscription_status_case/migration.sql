-- Fix subscription status case mismatch (lowercase → UPPERCASE)
-- This ensures status values match the constants in code

UPDATE "Subscription" SET status = 'TRIAL' WHERE status = 'trial';
UPDATE "Subscription" SET status = 'ACTIVE' WHERE status = 'active';
UPDATE "Subscription" SET status = 'PAUSED' WHERE status = 'paused';
UPDATE "Subscription" SET status = 'CANCELLED' WHERE status = 'cancelled';
UPDATE "Subscription" SET status = 'EXPIRED' WHERE status = 'expired';
UPDATE "Subscription" SET status = 'PAST_DUE' WHERE status = 'past_due' OR status = 'pastdue';

