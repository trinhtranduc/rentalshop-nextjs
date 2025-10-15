#!/bin/sh
set -e

echo "🚀 Starting API server..."

# Add currency columns directly via SQL (bypassing Prisma migrate for existing databases)
echo "📦 Adding currency columns to database..."

# Use psql to add columns if they don't exist
psql "$DATABASE_URL" << 'EOF' || echo "⚠️ SQL execution failed, columns might already exist"
-- Add currency to Merchant if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Merchant' AND column_name='currency'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
        RAISE NOTICE 'Added currency column to Merchant table';
    ELSE
        RAISE NOTICE 'Currency column already exists in Merchant table';
    END IF;
END $$;

-- Add currency to Subscription if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Subscription' AND column_name='currency'
    ) THEN
        ALTER TABLE "Subscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
        RAISE NOTICE 'Added currency column to Subscription table';
    ELSE
        RAISE NOTICE 'Currency column already exists in Subscription table';
    END IF;
END $$;

-- Add currency to Plan if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Plan' AND column_name='currency'
    ) THEN
        ALTER TABLE "Plan" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
        RAISE NOTICE 'Added currency column to Plan table';
    ELSE
        RAISE NOTICE 'Currency column already exists in Plan table';
    END IF;
END $$;

-- Add currency to PaymentTransaction if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='PaymentTransaction' AND column_name='currency'
    ) THEN
        ALTER TABLE "PaymentTransaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
        RAISE NOTICE 'Added currency column to PaymentTransaction table';
    ELSE
        RAISE NOTICE 'Currency column already exists in PaymentTransaction table';
    END IF;
END $$;

-- Add index on Subscription.currency if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename='Subscription' AND indexname='Subscription_currency_idx'
    ) THEN
        CREATE INDEX "Subscription_currency_idx" ON "Subscription"("currency");
        RAISE NOTICE 'Created index on Subscription.currency';
    ELSE
        RAISE NOTICE 'Index on Subscription.currency already exists';
    END IF;
END $$;
EOF

echo "✅ Currency columns setup completed"

# Generate Prisma Client (in case it's not generated)
echo "🔄 Ensuring Prisma Client is generated..."
npx prisma generate --schema=../../prisma/schema.prisma

# Start Next.js server
echo "🌐 Starting Next.js server on port 3002..."
exec ../../node_modules/.bin/next start -p 3002

