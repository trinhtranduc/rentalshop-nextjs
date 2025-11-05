import { Client } from 'pg';

// ✅ Raw SQL queries ONLY for Main DB
// NO Prisma client generation - avoids conflicts

/**
 * Get Main DB client connection
 */
export async function getMainDbClient(): Promise<Client> {
  if (!process.env.MAIN_DATABASE_URL) {
    throw new Error('MAIN_DATABASE_URL environment variable is required');
  }
  
  const url = new URL(process.env.MAIN_DATABASE_URL);
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

// ============================================================================
// TYPES
// ============================================================================

export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  taxId: string | null;
  businessType: string | null;
  website: string | null;
  description: string | null;
  databaseUrl: string;
  status: string;
  planId: number | null;
  subscriptionStatus: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  trialDays: number;
  limits: string;
  features: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ============================================================================
// TENANT OPERATIONS
// ============================================================================

/**
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      `SELECT id, subdomain, name, email, phone, address, city, state, "zipCode", country, 
              "taxId", "businessType", website, description, "databaseUrl", status, 
              "planId", "subscriptionStatus", "currentPeriodStart", "currentPeriodEnd", 
              "trialStart", "trialEnd", "canceledAt", "cancelReason", "createdAt", "updatedAt" 
       FROM "Tenant" WHERE subdomain = $1`,
      [subdomain]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      `SELECT id, subdomain, name, email, phone, address, city, state, "zipCode", country, 
              "taxId", "businessType", website, description, "databaseUrl", status, 
              "planId", "subscriptionStatus", "currentPeriodStart", "currentPeriodEnd", 
              "trialStart", "trialEnd", "canceledAt", "cancelReason", "createdAt", "updatedAt" 
       FROM "Tenant" WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

/**
 * Check if subdomain exists
 */
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

/**
 * Check if email exists
 */
export async function tenantEmailExists(email: string): Promise<boolean> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT 1 FROM "Tenant" WHERE email = $1 LIMIT 1',
      [email]
    );
    return result.rows.length > 0;
  } finally {
    await client.end();
  }
}

/**
 * Create tenant
 */
export async function createTenant(data: {
  id?: string;
  subdomain: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  businessType?: string;
  website?: string;
  description?: string;
  databaseUrl: string;
  status?: string;
  planId?: number;
  subscriptionStatus?: string;
  trialStart?: Date;
  trialEnd?: Date;
}): Promise<Tenant> {
  const client = await getMainDbClient();
  try {
    // Generate CUID-like ID if not provided
    const id = data.id || `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await client.query(
      `INSERT INTO "Tenant" (
        id, subdomain, name, email, phone, address, city, state, "zipCode", country,
        "taxId", "businessType", website, description, "databaseUrl", status,
        "planId", "subscriptionStatus", "trialStart", "trialEnd", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      ) RETURNING *`,
      [
        id,
        data.subdomain,
        data.name,
        data.email,
        data.phone || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zipCode || null,
        data.country || null,
        data.taxId || null,
        data.businessType || null,
        data.website || null,
        data.description || null,
        data.databaseUrl,
        data.status || 'active',
        data.planId || null,
        data.subscriptionStatus || 'trial',
        data.trialStart || null,
        data.trialEnd || null
      ]
    );
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

/**
 * Update tenant
 */
export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const client = await getMainDbClient();
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Basic info
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    // Address fields
    if (data.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(data.address);
    }
    if (data.city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(data.city);
    }
    if (data.state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(data.state);
    }
    if (data.zipCode !== undefined) {
      updates.push(`"zipCode" = $${paramIndex++}`);
      values.push(data.zipCode);
    }
    if (data.country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(data.country);
    }

    // Business fields
    if (data.taxId !== undefined) {
      updates.push(`"taxId" = $${paramIndex++}`);
      values.push(data.taxId);
    }
    if (data.businessType !== undefined) {
      updates.push(`"businessType" = $${paramIndex++}`);
      values.push(data.businessType);
    }
    if (data.website !== undefined) {
      updates.push(`website = $${paramIndex++}`);
      values.push(data.website);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    // Status fields
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.subscriptionStatus !== undefined) {
      updates.push(`"subscriptionStatus" = $${paramIndex++}`);
      values.push(data.subscriptionStatus);
    }

    // Plan and subscription dates
    if (data.planId !== undefined) {
      updates.push(`"planId" = $${paramIndex++}`);
      values.push(data.planId);
    }
    if (data.currentPeriodStart !== undefined) {
      updates.push(`"currentPeriodStart" = $${paramIndex++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      updates.push(`"currentPeriodEnd" = $${paramIndex++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.trialStart !== undefined) {
      updates.push(`"trialStart" = $${paramIndex++}`);
      values.push(data.trialStart);
    }
    if (data.trialEnd !== undefined) {
      updates.push(`"trialEnd" = $${paramIndex++}`);
      values.push(data.trialEnd);
    }
    if (data.canceledAt !== undefined) {
      updates.push(`"canceledAt" = $${paramIndex++}`);
      values.push(data.canceledAt);
    }
    if (data.cancelReason !== undefined) {
      updates.push(`"cancelReason" = $${paramIndex++}`);
      values.push(data.cancelReason);
    }
    
    // Always update updatedAt
    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    // Check if there are any updates
    if (updates.length === 1) {
      // Only updatedAt, no actual updates
      throw new Error('No fields to update');
    }

    const result = await client.query(
      `UPDATE "Tenant" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Tenant with id ${id} not found`);
    }
    
    return result.rows[0] as Tenant;
  } finally {
    await client.end();
  }
}

/**
 * List all tenants
 */
export async function listAllTenants(filters?: {
  status?: string;
  planId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ tenants: Tenant[]; total: number }> {
  const client = await getMainDbClient();
  try {
    const where: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      where.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters?.planId) {
      where.push(`"planId" = $${paramIndex++}`);
      values.push(filters.planId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM "Tenant" ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);

    // Get tenants
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    values.push(limit, offset);
    
    const result = await client.query(
      `SELECT * FROM "Tenant" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );

    return {
      tenants: result.rows as Tenant[],
      total
    };
  } finally {
    await client.end();
  }
}

// ============================================================================
// PLAN OPERATIONS
// ============================================================================

/**
 * Get plan by ID
 */
export async function getPlanById(id: number): Promise<Plan | null> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE id = $1 AND "deletedAt" IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as Plan;
  } finally {
    await client.end();
  }
}

/**
 * List all active plans
 */
export async function listActivePlans(): Promise<Plan[]> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE "isActive" = true AND "deletedAt" IS NULL ORDER BY "sortOrder" ASC, "basePrice" ASC'
    );
    return result.rows as Plan[];
  } finally {
    await client.end();
  }
}

/**
 * Get default plan (lowest price active plan)
 */
export async function getDefaultPlan(): Promise<Plan | null> {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE "isActive" = true AND "deletedAt" IS NULL ORDER BY "basePrice" ASC LIMIT 1'
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as Plan;
  } finally {
    await client.end();
  }
}
