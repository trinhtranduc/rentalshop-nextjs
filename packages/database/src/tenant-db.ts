import { PrismaClient } from '@prisma/client';
import { getTenantBySubdomain } from './main-db';
import { Client } from 'pg';
import path from 'path';
import fs from 'fs';

// ✅ In-memory cache for tenant Prisma clients
const tenantClients = new Map<string, PrismaClient>();

/**
 * Get tenant DB connection (with caching)
 * Creates Prisma client connected to tenant's isolated database
 */
export async function getTenantDb(subdomain: string): Promise<PrismaClient> {
  // Check cache first
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain)!;
  }
  
  // Get tenant info from Main DB (raw SQL)
  const tenant = await getTenantBySubdomain(subdomain);
  
  if (!tenant || tenant.status !== 'active') {
    throw new Error(`Tenant not found or inactive: ${subdomain}`);
  }
  
  // Create Prisma client with tenant's database URL
  const client = new PrismaClient({
    datasources: { 
      db: { url: tenant.databaseUrl } 
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });
  
  // Cache for future requests
  tenantClients.set(subdomain, client);
  
  return client;
}

/**
 * Create new tenant database
 * Creates isolated PostgreSQL database and runs Prisma migrations
 */
export async function createTenantDatabase(
  subdomain: string
): Promise<string> {
  if (!process.env.MAIN_DATABASE_URL) {
    throw new Error('MAIN_DATABASE_URL environment variable is required');
  }
  
  const dbName = `${subdomain.replace(/-/g, '_')}_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  
  const url = new URL(mainDbUrl);
  
  // Connect to PostgreSQL to create new database
  const adminClient = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
  
  await adminClient.connect();
  
  try {
    // Drop if exists (for clean slate during development)
    if (process.env.NODE_ENV === 'development') {
      await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } else {
      // In production, check if exists first
      const existsResult = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      if (existsResult.rows.length > 0) {
        throw new Error(`Database ${dbName} already exists`);
      }
    }
    
    // Create new database
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    
    console.log(`✅ Created database: ${dbName}`);
    
    // Build tenant database URL
    const tenantDbUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/${dbName}`;
    
    // Run migrations on tenant database
    const { execSync } = require('child_process');
    
    // Find workspace root by looking for prisma/schema.prisma
    // Start from current working directory and walk up
    let rootDir = process.cwd();
    while (rootDir !== path.dirname(rootDir)) {
      const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
      if (fs.existsSync(schemaPath)) {
        break;
      }
      rootDir = path.dirname(rootDir);
    }
    
    const prismaSchemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
    
    if (!fs.existsSync(prismaSchemaPath)) {
      throw new Error(`Prisma schema not found at ${prismaSchemaPath}`);
    }
    
    // Run db push to create schema (skip generate since client is already generated)
    execSync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate`, {
      stdio: 'inherit',
      env: { 
        ...process.env, 
        DATABASE_URL: tenantDbUrl 
      },
      cwd: rootDir
    });
    
    console.log(`✅ Migrated database: ${dbName}`);
    
    return tenantDbUrl;
  } finally {
    await adminClient.end();
  }
}

/**
 * Clear tenant cache (useful for testing or when tenant DB changes)
 */
export function clearTenantCache(subdomain?: string) {
  if (subdomain) {
    const client = tenantClients.get(subdomain);
    if (client) {
      client.$disconnect().catch(console.error);
      tenantClients.delete(subdomain);
    }
  } else {
    // Clear all cached clients
    for (const client of tenantClients.values()) {
      client.$disconnect().catch(console.error);
    }
    tenantClients.clear();
  }
}

/**
 * Get all cached tenant subdomains
 */
export function getCachedTenants(): string[] {
  return Array.from(tenantClients.keys());
}
