// Use require instead of import to prevent Next.js from bundling Prisma Client
// Webpack externals configuration will ensure Prisma is loaded from node_modules at runtime
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const { PrismaClient } = require('@prisma/client');

// Global Prisma client instance for singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

// Create Prisma Client instance
function createPrismaClient(): PrismaClientType {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

// Export Prisma client instance with singleton pattern
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store in global for development hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} 