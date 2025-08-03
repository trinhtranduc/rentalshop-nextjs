// Export Prisma client
export { PrismaClient } from '@prisma/client';

// Export database utilities
export * from './client';
export * from './types';

// Create and export a singleton Prisma client instance
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} 