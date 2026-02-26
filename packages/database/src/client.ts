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

// Lazy-load Prisma Client to avoid initialization errors during build time
// This ensures Prisma Client is only created when actually needed (runtime)
let prismaInstance: PrismaClientType | undefined;

function getPrismaClient(): PrismaClientType {
  if (prismaInstance) {
    return prismaInstance;
  }
  
  // Check global first (for development hot reload)
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }
  
  // Create new instance
  try {
    prismaInstance = createPrismaClient();
    
    // Store in global for development hot reload
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }
    
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

// Export Prisma client instance with lazy initialization
export const prisma = getPrismaClient(); 