-- AlterTable: Add currency field to Merchant table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='Merchant' AND column_name='currency') THEN
        ALTER TABLE "Merchant" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
END $$;

-- AlterTable: Add currency field to Subscription table if not exists  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='Subscription' AND column_name='currency') THEN
        ALTER TABLE "Subscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
END $$;

-- AlterTable: Add currency field to Plan table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='Plan' AND column_name='currency') THEN
        ALTER TABLE "Plan" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
END $$;

-- AlterTable: Add currency field to PaymentTransaction table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='PaymentTransaction' AND column_name='currency') THEN
        ALTER TABLE "PaymentTransaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
END $$;

-- CreateIndex: Add index on Subscription.currency if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename='Subscription' AND indexname='Subscription_currency_idx') THEN
        CREATE INDEX "Subscription_currency_idx" ON "Subscription"("currency");
    END IF;
END $$;

