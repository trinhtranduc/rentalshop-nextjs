/**
 * Provision a default inactive LoyaltyProgram for a merchant.
 *
 * Kept in @rentalshop/database (not @rentalshop/loyalty) so registration can
 * run inside the same Prisma transaction without a circular package dependency.
 *
 * Super Admin enables the program later via isActive; merchants configure rates/tiers.
 */

export const DEFAULT_LOYALTY_PROGRAM_NAME = 'Chương trình khách hàng thân thiết';
export const DEFAULT_LOYALTY_TIER_NAME = 'Thành viên';

/** Minimal Prisma client / interactive transaction shape used here */
export type LoyaltyProvisionClient = {
  loyaltyProgram: {
    findUnique: (args: { where: { merchantId: number } }) => Promise<{ id: number } | null>;
    create: (args: {
      data: {
        merchantId: number;
        name: string;
        isActive: boolean;
      };
    }) => Promise<{ id: number; merchantId: number; isActive: boolean; name: string }>;
  };
  loyaltyTier: {
    findFirst: (args: {
      where: { programId: number; threshold: number };
      orderBy: { sortOrder: 'asc' };
    }) => Promise<{ id: number } | null>;
    create: (args: {
      data: {
        programId: number;
        name: string;
        threshold: number;
        multiplier: number;
        color: string;
        sortOrder: number;
      };
    }) => Promise<{ id: number }>;
  };
};

/**
 * Create default inactive loyalty program + base tier if missing.
 * Idempotent — safe to call on registration, merchant create, and backfill.
 */
export async function provisionDefaultLoyaltyProgram(
  client: LoyaltyProvisionClient,
  merchantId: number
) {
  const existing = await client.loyaltyProgram.findUnique({
    where: { merchantId },
  });

  if (existing) {
    await ensureDefaultLoyaltyTier(client, existing.id);
    return existing;
  }

  const program = await client.loyaltyProgram.create({
    data: {
      merchantId,
      name: DEFAULT_LOYALTY_PROGRAM_NAME,
      // Always start inactive — only Super Admin enables the program.
      isActive: false,
    },
  });

  await ensureDefaultLoyaltyTier(client, program.id);
  return program;
}

async function ensureDefaultLoyaltyTier(
  client: LoyaltyProvisionClient,
  programId: number
) {
  const existing = await client.loyaltyTier.findFirst({
    where: { programId, threshold: 0 },
    orderBy: { sortOrder: 'asc' },
  });

  if (existing) return existing;

  return client.loyaltyTier.create({
    data: {
      programId,
      name: DEFAULT_LOYALTY_TIER_NAME,
      threshold: 0,
      multiplier: 1,
      color: '#888888',
      sortOrder: 0,
    },
  });
}
