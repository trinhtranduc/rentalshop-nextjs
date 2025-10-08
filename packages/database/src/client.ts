// Lazy import Prisma Client to prevent bundling during build
let PrismaClient: any;
let prismaInstance: any;

// Function to get or create Prisma client with lazy loading
function getPrismaClient() {
  // Skip Prisma during build phase when DATABASE_URL is placeholder
  // Railway sets DATABASE_URL=postgresql://placeholder during build
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('placeholder')) {
    console.warn('⚠️ Prisma Client skipped (build phase)');
    // Return minimal mock for build compatibility
    return {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $transaction: (fn: any) => fn({}),
    } as any;
  }

  // Lazy load PrismaClient only when DATABASE_URL is real
  if (!PrismaClient) {
    try {
      PrismaClient = require('@prisma/client').PrismaClient;
    } catch (error) {
      console.error('❌ Failed to load Prisma Client:', error);
      throw error;
    }
  }

  // Create singleton instance
  if (!prismaInstance) {
    try {
      prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    } catch (error) {
      console.error('❌ Prisma Client initialization failed:', error);
      throw error;
    }
  }

  return prismaInstance;
}

// Export a Proxy that lazy-loads Prisma Client on first access
export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getPrismaClient();
    return client[prop];
  }
}); 