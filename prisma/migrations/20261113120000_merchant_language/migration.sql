-- #1539: shop language ('vi' | 'en') for emails, picked at sign-up. Nullable, no default, no backfill:
-- existing shops read as Vietnamese, the language of every email before this change.
ALTER TABLE "Merchant" ADD COLUMN "language" TEXT;
