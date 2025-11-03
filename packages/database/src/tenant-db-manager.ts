import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';

// Singleton Main DB client - using raw SQL for Main DB operations
// This avoids schema conflicts between Main and Tenant schemas
export async function getMainDb() {
  // Return a Client instance for raw SQL queries on Main DB
  // We'll use manual SQL queries to avoid Prisma schema conflicts
  const url = new URL(process.env.MAIN_DATABASE_URL!);
  return new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
}

// Tenant DB clients cache
const tenantClients = new Map<string, PrismaClient>();

export async function getTenantDb(subdomain: string): Promise<PrismaClient> {
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain)!;
  }
  
  // Use raw SQL to query tenant from Main DB
  const mainDbClient = await getMainDb();
  await mainDbClient.connect();
  
  try {
    const result = await mainDbClient.query(
      'SELECT id, subdomain, name, "merchantId", "databaseUrl", status, "createdAt", "updatedAt" FROM "Tenant" WHERE subdomain = $1',
      [subdomain]
    );
    
    const tenant = result.rows[0];
    
    if (!tenant || tenant.status !== 'active') {
      throw new Error(`Tenant not found or inactive: ${subdomain}`);
    }
    
    const client = new PrismaClient({
      datasources: { db: { url: tenant.databaseUrl } }
    });
    
    tenantClients.set(subdomain, client);
    return client;
  } finally {
    await mainDbClient.end();
  }
}

export async function createTenantDatabase(
  subdomain: string,
  merchantId: number
): Promise<string> {
  const dbName = `${subdomain.replace(/-/g, '_')}_shop_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL!;
  
  const url = new URL(mainDbUrl);
  const adminClient = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
  
  await adminClient.connect();
  
  try {
    // Drop existing database if exists (for clean slate approach)
    await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
    
    // Create new database
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    
    const tenantDbUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/${dbName}`;
    
    // Run migrations on tenant DB
    const { execSync } = require('child_process');
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: tenantDbUrl },
      cwd: process.cwd()
    });
    
    return tenantDbUrl;
  } finally {
    await adminClient.end();
  }
}

export function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export function validateSubdomain(subdomain: string): boolean {
  const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp'];
  if (reserved.includes(subdomain.toLowerCase())) return false;
  return /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/.test(subdomain);
}

