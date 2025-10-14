# Railway Migration Trigger

This file exists solely to trigger Railway deployment.

Last updated: 2025-10-14T08:40:00Z

## Migrations to Apply:
1. `20251014000000_remove_merchant_subscription_status` - Remove duplicate subscriptionStatus column
2. `20251014000001_fix_subscription_status_case` - Fix status case mismatch (lowercase → UPPERCASE)

## Expected Build Process:
```bash
npx prisma migrate deploy --schema=../../prisma/schema.prisma
npx prisma generate --schema=../../prisma/schema.prisma
next build
```

