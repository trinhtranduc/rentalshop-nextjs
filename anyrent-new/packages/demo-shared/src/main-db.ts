import { Client } from 'pg';

// ✅ Raw SQL queries ONLY for Main DB
// NO Prisma client generation - avoids conflicts

export async function getMainDbClient(): Promise<Client> {
  const url = new URL(process.env.MAIN_DATABASE_URL!);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
  await client.connect();
  return client;
}

export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  merchantId: number;
  databaseUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Merchant {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get tenant by subdomain
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT id, subdomain, name, "merchantId", "databaseUrl", status, "createdAt", "updatedAt" FROM "Tenant" WHERE subdomain = $1',
      [subdomain]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

// Check if subdomain exists
export async function subdomainExists(subdomain: string): Promise<boolean> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT 1 FROM "Tenant" WHERE subdomain = $1 LIMIT 1',
      [subdomain]
    );
    return result.rows.length > 0;
  } finally {
    await client.end();
  }
}

// Create tenant
export async function createTenant(data: {
  subdomain: string;
  name: string;
  merchantId: number;
  databaseUrl: string;
}): Promise<Tenant> {
  const client = await getMainDbClient();
  try {
    // Generate CUID-like ID (simple version)
    const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await client.query(
      'INSERT INTO "Tenant" (id, subdomain, name, "merchantId", "databaseUrl", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [id, data.subdomain, data.name, data.merchantId, data.databaseUrl, 'active']
    );
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

// Create merchant
export async function createMerchant(data: {
  name: string;
  email: string;
  phone?: string;
}): Promise<Merchant> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'INSERT INTO "Merchant" (name, email, phone, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [data.name, data.email, data.phone || null]
    );
    return result.rows[0] as Merchant;
  } finally {
    await client.end();
  }
}

// List all tenants
export async function listAllTenants(): Promise<any[]> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT t.*, m.name as "merchantName", m.email as "merchantEmail" FROM "Tenant" t LEFT JOIN "Merchant" m ON t."merchantId" = m.id ORDER BY t."createdAt" DESC'
    );
    return result.rows;
  } finally {
    await client.end();
  }
}
