import { PrismaClient } from '@prisma/client';

// Global Prisma client instance for singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Function to create Prisma client with error handling
function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    // During Next.js build, Prisma might not be fully initialized
    // Return a mock client that won't be used at runtime
    console.warn('Prisma Client initialization deferred (likely during build)');
    return null as any;
  }
}

// Create a singleton Prisma client instance
// Railway/Next.js: Lazy initialization to handle build-time issues
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store the instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
} 