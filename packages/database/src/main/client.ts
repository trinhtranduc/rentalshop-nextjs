/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Main database (tenant registry) Prisma client loader.
 * Uses the generated client defined in prisma/main/schema.prisma.
 * The generated output lives at packages/database/src/generated/main after running:
 *
 *   yarn db:generate-main
 */

type MainPrismaClientCtor = new (...args: any[]) => {
  $disconnect(): Promise<void>;
};

let CachedMainPrismaClient: MainPrismaClientCtor | null = null;

function resolveMainPrismaClientCtor(): MainPrismaClientCtor {
  if (CachedMainPrismaClient) {
    return CachedMainPrismaClient;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment
    // @ts-ignore - module is generated at runtime via prisma generate
    const { PrismaClient } = require('../generated/main');
    CachedMainPrismaClient = PrismaClient as MainPrismaClientCtor;
    return CachedMainPrismaClient;
  } catch (error) {
    throw new Error(
      'Main Prisma client not found. Run "yarn db:generate-main" to generate the tenant registry client.'
    );
  }
}

const globalForMainPrisma = globalThis as unknown as {
  __mainPrismaClient?: any;
};

export const getMainPrismaClient = (): any => {
  if (globalForMainPrisma.__mainPrismaClient) {
    return globalForMainPrisma.__mainPrismaClient;
  }

  const PrismaClientCtor = resolveMainPrismaClientCtor();
  const client = new PrismaClientCtor({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForMainPrisma.__mainPrismaClient = client;
  }

  return client;
};

