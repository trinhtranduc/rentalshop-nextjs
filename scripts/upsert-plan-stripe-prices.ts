import { PrismaClient } from '@prisma/client';

type Interval = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

/**
 * Usage:
 * 1) Ensure DATABASE_URL is set
 * 2) Run:
 *    yarn tsx scripts/upsert-plan-stripe-prices.ts
 *
 * Edit the mappings below to match your Stripe `price_...` IDs.
 */
const mappings: Array<{
  planId: number;
  currency?: string;
  prices: Record<Interval, string>;
}> = [
  // Example:
  // {
  //   planId: 1, // Basic
  //   currency: 'VND',
  //   prices: {
  //     monthly: 'price_...',
  //     quarterly: 'price_...',
  //     semi_annual: 'price_...',
  //     annual: 'price_...',
  //   },
  // },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    if (mappings.length === 0) {
      console.log('No mappings provided. Edit scripts/upsert-plan-stripe-prices.ts and add your price IDs.');
      return;
    }

    for (const map of mappings) {
      for (const [billingInterval, stripePriceId] of Object.entries(map.prices) as Array<[Interval, string]>) {
        // Prisma client types may be stale in editor; runtime client supports this model after `yarn db:generate`.
        const planStripePrice = (prisma as unknown as { planStripePrice: { upsert: Function } }).planStripePrice;
        await planStripePrice.upsert({
          where: {
            planId_billingInterval: {
              planId: map.planId,
              billingInterval,
            },
          },
          create: {
            planId: map.planId,
            billingInterval,
            stripePriceId,
            currency: map.currency,
            isActive: true,
          },
          update: {
            stripePriceId,
            currency: map.currency,
            isActive: true,
          },
        });
      }
    }

    console.log('Upsert completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

