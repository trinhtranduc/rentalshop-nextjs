import type { PrismaClient as PrismaClientType } from '@prisma/client';

// Global Prisma client instance for singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

// Lazy load Prisma Client to avoid build-time issues
function getPrismaClient(): PrismaClientType {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Dynamic import of PrismaClient
  const { PrismaClient } = require('@prisma/client');
  
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Store the instance globally in development to prevent multiple instances
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Export Prisma client instance with lazy initialization
export const prisma = new Proxy({} as PrismaClientType, {
  get(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  },
}); 