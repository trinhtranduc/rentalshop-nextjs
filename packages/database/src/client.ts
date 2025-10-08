import { PrismaClient } from '@prisma/client';

// Global Prisma client instance for singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Function to create Prisma client with error handling for Railway builds
function createPrismaClient() {
  // Skip Prisma initialization during Next.js build phase
  // Railway/Next.js: Build phase doesn't have DATABASE_URL and doesn't need Prisma
  if (!process.env.DATABASE_URL || process.env.RAILWAY_STATIC_URL) {
    console.warn('⚠️ Prisma Client skipped (build phase or no DATABASE_URL)');
    // Return minimal mock for build compatibility
    return {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $transaction: (fn: any) => fn({}),
    } as any;
  }

  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('❌ Prisma Client initialization failed:', error);
    throw error;
  }
}

// Create a singleton Prisma client instance
// Railway/Next.js: Lazy initialization to handle build-time issues
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store the instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
} 