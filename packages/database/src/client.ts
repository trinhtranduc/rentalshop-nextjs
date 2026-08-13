// Use require instead of import to prevent Next.js from bundling Prisma Client
// Webpack externals configuration will ensure Prisma is loaded from node_modules at runtime
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const { PrismaClient } = require('@prisma/client');

// Global Prisma client instance for singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

/**
 * Cap Prisma's pool size so multiple API replicas / restarts don't exhaust Postgres.
 * Railway Postgres often has ~100 max_connections; default Prisma pool is
 * ~num_cpus*2+1 per process which adds up quickly.
 */
function withPoolParams(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set(
        'connection_limit',
        process.env.PRISMA_CONNECTION_LIMIT || '5'
      );
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set(
        'pool_timeout',
        process.env.PRISMA_POOL_TIMEOUT || '20'
      );
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '10');
    }
    return u.toString();
  } catch {
    return url;
  }
}

// Create Prisma Client instance
function createPrismaClient(): PrismaClientType {
  try {
    const url = withPoolParams(process.env.DATABASE_URL);
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      ...(url ? { datasources: { db: { url } } } : {}),
    });
    return client;
  } catch (error: any) {
    console.error('❌ PRISMA CLIENT CREATION FAILED:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
    });
    throw error;
  }
}

// Lazy-load Prisma Client to avoid initialization errors during build time
// This ensures Prisma Client is only created when actually needed (runtime)
let prismaInstance: PrismaClientType | undefined;

function getPrismaClient(): PrismaClientType {
  if (prismaInstance) {
    return prismaInstance;
  }

  // Prefer global singleton (protects against duplicate module graphs in Next.js)
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }

  // Create new instance
  try {
    prismaInstance = createPrismaClient();
    // Always pin on globalThis — production used to skip this and could leak pools
    // when the same process loaded the module more than once.
    globalForPrisma.prisma = prismaInstance;

    return prismaInstance;
  } catch (error: any) {
    // In build time, Prisma Client might not be initialized yet
    // Return a proxy that will throw a helpful error if used
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('⚠️ Prisma Client not initialized during build - this is expected');
      // Return a proxy that throws a helpful error
      return new Proxy({} as PrismaClientType, {
        get() {
          throw new Error('Prisma Client is not available during build time. Please ensure prisma generate is run before building.');
        }
      });
    }
    throw error;
  }
}

function createPrismaProxy(): PrismaClientType {
  return new Proxy({} as PrismaClientType, {
    get(_target, prop, receiver) {
      const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
      const value = Reflect.get(client, prop, receiver);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

// Export Prisma client as a lazy proxy so importing database modules does not
// eagerly initialize the Prisma engine during build-time analysis.
export const prisma = createPrismaProxy();
