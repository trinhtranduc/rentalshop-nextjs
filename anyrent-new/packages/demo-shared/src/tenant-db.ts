import { PrismaClient } from '@prisma/client';
import { getTenantBySubdomain } from './main-db';
import { Client } from 'pg';

// ✅ In-memory cache for tenant Prisma clients
const tenantClients = new Map<string, PrismaClient>();

// Get tenant DB connection (with caching)
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

// Create new tenant database
export async function createTenantDatabase(
  subdomain: string,
  merchantId: number
): Promise<string> {
  const dbName = `${subdomain.replace(/-/g, '_')}_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL!;
  
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
    // Drop if exists (for clean slate)
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    // Create new database
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    
    console.log(`✅ Created database: ${dbName}`);
    
    // Build tenant database URL
    const tenantDbUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/${dbName}`;
    
    // Run migrations on tenant database
    const { execSync } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
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

// Clear tenant cache (useful for testing)
export function clearTenantCache(subdomain?: string) {
  if (subdomain) {
    const client = tenantClients.get(subdomain);
    if (client) {
      client.$disconnect();
      tenantClients.delete(subdomain);
    }
  } else {
    for (const client of tenantClients.values()) {
      client.$disconnect();
    }
    tenantClients.clear();
  }
}
