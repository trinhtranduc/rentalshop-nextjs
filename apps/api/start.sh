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

-- ✨ Add UserSession table if not exists (for single session enforcement)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='UserSession'
    ) THEN
        CREATE TABLE "UserSession" (
            "id" SERIAL NOT NULL,
            "userId" INTEGER NOT NULL,
            "sessionId" TEXT NOT NULL,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "invalidatedAt" TIMESTAMP(3),
            CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
        );
        
        CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
        CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");
        CREATE INDEX "UserSession_sessionId_idx" ON "UserSession"("sessionId");
        CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
        
        ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE '✨ Created UserSession table with indexes and foreign key';
    ELSE
        RAISE NOTICE 'UserSession table already exists';
    END IF;
END $$;
EOF

echo "✅ Database setup completed (currency + UserSession)"

# Generate Prisma Client (in case it's not generated)
echo "🔄 Ensuring Prisma Client is generated..."
npx prisma generate --schema=../../prisma/schema.prisma

# ✨ Run database migrations (apply all pending migrations)
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=../../prisma/schema.prisma || echo "⚠️ Migration failed or already applied"

# Start Next.js server
echo "🌐 Starting Next.js server on port 3002..."
exec ../../node_modules/.bin/next start -p 3002

