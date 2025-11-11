import type { PrismaClient } from '@prisma/client';
import { PrismaClient as PrismaClientCtor } from '@prisma/client';

type PrismaLogOption = ('query' | 'error' | 'warn')[];

const getLogOptions = (): PrismaLogOption => {
  return process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];
};

// Global Prisma client instance for singleton pattern (default tenant)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClientCtor({
    log: getLogOptions(),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export const createPrismaClientForUrl = (databaseUrl: string): PrismaClient => {
  return new PrismaClientCtor({
    log: getLogOptions(),
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

type AsyncLocalStorageType<T> = import('node:async_hooks').AsyncLocalStorage<T>;

let prismaContextRef: AsyncLocalStorageType<PrismaClient> | null = null;

function ensurePrismaContext(): AsyncLocalStorageType<PrismaClient> | null {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!prismaContextRef) {
    const { AsyncLocalStorage } = eval('require')('node:async_hooks') as typeof import('node:async_hooks');
    prismaContextRef = new AsyncLocalStorage<PrismaClient>();
  }

  return prismaContextRef;
}

const getActivePrisma = (): PrismaClient => {
  const context = ensurePrismaContext();
  return context?.getStore() ?? basePrisma;
};

export const runWithPrismaClient = async <T>(
  prismaClient: PrismaClient,
  callback: () => Promise<T>
): Promise<T> => {
  const context = ensurePrismaContext();
  if (!context) {
    return callback();
  }
  return context.run(prismaClient, callback);
};

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getActivePrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});