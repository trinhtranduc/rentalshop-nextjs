"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main-db.ts
var main_db_exports = {};
__export(main_db_exports, {
  createTenant: () => createTenant,
  getDefaultPlan: () => getDefaultPlan,
  getMainDbClient: () => getMainDbClient,
  getPlanById: () => getPlanById,
  getTenantById: () => getTenantById,
  getTenantBySubdomain: () => getTenantBySubdomain,
  listActivePlans: () => listActivePlans,
  listAllTenants: () => listAllTenants,
  subdomainExists: () => subdomainExists,
  tenantEmailExists: () => tenantEmailExists,
  updateTenant: () => updateTenant
});
async function getMainDbClient() {
  if (!process.env.MAIN_DATABASE_URL) {
    throw new Error("MAIN_DATABASE_URL environment variable is required");
  }
  const url = new URL(process.env.MAIN_DATABASE_URL);
  const client = new import_pg.Client({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
  await client.connect();
  return client;
}
async function getTenantBySubdomain(subdomain) {
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
    return result.rows[0];
  } finally {
    await client.end();
  }
}
async function getTenantById(id) {
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
    return result.rows[0];
  } finally {
    await client.end();
  }
}
async function subdomainExists(subdomain) {
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
async function tenantEmailExists(email) {
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
async function createTenant(data) {
  const client = await getMainDbClient();
  try {
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
        data.status || "active",
        data.planId || null,
        data.subscriptionStatus || "trial",
        data.trialStart || null,
        data.trialEnd || null
      ]
    );
    return result.rows[0];
  } finally {
    await client.end();
  }
}
async function updateTenant(id, data) {
  const client = await getMainDbClient();
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.name !== void 0) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== void 0) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.phone !== void 0) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.address !== void 0) {
      updates.push(`address = $${paramIndex++}`);
      values.push(data.address);
    }
    if (data.city !== void 0) {
      updates.push(`city = $${paramIndex++}`);
      values.push(data.city);
    }
    if (data.state !== void 0) {
      updates.push(`state = $${paramIndex++}`);
      values.push(data.state);
    }
    if (data.zipCode !== void 0) {
      updates.push(`"zipCode" = $${paramIndex++}`);
      values.push(data.zipCode);
    }
    if (data.country !== void 0) {
      updates.push(`country = $${paramIndex++}`);
      values.push(data.country);
    }
    if (data.taxId !== void 0) {
      updates.push(`"taxId" = $${paramIndex++}`);
      values.push(data.taxId);
    }
    if (data.businessType !== void 0) {
      updates.push(`"businessType" = $${paramIndex++}`);
      values.push(data.businessType);
    }
    if (data.website !== void 0) {
      updates.push(`website = $${paramIndex++}`);
      values.push(data.website);
    }
    if (data.description !== void 0) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.status !== void 0) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.subscriptionStatus !== void 0) {
      updates.push(`"subscriptionStatus" = $${paramIndex++}`);
      values.push(data.subscriptionStatus);
    }
    if (data.planId !== void 0) {
      updates.push(`"planId" = $${paramIndex++}`);
      values.push(data.planId);
    }
    if (data.currentPeriodStart !== void 0) {
      updates.push(`"currentPeriodStart" = $${paramIndex++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== void 0) {
      updates.push(`"currentPeriodEnd" = $${paramIndex++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.trialStart !== void 0) {
      updates.push(`"trialStart" = $${paramIndex++}`);
      values.push(data.trialStart);
    }
    if (data.trialEnd !== void 0) {
      updates.push(`"trialEnd" = $${paramIndex++}`);
      values.push(data.trialEnd);
    }
    if (data.canceledAt !== void 0) {
      updates.push(`"canceledAt" = $${paramIndex++}`);
      values.push(data.canceledAt);
    }
    if (data.cancelReason !== void 0) {
      updates.push(`"cancelReason" = $${paramIndex++}`);
      values.push(data.cancelReason);
    }
    updates.push(`"updatedAt" = NOW()`);
    values.push(id);
    if (updates.length === 1) {
      throw new Error("No fields to update");
    }
    const result = await client.query(
      `UPDATE "Tenant" SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      throw new Error(`Tenant with id ${id} not found`);
    }
    return result.rows[0];
  } finally {
    await client.end();
  }
}
async function listAllTenants(filters) {
  const client = await getMainDbClient();
  try {
    const where = [];
    const values = [];
    let paramIndex = 1;
    if (filters?.status) {
      where.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters?.planId) {
      where.push(`"planId" = $${paramIndex++}`);
      values.push(filters.planId);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM "Tenant" ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    values.push(limit, offset);
    const result = await client.query(
      `SELECT * FROM "Tenant" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );
    return {
      tenants: result.rows,
      total
    };
  } finally {
    await client.end();
  }
}
async function getPlanById(id) {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE id = $1 AND "deletedAt" IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } finally {
    await client.end();
  }
}
async function listActivePlans() {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE "isActive" = true AND "deletedAt" IS NULL ORDER BY "sortOrder" ASC, "basePrice" ASC'
    );
    return result.rows;
  } finally {
    await client.end();
  }
}
async function getDefaultPlan() {
  const client = await getMainDbClient();
  try {
    const result = await client.query(
      'SELECT * FROM "Plan" WHERE "isActive" = true AND "deletedAt" IS NULL ORDER BY "basePrice" ASC LIMIT 1'
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } finally {
    await client.end();
  }
}
var import_pg;
var init_main_db = __esm({
  "src/main-db.ts"() {
    "use strict";
    import_pg = require("pg");
  }
});

// src/tenant-db.ts
var tenant_db_exports = {};
__export(tenant_db_exports, {
  clearTenantCache: () => clearTenantCache,
  createTenantDatabase: () => createTenantDatabase,
  getCachedTenants: () => getCachedTenants,
  getTenantDb: () => getTenantDb
});
async function getTenantDb(subdomain) {
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain);
  }
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || tenant.status !== "active") {
    throw new Error(`Tenant not found or inactive: ${subdomain}`);
  }
  const client = new import_client15.PrismaClient({
    datasources: {
      db: { url: tenant.databaseUrl }
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
  tenantClients.set(subdomain, client);
  return client;
}
async function createTenantDatabase(subdomain) {
  if (!process.env.MAIN_DATABASE_URL) {
    throw new Error("MAIN_DATABASE_URL environment variable is required");
  }
  const dbName = `${subdomain.replace(/-/g, "_")}_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  const url = new URL(mainDbUrl);
  const adminClient = new import_pg2.Client({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
  await adminClient.connect();
  try {
    if (process.env.NODE_ENV === "development") {
      await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } else {
      const existsResult = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      if (existsResult.rows.length > 0) {
        throw new Error(`Database ${dbName} already exists`);
      }
    }
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`\u2705 Created database: ${dbName}`);
    const tenantDbUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/${dbName}`;
    const { execSync } = require("child_process");
    let rootDir = process.cwd();
    while (rootDir !== import_path.default.dirname(rootDir)) {
      const schemaPath = import_path.default.join(rootDir, "prisma", "schema.prisma");
      if (import_fs.default.existsSync(schemaPath)) {
        break;
      }
      rootDir = import_path.default.dirname(rootDir);
    }
    const prismaSchemaPath = import_path.default.join(rootDir, "prisma", "schema.prisma");
    if (!import_fs.default.existsSync(prismaSchemaPath)) {
      throw new Error(`Prisma schema not found at ${prismaSchemaPath}`);
    }
    execSync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate`, {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: tenantDbUrl
      },
      cwd: rootDir
    });
    console.log(`\u2705 Migrated database: ${dbName}`);
    return tenantDbUrl;
  } finally {
    await adminClient.end();
  }
}
function clearTenantCache(subdomain) {
  if (subdomain) {
    const client = tenantClients.get(subdomain);
    if (client) {
      client.$disconnect().catch(console.error);
      tenantClients.delete(subdomain);
    }
  } else {
    for (const client of tenantClients.values()) {
      client.$disconnect().catch(console.error);
    }
    tenantClients.clear();
  }
}
function getCachedTenants() {
  return Array.from(tenantClients.keys());
}
var import_client15, import_pg2, import_path, import_fs, tenantClients;
var init_tenant_db = __esm({
  "src/tenant-db.ts"() {
    "use strict";
    import_client15 = require("@prisma/client");
    init_main_db();
    import_pg2 = require("pg");
    import_path = __toESM(require("path"));
    import_fs = __toESM(require("fs"));
    tenantClients = /* @__PURE__ */ new Map();
  }
});

// src/subdomain-utils.ts
var subdomain_utils_exports = {};
__export(subdomain_utils_exports, {
  buildTenantUrl: () => buildTenantUrl,
  extractSubdomain: () => extractSubdomain,
  generateSubdomain: () => generateSubdomain,
  getProtocol: () => getProtocol,
  getReservedSubdomains: () => getReservedSubdomains,
  getRootDomain: () => getRootDomain,
  isReservedSubdomain: () => isReservedSubdomain,
  sanitizeSubdomain: () => sanitizeSubdomain,
  validateSubdomain: () => validateSubdomain
});
function removeVietnameseDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function sanitizeSubdomain(input) {
  if (!input) return "";
  let sanitized = removeVietnameseDiacritics(input);
  sanitized = sanitized.toLowerCase().trim();
  sanitized = sanitized.replace(/[^a-z0-9]/g, "");
  sanitized = sanitized.substring(0, 50);
  return sanitized;
}
function validateSubdomain(subdomain) {
  if (!subdomain || subdomain.length === 0) return false;
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return false;
  }
  const pattern = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
  return pattern.test(subdomain) && subdomain.length >= 1 && subdomain.length <= 50;
}
function generateSubdomain(businessName) {
  return sanitizeSubdomain(businessName);
}
function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}
function getProtocol() {
  if (process.env.NODE_ENV === "production") {
    return "https";
  }
  return "http";
}
function buildTenantUrl(subdomain) {
  const protocol = getProtocol();
  const rootDomain = getRootDomain();
  return `${protocol}://${subdomain}.${rootDomain}`;
}
function extractSubdomain(hostname) {
  if (!hostname) return null;
  const host = hostname.split(":")[0];
  const parts = host.split(".");
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return parts[0];
  }
  if (parts.length > 2) {
    return parts[0];
  }
  const rootDomain = getRootDomain().split(":")[0];
  if (host === rootDomain || host === `www.${rootDomain}`) {
    return null;
  }
  return null;
}
function isReservedSubdomain(subdomain) {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}
function getReservedSubdomains() {
  return [...RESERVED_SUBDOMAINS];
}
var RESERVED_SUBDOMAINS;
var init_subdomain_utils = __esm({
  "src/subdomain-utils.ts"() {
    "use strict";
    RESERVED_SUBDOMAINS = ["www", "api", "admin", "app", "mail", "ftp", "smtp", "client", "www2", "test", "demo", "staging"];
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AuditLogger: () => AuditLogger,
  buildTenantUrl: () => buildTenantUrl,
  checkDatabaseConnection: () => checkDatabaseConnection,
  clearTenantCache: () => clearTenantCache,
  createEmailVerification: () => createEmailVerification,
  createOrderNumberWithFormat: () => createOrderNumberWithFormat,
  createSubscriptionPayment: () => createSubscriptionPayment,
  createTenant: () => createTenant,
  createTenantDatabase: () => createTenantDatabase,
  db: () => db,
  deleteExpiredTokens: () => deleteExpiredTokens,
  extractAuditContext: () => extractAuditContext,
  extractSubdomain: () => extractSubdomain,
  generateOrderNumber: () => generateOrderNumber2,
  generateSubdomain: () => generateSubdomain,
  generateVerificationToken: () => generateVerificationToken,
  getAuditLogger: () => getAuditLogger,
  getCachedTenants: () => getCachedTenants,
  getDefaultOutlet: () => getDefaultOutlet,
  getDefaultPlan: () => getDefaultPlan,
  getExpiredSubscriptions: () => getExpiredSubscriptions,
  getMainDb: () => getMainDb,
  getMainDbClient: () => getMainDbClient,
  getOutletOrderStats: () => getOutletOrderStats,
  getPlanById: () => getPlanById,
  getProtocol: () => getProtocol,
  getReservedSubdomains: () => getReservedSubdomains,
  getRootDomain: () => getRootDomain,
  getSubscriptionById: () => getSubscriptionById,
  getTenantById: () => getTenantById,
  getTenantBySubdomain: () => getTenantBySubdomain,
  getTenantDb: () => getTenantDb,
  getVerificationTokenByUserId: () => getVerificationTokenByUserId,
  isEmailVerified: () => isEmailVerified,
  isReservedSubdomain: () => isReservedSubdomain,
  listActivePlans: () => listActivePlans,
  listAllTenants: () => listAllTenants,
  prisma: () => prisma,
  registerTenantWithTrial: () => registerTenantWithTrial,
  registerUser: () => registerUser,
  resendVerificationToken: () => resendVerificationToken,
  sanitizeSubdomain: () => sanitizeSubdomain,
  searchOrders: () => searchOrders,
  simplifiedPayments: () => simplifiedPayments,
  simplifiedSubscriptionActivities: () => simplifiedSubscriptionActivities,
  subdomainExists: () => subdomainExists,
  tenantEmailExists: () => tenantEmailExists,
  updateSubscription: () => updateSubscription,
  updateTenant: () => updateTenant,
  validateSubdomain: () => validateSubdomain,
  verifyEmailByToken: () => verifyEmailByToken
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// src/user.ts
var simplifiedUsers = {
  /**
   * Find user by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            description: true,
            isActive: true,
            isDefault: true,
            createdAt: true
          }
        }
      }
    });
  },
  /**
   * Find user by email (simplified API)
   */
  findByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        outletId: true,
        deletedAt: true,
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Find first user matching criteria (simplified API)
   */
  findFirst: async (where) => {
    return await prisma.user.findFirst({
      where,
      include: {
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Create new user (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedUsers.create called with data:", data);
      const userData = { ...data };
      if (userData.outletId && typeof userData.outletId === "number") {
        const outlet = await prisma.outlet.findUnique({
          where: { id: userData.outletId },
          select: { id: true, name: true }
        });
        if (!outlet) {
          throw new Error(`Outlet with id ${userData.outletId} not found`);
        }
        console.log("\u2705 Outlet found:", outlet);
      }
      if (userData.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: userData.email },
          select: { id: true, email: true }
        });
        if (existingEmail) {
          throw new Error(`Email ${userData.email} is already registered`);
        }
      }
      if (userData.phone) {
        const existingPhone = await prisma.user.findFirst({
          where: {
            phone: userData.phone
          },
          select: { id: true, phone: true }
        });
        if (existingPhone) {
          throw new Error(`Phone number ${userData.phone} is already registered`);
        }
      }
      const lastUser = await prisma.user.findFirst({
        orderBy: { id: "desc" },
        select: { id: true }
      });
      const nextPublicId = (lastUser?.id || 0) + 1;
      userData.id = nextPublicId;
      const user = await prisma.user.create({
        data: userData,
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              description: true,
              isActive: true,
              isDefault: true,
              createdAt: true
            }
          }
        }
      });
      console.log("\u2705 User created successfully:", user);
      return user;
    } catch (error) {
      console.error("\u274C Error in simplifiedUsers.create:", error);
      throw error;
    }
  },
  /**
   * Update user (simplified API)
   */
  update: async (id, data) => {
    return await prisma.user.update({
      where: { id },
      data,
      include: {
        outlet: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Delete user (soft delete) (simplified API)
   */
  delete: async (id) => {
    return await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: /* @__PURE__ */ new Date()
      }
    });
  },
  /**
   * Search users with simple filters (simplified API)
   */
  search: async (filters) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...whereFilters
    } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.roles && Array.isArray(whereFilters.roles)) {
      where.role = { in: whereFilters.roles };
    } else if (whereFilters.role) {
      where.role = whereFilters.role;
    }
    if (whereFilters.search) {
      where.OR = [
        { firstName: { contains: whereFilters.search, mode: "insensitive" } },
        { lastName: { contains: whereFilters.search, mode: "insensitive" } },
        { email: { contains: whereFilters.search, mode: "insensitive" } }
      ];
    }
    const orderBy = {};
    if (sortBy === "firstName" || sortBy === "lastName" || sortBy === "email") {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } }
        },
        orderBy,
        // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    console.log(`\u{1F4CA} db.users.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, users=${users.length}`);
    return {
      data: users,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.user.count({ where });
  },
  /**
   * Get user statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.user.count({ where });
  }
};

// src/customer.ts
var simplifiedCustomers = {
  /**
   * Find customer by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Create new customer (simplified API)
   */
  create: async (data) => {
    const customerData = {
      ...data,
      email: data.email && data.email.trim() !== "" ? data.email : null
    };
    delete customerData.merchant;
    return await prisma.customer.create({
      data: customerData
    });
  },
  /**
   * Update customer (simplified API)
   */
  update: async (id, data) => {
    return await prisma.customer.update({
      where: { id },
      data
    });
  },
  /**
   * Search customers with pagination (simplified API)
   */
  search: async (filters) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...whereFilters
    } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) {
      where.isActive = whereFilters.isActive;
    } else {
      where.isActive = true;
    }
    if (whereFilters.search) {
      const searchTerm = whereFilters.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } }
      ];
    }
    if (whereFilters.firstName) where.firstName = { contains: whereFilters.firstName, mode: "insensitive" };
    if (whereFilters.lastName) where.lastName = { contains: whereFilters.lastName, mode: "insensitive" };
    if (whereFilters.email) where.email = { contains: whereFilters.email, mode: "insensitive" };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone, mode: "insensitive" };
    if (whereFilters.city) where.city = { contains: whereFilters.city, mode: "insensitive" };
    if (whereFilters.state) where.state = { contains: whereFilters.state, mode: "insensitive" };
    if (whereFilters.country) where.country = { contains: whereFilters.country, mode: "insensitive" };
    const orderBy = {};
    if (sortBy === "firstName" || sortBy === "lastName" || sortBy === "email" || sortBy === "phone") {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { orders: true }
          }
        },
        orderBy,
        // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);
    console.log(`\u{1F4CA} db.customers.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, customers=${customers.length}`);
    return {
      data: customers,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  /**
   * Delete customer (soft delete) (simplified API)
   */
  delete: async (id) => {
    return await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },
  /**
   * Find first customer matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.customer.findFirst({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },
  /**
   * Get customer statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.customer.count({ where });
  }
};

// src/product.ts
async function getOrCreateDefaultCategory() {
  const existingDefault = await prisma.category.findFirst({
    where: {
      name: "General",
      isActive: true
    }
  });
  if (existingDefault) {
    console.log("\u2705 Found existing default category:", existingDefault.id);
    return existingDefault;
  }
  console.log("\u{1F527} Creating default category");
  const lastCategory = await prisma.category.findFirst({
    orderBy: { id: "desc" },
    select: { id: true }
  });
  const nextPublicId = (lastCategory?.id || 0) + 1;
  const defaultCategory = await prisma.category.create({
    data: {
      id: nextPublicId,
      name: "General",
      description: "Default category for general products",
      isActive: true
    }
  });
  console.log("\u2705 Created default category:", defaultCategory.id);
  return defaultCategory;
}
var simplifiedProducts = {
  /**
   * Find product by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Find product by barcode (simplified API)
   */
  findByBarcode: async (barcode) => {
    return await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Create new product (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedProducts.create called with data:", data);
      if (!data.categoryId) {
        const defaultCategory = await getOrCreateDefaultCategory();
        data.category = { connect: { id: defaultCategory.id } };
        console.log("\u2705 Using default category:", defaultCategory.id);
      }
      const product = await prisma.product.create({
        data,
        include: {
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
      console.log("\u2705 Product created successfully:", product.id);
      return product;
    } catch (error) {
      console.error("\u274C Error in simplifiedProducts.create:", error);
      throw error;
    }
  },
  /**
   * Update product (simplified API)
   */
  update: async (id, data) => {
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Delete product (soft delete) (simplified API)
   */
  delete: async (id) => {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  },
  /**
   * Find first product matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.product.findFirst({
      where,
      include: {
        category: { select: { id: true, name: true } },
        outletStock: {
          include: {
            outlet: { select: { id: true, name: true } }
          }
        }
      }
    });
  },
  /**
   * Get product statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.product.count({ where });
  },
  /**
   * Search products with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;
    if (whereFilters.isActive !== void 0) {
      where.isActive = whereFilters.isActive;
    } else {
      where.isActive = true;
    }
    if (whereFilters.search) {
      const searchTerm = whereFilters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { barcode: { contains: searchTerm, mode: "insensitive" } }
      ];
    }
    if (whereFilters.minPrice !== void 0 || whereFilters.maxPrice !== void 0) {
      where.rentPrice = {};
      if (whereFilters.minPrice !== void 0) where.rentPrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== void 0) where.rentPrice.lte = whereFilters.maxPrice;
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);
    return {
      data: products,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.product.count({ where });
  }
};

// src/order.ts
var orderInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      idNumber: true
    }
  },
  outlet: {
    select: {
      id: true,
      name: true,
      address: true
    }
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      email: true
    }
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      processedAt: true
    }
  }
};
function transformOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount ?? 0,
    securityDeposit: order.securityDeposit ?? 0,
    damageFee: order.damageFee ?? 0,
    lateFee: order.lateFee ?? 0,
    discountType: order.discountType || void 0,
    discountValue: order.discountValue ?? 0,
    discountAmount: order.discountAmount ?? 0,
    pickupPlanAt: order.pickupPlanAt || void 0,
    returnPlanAt: order.returnPlanAt || void 0,
    pickedUpAt: order.pickedUpAt || void 0,
    returnedAt: order.returnedAt || void 0,
    rentalDuration: order.rentalDuration || void 0,
    isReadyToDeliver: order.isReadyToDeliver ?? false,
    collateralType: order.collateralType || void 0,
    collateralDetails: order.collateralDetails || void 0,
    notes: order.notes || void 0,
    pickupNotes: order.pickupNotes || void 0,
    returnNotes: order.returnNotes || void 0,
    damageNotes: order.damageNotes || void 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    outletId: order.outletId,
    customerId: order.customerId || void 0,
    createdById: order.createdById,
    // Relations
    customer: order.customer,
    outlet: order.outlet,
    createdBy: order.createdBy,
    orderItems: order.orderItems,
    payments: order.payments
  };
}
async function updateOrder(id, data) {
  console.log("\u{1F527} updateOrder called with id:", id);
  console.log("\u{1F527} updateOrder data keys:", Object.keys(data));
  console.log("\u{1F527} updateOrder has orderItems?:", !!data.orderItems, "length:", data.orderItems?.length);
  const {
    orderItems,
    customerId,
    outletId,
    ...allFields
  } = data;
  const validFields = [
    "orderType",
    "status",
    "totalAmount",
    "depositAmount",
    "securityDeposit",
    "damageFee",
    "lateFee",
    "discountType",
    "discountValue",
    "discountAmount",
    "pickupPlanAt",
    "returnPlanAt",
    "pickedUpAt",
    "returnedAt",
    "rentalDuration",
    "isReadyToDeliver",
    "collateralType",
    "collateralDetails",
    "notes",
    "pickupNotes",
    "returnNotes",
    "damageNotes"
  ];
  const updateData = {};
  validFields.forEach((field) => {
    if (field in allFields && allFields[field] !== void 0) {
      updateData[field] = allFields[field];
    }
  });
  console.log("\u{1F527} Filtered update fields:", Object.keys(updateData));
  if (customerId !== void 0) {
    if (customerId === null) {
      updateData.customer = { disconnect: true };
    } else {
      updateData.customer = { connect: { id: customerId } };
    }
  }
  if (outletId !== void 0) {
    updateData.outlet = { connect: { id: outletId } };
  }
  if (orderItems && orderItems.length > 0) {
    console.log("\u{1F527} Processing", orderItems.length, "order items");
    updateData.orderItems = {
      // Delete all existing order items
      deleteMany: {},
      // Create new order items
      create: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || item.quantity * item.unitPrice,
        deposit: item.deposit || 0,
        notes: item.notes,
        rentalDays: item.rentalDays
      }))
    };
    console.log("\u{1F527} Converted orderItems to nested write format");
  }
  console.log("\u{1F527} Final update data structure:", {
    hasOrderItems: !!updateData.orderItems,
    hasCustomer: !!updateData.customer,
    hasOutlet: !!updateData.outlet
  });
  const order = await prisma.order.update({
    where: { id },
    data: updateData,
    include: orderInclude
  });
  console.log("\u2705 Order updated successfully");
  return transformOrder(order);
}
async function searchOrders(filters) {
  const {
    q,
    outletId,
    customerId,
    userId,
    orderType,
    status,
    startDate,
    endDate,
    pickupDate,
    returnDate,
    limit = 20,
    offset = 0
  } = filters;
  const where = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customer: { firstName: { contains: q, mode: "insensitive" } } },
      { customer: { lastName: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q, mode: "insensitive" } } }
    ];
  }
  if (outletId) {
    where.outletId = outletId;
  }
  if (customerId) {
    where.customerId = customerId;
  }
  if (userId) {
    where.createdById = userId;
  }
  if (orderType) {
    where.orderType = orderType;
  }
  if (status) {
    where.status = status;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (pickupDate) {
    where.pickupPlanAt = {
      gte: new Date(pickupDate),
      lt: new Date(new Date(pickupDate).getTime() + 24 * 60 * 60 * 1e3)
    };
  }
  if (returnDate) {
    where.returnPlanAt = {
      gte: new Date(returnDate),
      lt: new Date(new Date(returnDate).getTime() + 24 * 60 * 60 * 1e3)
    };
  }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;
  const transformedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: false,
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone || ""
    } : null,
    outlet: {
      id: order.outlet?.id || 0,
      name: order.outlet?.name || ""
    },
    orderItems: [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
  return {
    success: true,
    data: {
      orders: transformedOrders,
      total,
      page,
      limit,
      offset,
      hasMore: offset + limit < total,
      totalPages
    }
  };
}
var simplifiedOrders = {
  /**
   * Find order by ID (simplified API) - OPTIMIZED for performance
   */
  findById: async (id) => {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Find order by order number (simplified API)
   */
  findByNumber: async (orderNumber) => {
    return await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Create new order (simplified API)
   */
  create: async (data) => {
    return await prisma.order.create({
      data,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },
  /**
   * Update order (simplified API) - Now uses proper updateOrder function
   */
  update: async (id, data) => {
    return await updateOrder(id, data);
  },
  /**
   * Delete order (simplified API)
   */
  delete: async (id) => {
    return await prisma.order.delete({
      where: { id }
    });
  },
  /**
   * Search orders with simple filters (simplified API)
   */
  search: async (filters) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      where: whereClause,
      ...whereFilters
    } = filters;
    const skip = (page - 1) * limit;
    const where = whereClause || {};
    if (whereFilters.outletId) {
      where.outletId = whereFilters.outletId;
    }
    if (whereFilters.customerId) where.customerId = whereFilters.customerId;
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.orderType) where.orderType = whereFilters.orderType;
    if (whereFilters.productId) {
      where.orderItems = {
        some: {
          productId: whereFilters.productId
        }
      };
    }
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }
    if (whereFilters.search) {
      const searchTerm = whereFilters.search.trim();
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: "insensitive" } },
        { customer: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        { customer: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        { customer: { phone: { contains: searchTerm, mode: "insensitive" } } }
      ];
    }
    const orderBy = {};
    if (sortBy === "orderNumber") {
      orderBy.orderNumber = sortOrder;
    } else if (sortBy === "totalAmount") {
      orderBy.totalAmount = sortOrder;
    } else if (sortBy === "customer") {
      orderBy.customer = { firstName: sortOrder };
    } else {
      orderBy.createdAt = sortOrder;
    }
    const [orders, total] = await Promise.all([
      // OPTIMIZED: Use select instead of include for better performance
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          pickupPlanAt: true,
          returnPlanAt: true,
          pickedUpAt: true,
          returnedAt: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          // OPTIMIZED: Count instead of loading all items
          _count: {
            select: {
              orderItems: true,
              payments: true
            }
          }
        },
        orderBy,
        // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);
    console.log(`\u{1F4CA} db.orders.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, orders=${orders.length}`);
    return {
      data: orders,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  /**
   * Find first order matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.order.findFirst({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true
              }
            }
          }
        }
      }
    });
  },
  /**
   * Get order statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.order.count({ where });
  },
  /**
   * Group orders by field (simplified API)
   */
  groupBy: async (args) => {
    return await prisma.order.groupBy(args);
  },
  /**
   * Aggregate orders (simplified API)
   */
  aggregate: async (args) => {
    return await prisma.order.aggregate(args);
  },
  // ============================================================================
  // PERFORMANCE OPTIMIZED METHODS FOR LARGE DATASETS
  // ============================================================================
  /**
   * Get orders list with minimal data for performance (for large datasets)
   * Only essential fields for list view - no nested objects
   */
  /**
   * Search orders with orderItems included (for calendar API)
   */
  searchWithItems: async (filters = {}) => {
    const {
      // Note: merchantId removed - tenant databases are already isolated per tenant
      outletId,
      status,
      orderType,
      productId,
      startDate,
      endDate,
      search: search2,
      page = 1,
      limit = 1e3,
      sortBy = "createdAt",
      sortOrder = "desc",
      where: whereClause
    } = filters;
    const where = whereClause || {};
    console.log("\u{1F50D} searchWithItems - Original whereClause:", JSON.stringify(whereClause, null, 2));
    if (where.merchantId) {
      delete where.merchantId;
    }
    if (outletId) {
      where.outletId = outletId;
      delete where.outlet;
    }
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (productId) {
      where.orderItems = {
        some: {
          productId
        }
      };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search2) {
      where.OR = [
        { orderNumber: { contains: search2 } },
        { customer: { firstName: { contains: search2 } } },
        { customer: { lastName: { contains: search2 } } },
        { customer: { phone: { contains: search2 } } }
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          outlet: {
            select: {
              id: true,
              name: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);
    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },
  findManyMinimal: async (filters = {}) => {
    const {
      // Note: merchantId removed - tenant databases are already isolated per tenant
      outletId,
      status,
      orderType,
      startDate,
      endDate,
      search: search2,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters;
    const where = {};
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search2) {
      where.OR = [
        { orderNumber: { contains: search2, mode: "insensitive" } },
        { customer: { firstName: { contains: search2, mode: "insensitive" } } },
        { customer: { lastName: { contains: search2, mode: "insensitive" } } },
        { customer: { phone: { contains: search2, mode: "insensitive" } } }
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          outletId: true,
          customerId: true,
          createdById: true,
          // Minimal customer data
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          // Minimal outlet data
          outlet: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          // Minimal createdBy data
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);
    const orderIds = orders.map((order) => order.id);
    const itemCounts = await prisma.orderItem.groupBy({
      by: ["orderId"],
      where: { orderId: { in: orderIds } },
      _count: { id: true }
    });
    const itemCountMap = new Map(itemCounts.map((item) => [item.orderId, item._count.id]));
    const paymentCounts = await prisma.payment.groupBy({
      by: ["orderId"],
      where: { orderId: { in: orderIds } },
      _count: { id: true },
      _sum: { amount: true }
    });
    const paymentCountMap = new Map(paymentCounts.map((payment) => [payment.orderId, payment._count.id]));
    const totalPaidMap = new Map(paymentCounts.map((payment) => [payment.orderId, payment._sum.amount || 0]));
    const enhancedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Flatten customer data
      customerId: order.customerId,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : null,
      customerPhone: order.customer?.phone || null,
      customerEmail: order.customer?.email || null,
      // Flatten outlet data
      outletId: order.outletId,
      outletName: order.outlet?.name || null,
      outletAddress: order.outlet?.address || null,
      // Flatten createdBy data
      createdById: order.createdById,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : null,
      createdByEmail: order.createdBy?.email || null,
      // Calculated fields
      itemCount: itemCountMap.get(order.id) || 0,
      paymentCount: paymentCountMap.get(order.id) || 0,
      totalPaid: totalPaidMap.get(order.id) || 0
    }));
    return {
      data: enhancedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },
  /**
   * Get orders list with complete order information for performance (for large datasets)
   * Includes all order fields, customer, outlet, createdBy, and products
   */
  findManyLightweight: async (filters) => {
    const {
      // Note: merchantId removed - tenant databases are already isolated per tenant
      outletId,
      status,
      orderType,
      productId,
      startDate,
      endDate,
      search: search2,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters;
    const where = {};
    if (outletId) {
      where.outletId = outletId;
    }
    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }
    if (productId) {
      where.orderItems = {
        some: {
          productId
        }
      };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search2) {
      const searchTerm = search2.trim();
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: "insensitive" } },
        { customer: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        { customer: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        { customer: { phone: { contains: searchTerm, mode: "insensitive" } } }
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          securityDeposit: true,
          damageFee: true,
          lateFee: true,
          discountType: true,
          discountValue: true,
          discountAmount: true,
          pickupPlanAt: true,
          returnPlanAt: true,
          pickedUpAt: true,
          returnedAt: true,
          rentalDuration: true,
          isReadyToDeliver: true,
          collateralType: true,
          collateralDetails: true,
          notes: true,
          pickupNotes: true,
          returnNotes: true,
          damageNotes: true,
          createdAt: true,
          updatedAt: true,
          outletId: true,
          customerId: true,
          createdById: true,
          // Customer data
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              country: true
            }
          },
          // Outlet data
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              city: true,
              state: true,
              zipCode: true,
              country: true
            }
          },
          // CreatedBy data
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          // Include products for list view
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              notes: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true
                }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);
    const orderIds = orders.map((o) => o.id);
    const [itemCounts, paymentCounts] = await Promise.all([
      prisma.orderItem.groupBy({
        by: ["orderId"],
        where: { orderId: { in: orderIds } },
        _count: { id: true }
      }),
      prisma.payment.groupBy({
        by: ["orderId"],
        where: {
          orderId: { in: orderIds },
          status: "COMPLETED"
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);
    const itemCountMap = new Map(itemCounts.map((item) => [item.orderId, item._count.id]));
    const paymentCountMap = new Map(paymentCounts.map((payment) => [payment.orderId, payment._count.id]));
    const totalPaidMap = new Map(paymentCounts.map((payment) => [payment.orderId, payment._sum.amount || 0]));
    const enhancedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      securityDeposit: order.securityDeposit,
      damageFee: order.damageFee,
      lateFee: order.lateFee,
      discountType: order.discountType,
      discountValue: order.discountValue,
      discountAmount: order.discountAmount,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      rentalDuration: order.rentalDuration,
      isReadyToDeliver: order.isReadyToDeliver,
      collateralType: order.collateralType,
      collateralDetails: order.collateralDetails,
      notes: order.notes,
      pickupNotes: order.pickupNotes,
      returnNotes: order.returnNotes,
      damageNotes: order.damageNotes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Flatten customer data (simplified)
      customerId: order.customerId,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : null,
      customerPhone: order.customer?.phone || null,
      // Flatten outlet data (simplified)
      outletId: order.outletId,
      outletName: order.outlet?.name || null,
      // Flatten createdBy data
      createdById: order.createdById,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : null,
      // Order items with flattened product data
      orderItems: order.orderItems?.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        // Flatten product data
        productId: item.product?.id,
        productName: item.product?.name,
        productBarcode: item.product?.barcode,
        productImages: item.product?.images ? Array.isArray(item.product.images) ? item.product.images : [] : [],
        productRentPrice: item.product?.rentPrice,
        productDeposit: item.product?.deposit
      })) || [],
      // Calculated fields
      itemCount: itemCountMap.get(order.id) || 0,
      paymentCount: paymentCountMap.get(order.id) || 0,
      totalPaid: totalPaidMap.get(order.id) || 0
    }));
    return {
      data: enhancedOrders,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  /**
   * Get order by ID with full detail data
   * Includes all order fields, customer, outlet, products, payments, and timeline
   */
  findByIdDetail: async (id) => {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        lateFee: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        rentalDuration: true,
        isReadyToDeliver: true,
        collateralType: true,
        collateralDetails: true,
        notes: true,
        pickupNotes: true,
        returnNotes: true,
        damageNotes: true,
        createdAt: true,
        updatedAt: true,
        outletId: true,
        customerId: true,
        createdById: true,
        // Full customer data
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            dateOfBirth: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        },
        // Full outlet data
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            isActive: true
          }
        },
        // Full createdBy data
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        // Full order items with products
        orderItems: {
          select: {
            id: true,
            orderId: true,
            productId: true,
            productName: true,
            productBarcode: true,
            productImages: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            notes: true,
            rentalDays: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                images: true,
                rentPrice: true,
                deposit: true,
                description: true,
                isActive: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            }
          }
        },
        // Full payments data
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            reference: true,
            notes: true,
            processedAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!order) return null;
    let timeline = [];
    try {
      timeline = await prisma.orderAuditLog?.findMany({
        where: { orderId: id },
        select: {
          id: true,
          action: true,
          description: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }) || [];
    } catch (error) {
      console.log("OrderAuditLog table not found, skipping timeline");
    }
    const itemCount = order.orderItems?.length || 0;
    const paymentCount = order.payments?.length || 0;
    const totalPaid = order.payments?.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0) || 0;
    return {
      ...order,
      // Calculated fields
      itemCount,
      paymentCount,
      totalPaid,
      // Timeline
      timeline
    };
  },
  /**
   * Get order detail with optimized loading
   * Loads related data only when needed
   */
  findByIdOptimized: async (id, options = {}) => {
    const {
      includeItems = true,
      includePayments = true,
      includeCustomer = true,
      includeOutlet = true
    } = options;
    const select = {
      id: true,
      orderNumber: true,
      orderType: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      securityDeposit: true,
      damageFee: true,
      lateFee: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      pickupPlanAt: true,
      returnPlanAt: true,
      pickedUpAt: true,
      returnedAt: true,
      rentalDuration: true,
      isReadyToDeliver: true,
      collateralType: true,
      collateralDetails: true,
      notes: true,
      pickupNotes: true,
      returnNotes: true,
      damageNotes: true,
      createdAt: true,
      updatedAt: true,
      outletId: true,
      customerId: true,
      createdById: true
    };
    if (includeCustomer) {
      select.customer = {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          dateOfBirth: true,
          idNumber: true,
          idType: true
        }
      };
    }
    if (includeOutlet) {
      select.outlet = {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          city: true,
          state: true,
          zipCode: true,
          country: true
        }
      };
    }
    select.createdBy = {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    };
    if (includeItems) {
      select.orderItems = {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          deposit: true,
          productId: true,
          notes: true,
          rentalDays: true,
          product: {
            select: {
              id: true,
              name: true,
              barcode: true,
              description: true,
              images: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      };
    }
    if (includePayments) {
      select.payments = {
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          type: true,
          status: true,
          reference: true,
          transactionId: true,
          invoiceNumber: true,
          description: true,
          notes: true,
          failureReason: true,
          processedAt: true,
          processedBy: true,
          createdAt: true
        }
      };
    }
    return await prisma.order.findUnique({
      where: { id },
      select
    });
  },
  /**
   * Search orders with cursor-based pagination for large datasets
   * More efficient than offset-based pagination for large datasets
   * Includes complete order information and products
   */
  searchWithCursor: async (filters) => {
    const {
      // Note: merchantId removed - tenant databases are already isolated per tenant
      outletId,
      status,
      orderType,
      startDate,
      endDate,
      cursor,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters;
    const where = {};
    if (outletId) {
      where.outletId = outletId;
    }
    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (cursor) {
      const cursorCondition = sortOrder === "desc" ? { [sortBy]: { lt: new Date(cursor) } } : { [sortBy]: { gt: new Date(cursor) } };
      where.AND = [cursorCondition];
    }
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        lateFee: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        rentalDuration: true,
        isReadyToDeliver: true,
        collateralType: true,
        collateralDetails: true,
        notes: true,
        pickupNotes: true,
        returnNotes: true,
        damageNotes: true,
        createdAt: true,
        updatedAt: true,
        outletId: true,
        customerId: true,
        createdById: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            city: true,
            state: true,
            zipCode: true,
            country: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        // Include products for list view
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            notes: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                images: true,
                rentPrice: true,
                deposit: true
              }
            }
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1
      // Take one extra to check if there are more
    });
    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop();
    }
    const nextCursor = hasMore && orders.length > 0 ? orders[orders.length - 1][sortBy]?.toString() : null;
    return {
      data: orders,
      hasMore,
      nextCursor
    };
  },
  /**
   * Get order statistics for dashboard (optimized aggregation)
   */
  getStatistics: async (filters) => {
    const {
      // Note: merchantId removed - tenant databases are already isolated per tenant
      outletId,
      startDate,
      endDate
    } = filters;
    const where = {};
    if (outletId) {
      where.outletId = outletId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    const [
      totalOrders,
      totalRevenue,
      statusBreakdown,
      typeBreakdown,
      recentOrders
    ] = await Promise.all([
      // Total orders count
      prisma.order.count({ where }),
      // Total revenue
      prisma.order.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      // Status breakdown
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: { id: true }
      }),
      // Type breakdown
      prisma.order.groupBy({
        by: ["orderType"],
        where,
        _count: { id: true }
      }),
      // Recent orders (last 10)
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item.orderType] = item._count.id;
        return acc;
      }, {}),
      recentOrders
    };
  }
};

// src/payment.ts
async function createPayment(data) {
  return await prisma.payment.create({
    data,
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}
async function findById(id) {
  return await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          outlet: { select: { name: true } }
        }
      }
    }
  });
}
async function findBySubscriptionId(subscriptionId, options = {}) {
  const { limit = 20 } = options;
  return await prisma.payment.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}
async function searchPayments(filters) {
  const { where, include, orderBy, take = 20, skip = 0 } = filters;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include,
      orderBy,
      take,
      skip
    }),
    prisma.payment.count({ where })
  ]);
  return {
    data: payments,
    total,
    page: Math.floor(skip / take) + 1,
    limit: take,
    hasMore: skip + take < total
  };
}
var simplifiedPayments = {
  /**
   * Create payment (simplified API)
   */
  create: createPayment,
  /**
   * Find payment by ID (simplified API)
   */
  findById,
  /**
   * Find payments by subscription ID (simplified API)
   */
  findBySubscriptionId,
  /**
   * Search payments (simplified API)
   */
  search: searchPayments,
  /**
   * Find first payment matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.payment.findFirst({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true
          }
        }
      }
    });
  },
  /**
   * Get payment statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.payment.count({ where });
  },
  /**
   * Group payments by field (simplified API)
   */
  groupBy: async (args) => {
    return await prisma.payment.groupBy(args);
  },
  /**
   * Aggregate payments (simplified API)
   */
  aggregate: async (args) => {
    return await prisma.payment.aggregate(args);
  }
};

// src/outlet.ts
async function getDefaultOutlet() {
  const outlet = await prisma.outlet.findFirst({
    where: {
      isDefault: true,
      isActive: true
    },
    select: {
      id: true,
      name: true
    }
  });
  if (!outlet) {
    throw new Error(`No default outlet found`);
  }
  return outlet;
}
var simplifiedOutlets = {
  /**
   * Find outlet by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.outlet.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },
  /**
   * Create new outlet (simplified API)
   */
  create: async (data) => {
    try {
      console.log("\u{1F50D} simplifiedOutlets.create called with data:", data);
      const { merchant, ...outletData } = data;
      const outlet = await prisma.outlet.create({
        data: outletData
      });
      console.log("\u2705 Outlet created successfully:", outlet);
      return outlet;
    } catch (error) {
      console.error("\u274C Error in simplifiedOutlets.create:", error);
      throw error;
    }
  },
  /**
   * Update outlet (simplified API)
   */
  update: async (id, data) => {
    const { merchant, ...outletData } = data;
    return await prisma.outlet.update({
      where: { id },
      data: outletData
    });
  },
  /**
   * Find first outlet matching criteria (simplified API)
   */
  findFirst: async (where) => {
    return await prisma.outlet.findFirst({
      where,
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            products: true
          }
        }
      }
    });
  },
  /**
   * Get outlet statistics (simplified API)
   */
  getStats: async (options) => {
    return await prisma.outlet.count(options.where);
  },
  /**
   * Update multiple outlets (simplified API)
   */
  updateMany: async (where, data) => {
    return await prisma.outlet.updateMany({
      where,
      data
    });
  },
  /**
   * Search outlets with pagination (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    console.log("\u{1F50D} DB outlet.search - Received filters:", filters);
    console.log("\u{1F50D} DB outlet.search - whereFilters:", whereFilters);
    const where = {};
    if (whereFilters.outletId) where.id = whereFilters.outletId;
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.status) where.status = whereFilters.status;
    const searchTerm = whereFilters.search?.trim();
    console.log("\u{1F50D} DB outlet.search - searchTerm:", searchTerm, "length:", searchTerm?.length);
    if (searchTerm && searchTerm.length > 0) {
      where.name = {
        contains: searchTerm,
        mode: "insensitive"
      };
      console.log("\u2705 DB outlet.search - Added name filter:", where.name);
    } else {
      console.log("\u26A0\uFE0F DB outlet.search - No search term, will return all outlets for this merchant");
    }
    console.log("\u{1F50D} DB outlet.search - Final where clause:", JSON.stringify(where, null, 2));
    if (whereFilters.name) where.name = { contains: whereFilters.name, mode: "insensitive" };
    if (whereFilters.address) where.address = { contains: whereFilters.address, mode: "insensitive" };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone, mode: "insensitive" };
    const orderBy = {};
    if (sortBy === "name" || sortBy === "createdAt" || sortBy === "updatedAt") {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }
    const [outlets, total] = await Promise.all([
      prisma.outlet.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              orders: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.outlet.count({ where })
    ]);
    console.log(`\u{1F4CA} db.outlets.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, outlets=${outlets.length}`);
    return {
      data: outlets,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },
  count: async (options) => {
    const where = options?.where || {};
    return await prisma.outlet.count({ where });
  }
};

// src/plan.ts
function generatePlanPricing(basePrice) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3 * 0.95,
      // 5% discount for quarterly
      discount: 5,
      savings: basePrice * 3 * 0.05
    },
    yearly: {
      price: basePrice * 12 * 0.85,
      // 15% discount for yearly
      discount: 15,
      savings: basePrice * 12 * 0.15
    }
  };
}
var simplifiedPlans = {
  /**
   * Find plan by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.plan.findUnique({
      where: { id }
    });
  },
  /**
   * Find plan by name (simplified API)
   */
  findByName: async (name) => {
    return await prisma.plan.findFirst({
      where: {
        name,
        isActive: true
      }
    });
  },
  /**
   * Create new plan (simplified API)
   */
  create: async (data) => {
    return await prisma.plan.create({
      data
    });
  },
  /**
   * Update plan (simplified API)
   */
  update: async (id, data) => {
    return await prisma.plan.update({
      where: { id },
      data
    });
  },
  /**
   * Delete plan (simplified API)
   */
  delete: async (id) => {
    return await prisma.plan.delete({
      where: { id }
    });
  },
  /**
   * Search plans with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.isActive !== void 0) where.isActive = whereFilters.isActive;
    if (whereFilters.isPopular !== void 0) where.isPopular = whereFilters.isPopular;
    if (whereFilters.search) {
      where.OR = [
        { name: { contains: whereFilters.search } },
        { description: { contains: whereFilters.search } }
      ];
    }
    if (whereFilters.minPrice !== void 0 || whereFilters.maxPrice !== void 0) {
      where.basePrice = {};
      if (whereFilters.minPrice !== void 0) where.basePrice.gte = whereFilters.minPrice;
      if (whereFilters.maxPrice !== void 0) where.basePrice.lte = whereFilters.maxPrice;
    }
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit
      }),
      prisma.plan.count({ where })
    ]);
    return {
      data: plans,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  /**
   * Find first plan matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    const plan = await prisma.plan.findFirst({
      where,
      include: {
        subscriptions: {
          select: {
            id: true,
            // Note: merchantId removed - tenant databases are already isolated per tenant
            status: true
          }
        }
      }
    });
    if (!plan) return null;
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      trialDays: plan.trialDays,
      limits: JSON.parse(plan.limits),
      features: JSON.parse(plan.features || "[]"),
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      pricing: generatePlanPricing(plan.basePrice),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      subscriptions: plan.subscriptions
    };
  },
  /**
   * Get plan statistics (simplified API)
   */
  getStats: async () => {
    const [totalPlans, activePlans, popularPlans] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.plan.count({ where: { isPopular: true } })
    ]);
    return {
      totalPlans,
      activePlans,
      popularPlans
    };
  }
};

// src/subscription.ts
var import_utils = require("@rentalshop/utils");
function generatePricingFromBasePrice(basePrice) {
  const monthlyPrice = basePrice;
  const quarterlyPrice = monthlyPrice * 3;
  const sixMonthsPrice = monthlyPrice * 6;
  const yearlyPrice = monthlyPrice * 12;
  return {
    monthly: {
      price: monthlyPrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: quarterlyPrice,
      discount: 5,
      // 5% discount for quarterly
      savings: quarterlyPrice * 0.05
    },
    sixMonths: {
      price: sixMonthsPrice,
      discount: 10,
      // 10% discount for 6 months
      savings: sixMonthsPrice * 0.1
    },
    yearly: {
      price: yearlyPrice,
      discount: 15,
      // 15% discount for yearly
      savings: yearlyPrice * 0.15
    }
  };
}
function convertPrismaPlanToPlan(prismaPlan) {
  return {
    id: prismaPlan.id,
    name: prismaPlan.name,
    description: prismaPlan.description,
    basePrice: prismaPlan.basePrice,
    currency: prismaPlan.currency,
    trialDays: prismaPlan.trialDays,
    limits: JSON.parse(prismaPlan.limits),
    features: JSON.parse(prismaPlan.features),
    isActive: prismaPlan.isActive,
    isPopular: prismaPlan.isPopular,
    sortOrder: prismaPlan.sortOrder,
    pricing: generatePricingFromBasePrice(prismaPlan.basePrice),
    createdAt: prismaPlan.createdAt,
    updatedAt: prismaPlan.updatedAt,
    deletedAt: prismaPlan.deletedAt || void 0
  };
}
async function getSubscriptionById(subscriptionId) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true
    }
  });
  if (!subscription) return null;
  return {
    id: subscription.id,
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
async function getExpiredSubscriptions() {
  const now = /* @__PURE__ */ new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: {
        lt: now
      },
      status: {
        in: ["active", "trial"]
      }
    },
    include: {
      // Note: merchant removed - tenant databases don't have merchant model
      plan: true
    },
    orderBy: { currentPeriodEnd: "asc" }
  });
  return subscriptions.map((sub) => ({
    id: sub.id,
    // Note: merchantId removed - tenant databases are already isolated per tenant
    planId: sub.planId,
    status: sub.status,
    billingInterval: sub.interval,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    amount: sub.amount,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    // Note: merchant removed - tenant databases don't have merchant model
    plan: convertPrismaPlanToPlan(sub.plan)
  }));
}
async function updateSubscription(subscriptionId, data) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    },
    include: {
      // Note: merchant removed - tenant databases don't have merchant model
      plan: true
    }
  });
  return {
    id: subscription.id,
    // Note: merchantId removed - tenant databases are already isolated per tenant
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    // Note: merchant removed - tenant databases don't have merchant model
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
async function createSubscriptionPayment(data) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    select: { id: true }
  });
  if (!subscription) {
    throw new Error("Subscription not found");
  }
  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      type: "SUBSCRIPTION",
      status: data.status,
      transactionId: data.transactionId,
      description: data.description,
      failureReason: data.failureReason
    }
  });
  return {
    id: payment.id,
    subscriptionId: data.subscriptionId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId || "",
    description: payment.description || void 0,
    failureReason: payment.failureReason || void 0,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}
var simplifiedSubscriptions = {
  /**
   * Find subscription by ID (simplified API)
   */
  findById: async (id) => {
    return await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Find active subscription (simplified API)
   * Note: findByMerchantId removed - tenant databases are already isolated per tenant
   */
  findActive: async () => {
    return await prisma.subscription.findFirst({
      where: {
        status: { not: "CANCELLED" }
      },
      include: {
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Create new subscription (simplified API)
   */
  create: async (data) => {
    return await prisma.subscription.create({
      data,
      include: {
        plan: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Update subscription (simplified API)
   */
  update: async (id, data) => {
    return await prisma.subscription.update({
      where: { id },
      data,
      include: {
        plan: { select: { id: true, name: true } }
      }
    });
  },
  /**
   * Delete subscription (simplified API)
   */
  delete: async (id) => {
    return await prisma.subscription.update({
      where: { id },
      data: {
        status: "CANCELLED",
        canceledAt: /* @__PURE__ */ new Date()
      }
    });
  },
  /**
   * Search subscriptions with simple filters (simplified API)
   */
  search: async (filters) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (whereFilters.planId) where.planId = whereFilters.planId;
    if (whereFilters.isActive !== void 0) {
      if (whereFilters.isActive) {
        where.status = { not: "CANCELLED" };
      } else {
        where.status = "CANCELLED";
      }
    }
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 3
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.subscription.count({ where })
    ]);
    return {
      data: subscriptions,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },
  /**
   * Find first subscription matching criteria (simplified API)
   */
  findFirst: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.subscription.findFirst({
      where,
      include: {
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
  },
  /**
   * Get subscription statistics (simplified API)
   */
  getStats: async (whereClause) => {
    const where = whereClause?.where || whereClause || {};
    return await prisma.subscription.count({ where });
  },
  /**
   * Get expired subscriptions (simplified API)
   */
  getExpired: async () => {
    const now = /* @__PURE__ */ new Date();
    return await prisma.subscription.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          {
            status: "TRIAL",
            trialEnd: { lt: now }
          },
          {
            status: "ACTIVE",
            currentPeriodEnd: { lt: now }
          }
        ]
      },
      include: {
        plan: { select: { id: true, name: true } }
      },
      orderBy: { currentPeriodEnd: "asc" }
    });
  }
};

// src/subscription-activity.ts
async function createActivity(data) {
  const { metadata, ...rest } = data;
  return await prisma.subscriptionActivity.create({
    data: {
      ...rest,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}
async function getActivitiesBySubscriptionId(subscriptionId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const [activities, total] = await Promise.all([
    prisma.subscriptionActivity.findMany({
      where: { subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.subscriptionActivity.count({ where: { subscriptionId } })
  ]);
  return {
    activities: activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    })),
    total
  };
}
var simplifiedSubscriptionActivities = {
  /**
   * Create activity (simplified API)
   */
  create: createActivity,
  /**
   * Get activities by subscription ID
   */
  getBySubscriptionId: getActivitiesBySubscriptionId
};

// src/order-number-generator.ts
var FORMAT_CONFIGS = {
  sequential: {
    description: "Sequential numbering per outlet",
    example: "ORD-001-0001",
    pros: ["Outlet identification", "Easy tracking", "Human readable"],
    cons: ["Business intelligence leakage", "Race conditions possible"],
    bestFor: "Small to medium businesses with low concurrency"
  },
  "date-based": {
    description: "Date-based with daily sequence reset",
    example: "ORD-001-20250115-0001",
    pros: ["Daily organization", "Better security", "Easy daily reporting"],
    cons: ["Longer numbers", "Still somewhat predictable"],
    bestFor: "Medium businesses with daily operations focus"
  },
  random: {
    description: "Random alphanumeric strings for security",
    example: "ORD-001-A7B9C2",
    pros: ["Maximum security", "No race conditions", "Unpredictable"],
    cons: ["No sequence tracking", "Harder to manage", "No business insights"],
    bestFor: "Large businesses prioritizing security"
  },
  "random-numeric": {
    description: "Random numeric strings for security",
    example: "ORD-001-123456",
    pros: ["Maximum security", "No race conditions", "Numbers only", "Unpredictable"],
    cons: ["No sequence tracking", "Harder to manage", "No business insights"],
    bestFor: "Businesses needing numeric-only random order numbers"
  },
  "compact-numeric": {
    description: "Compact format with outlet ID and 5-digit random number",
    example: "ORD00112345",
    pros: ["Compact format", "Outlet identification", "Numbers only", "Short length", "Easy to read"],
    cons: ["No sequence tracking", "Limited randomness (5 digits)"],
    bestFor: "Businesses wanting compact, numeric-only order numbers"
  },
  hybrid: {
    description: "Combines outlet, date, and random elements",
    example: "ORD-001-20250115-A7B9",
    pros: ["Balanced security", "Outlet identification", "Date organization"],
    cons: ["Longer numbers", "More complex"],
    bestFor: "Large businesses needing both security and organization"
  }
};
function getFormatInfo(format) {
  return FORMAT_CONFIGS[format];
}
async function generateOrderNumber(config) {
  const {
    format = "sequential",
    outletId,
    prefix = "ORD",
    includeDate = false,
    sequenceLength = 4,
    randomLength = 6,
    numericOnly = false
  } = config;
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const outletIdStr = outlet.id.toString().padStart(3, "0");
  const generatedAt = /* @__PURE__ */ new Date();
  switch (format) {
    case "sequential":
      return await generateSequentialNumber(outletIdStr, prefix, sequenceLength);
    case "date-based":
      return await generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt);
    case "random":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, false);
    case "random-numeric":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, true);
    case "compact-numeric":
      return await generateCompactNumericNumber(outletIdStr, prefix);
    case "hybrid":
      return await generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
    default:
      throw new Error(`Unsupported order number format: ${format}`);
  }
}
async function generateSequentialNumber(outletIdStr, prefix, sequenceLength) {
  const maxRetries = 5;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const lastOrder = await tx.order.findFirst({
          where: {
            orderNumber: { startsWith: `${prefix}-${outletIdStr}-` }
          },
          orderBy: { createdAt: "desc" },
          select: { orderNumber: true, createdAt: true }
        });
        let nextSequence = 1;
        if (lastOrder) {
          const parts = lastOrder.orderNumber.split("-");
          const lastSequence = parseInt(parts[parts.length - 1]) || 0;
          nextSequence = lastSequence + 1;
        }
        const orderNumber = `${prefix}-${outletIdStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
        const existingOrder = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true }
        });
        if (existingOrder) {
          throw new Error("Order number collision detected");
        }
        return {
          orderNumber,
          sequence: nextSequence,
          generatedAt: /* @__PURE__ */ new Date()
        };
      });
      return result;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate sequential order number after ${maxRetries} retries: ${errorMessage}`);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 10));
    }
  }
  throw new Error("Maximum retries exceeded");
}
async function generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const result = await prisma.$transaction(async (tx) => {
    const lastOrder = await tx.order.findFirst({
      where: {
        orderNumber: { startsWith: `${prefix}-${outletIdStr}-${dateStr}-` }
      },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true }
    });
    let nextSequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split("-");
      const lastSequence = parseInt(parts[parts.length - 1]) || 0;
      nextSequence = lastSequence + 1;
    }
    const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true }
    });
    if (existingOrder) {
      throw new Error("Order number collision detected");
    }
    return {
      orderNumber,
      sequence: nextSequence,
      generatedAt
    };
  });
  return result;
}
async function generateRandomNumber(outletIdStr, prefix, randomLength, numericOnly = false) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString(randomLength, numericOnly);
      const orderNumber = `${prefix}-${outletIdStr}-${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for random
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate random order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique random order number after ${maxRetries} attempts`);
}
async function generateCompactNumericNumber(outletIdStr, prefix) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString(8, true);
      const orderNumber = `${prefix}${outletIdStr}${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for compact numeric
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate compact numeric order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique compact numeric order number after ${maxRetries} attempts`);
}
async function generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly = false) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const randomStr = generateRandomString(4, numericOnly);
  const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${randomStr}`;
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true }
  });
  if (existingOrder) {
    return generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
  }
  return {
    orderNumber,
    sequence: 0,
    // No sequence for hybrid
    generatedAt
  };
}
function generateRandomString(length, numericOnly = false) {
  const chars = numericOnly ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes3 = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes3);
  } else {
    const crypto = require("crypto");
    const randomBytesNode = crypto.randomBytes(length);
    randomBytes3.set(randomBytesNode);
  }
  return Array.from(randomBytes3, (byte) => chars[byte % chars.length]).join("");
}
function validateOrderNumber(orderNumber) {
  const patterns = [
    /^\d{3}-\d{4}$/,
    // Sequential: ORD-001-0001
    /^\d{3}-\d{8}-\d{4}$/,
    // Date-based: ORD-001-20250115-0001
    /^\d{3}-[A-Z0-9]{6}$/,
    // Random: ORD-001-A7B9C2
    /^\d{3}-\d{6}$/,
    // Random-numeric: ORD-001-123456
    /^\d{3}-\d{8}-[A-Z0-9]{4}$/,
    // Hybrid: ORD-001-20250115-A7B9
    /^\d{3}\d{5}$/
    // Compact-numeric: ORD00112345
  ];
  return patterns.some((pattern) => pattern.test(orderNumber));
}
async function getOutletOrderStats(outletId) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [totalOrders, todayOrders, lastOrder] = await Promise.all([
    prisma.order.count({
      where: { outletId: outlet.id }
    }),
    prisma.order.count({
      where: {
        outletId: outlet.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.order.findFirst({
      where: { outletId: outlet.id },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, createdAt: true }
    })
  ]);
  return {
    totalOrders,
    todayOrders,
    lastOrderNumber: lastOrder?.orderNumber,
    lastOrderDate: lastOrder?.createdAt
  };
}
async function createOrderNumberWithFormat(outletId, format) {
  const config = {
    format,
    outletId,
    prefix: "ORD",
    sequenceLength: 4,
    randomLength: 6,
    includeDate: true
  };
  return await generateOrderNumber(config);
}
async function generateTestOrderNumbers(outletId, count, format = "sequential") {
  const orderNumbers = [];
  for (let i = 0; i < count; i++) {
    const result = await createOrderNumberWithFormat(outletId, format);
    orderNumbers.push(result.orderNumber);
  }
  return orderNumbers;
}
var simplifiedOrderNumbers = {
  /**
   * Get outlet order stats (simplified API)
   */
  getOutletStats: async (outletId) => {
    return await getOutletOrderStats(outletId);
  },
  /**
   * Create order number with format (simplified API)
   */
  createWithFormat: async (outletId, format) => {
    return await createOrderNumberWithFormat(outletId, format);
  },
  /**
   * Generate multiple order numbers (simplified API)
   */
  generateMultiple: async (outletId, count, format = "sequential") => {
    return await generateTestOrderNumbers(outletId, count, format);
  },
  /**
   * Validate order number format (simplified API)
   */
  validateFormat: (orderNumber) => {
    return validateOrderNumber(orderNumber);
  },
  /**
   * Get format info (simplified API)
   */
  getFormatInfo: (format) => {
    return getFormatInfo(format);
  }
};

// src/category.ts
var findById2 = async (id) => {
  return await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var findFirst = async (where) => {
  return await prisma.category.findFirst({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var findMany = async (options = {}) => {
  const { where = {}, select = {}, orderBy = { name: "asc" }, take, skip } = options;
  return await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      ...select
    },
    orderBy,
    take,
    skip
  });
};
var create = async (data) => {
  return await prisma.category.create({
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var update = async (id, data) => {
  return await prisma.category.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};
var deleteCategory = async (id) => {
  return await prisma.category.delete({
    where: { id }
  });
};
var search = async (filters) => {
  const { page = 1, limit = 20, sortBy = "name", sortOrder = "asc", ...whereFilters } = filters;
  const skip = (page - 1) * limit;
  console.log("\u{1F50D} DB category.search - Received filters:", filters);
  const where = {};
  if (whereFilters.isActive !== void 0) {
    where.isActive = whereFilters.isActive;
  } else {
    where.isActive = true;
  }
  const searchTerm = (whereFilters.q || whereFilters.search)?.trim();
  console.log("\u{1F50D} DB category.search - searchTerm:", searchTerm, "length:", searchTerm?.length);
  if (searchTerm && searchTerm.length > 0) {
    where.name = {
      contains: searchTerm,
      mode: "insensitive"
    };
    console.log("\u2705 DB category.search - Added name filter:", where.name);
  } else {
    console.log("\u26A0\uFE0F DB category.search - No search term, will return all categories");
  }
  console.log("\u{1F50D} DB category.search - Final where clause:", JSON.stringify(where, null, 2));
  const orderBy = {};
  if (sortBy === "name" || sortBy === "createdAt" || sortBy === "updatedAt") {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.name = "asc";
  }
  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.category.count({ where })
  ]);
  console.log(`\u{1F4CA} db.categories.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, categories=${categories.length}`);
  return {
    data: categories,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
    totalPages: Math.ceil(total / limit)
  };
};
var getStats = async (whereClause) => {
  const where = whereClause?.where || whereClause || {};
  return await prisma.category.count({ where });
};
var simplifiedCategories = {
  findById: findById2,
  findFirst,
  findMany,
  create,
  update,
  delete: deleteCategory,
  search,
  getStats
};

// src/audit-logs.ts
var findMany2 = async (options = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: "desc" }, take, skip } = options;
  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      },
      ...include
    },
    orderBy,
    take,
    skip
  });
};
var getStats2 = async (whereClause) => {
  const where = whereClause?.where || whereClause || {};
  return await prisma.auditLog.count({ where });
};
var findFirst2 = async (where) => {
  return await prisma.auditLog.findFirst({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};
var create2 = async (data) => {
  return await prisma.auditLog.create({
    data,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};
var simplifiedAuditLogs = {
  findMany: findMany2,
  findFirst: findFirst2,
  create: create2,
  getStats: getStats2
};

// src/order-items.ts
var findMany3 = async (options = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: "desc" }, take, skip } = options;
  return await prisma.orderItem.findMany({
    where,
    include,
    orderBy,
    take,
    skip
  });
};
var groupBy = async (options) => {
  const { by, where = {}, _count = {}, _sum = {}, _avg = {}, orderBy, take } = options;
  const groupByOptions = {
    by,
    where,
    orderBy,
    take
  };
  if (Object.keys(_count).length > 0) {
    groupByOptions._count = _count;
  }
  if (Object.keys(_sum).length > 0) {
    groupByOptions._sum = _sum;
  }
  if (Object.keys(_avg).length > 0) {
    groupByOptions._avg = _avg;
  }
  return await prisma.orderItem.groupBy(groupByOptions);
};
var getStats3 = async (whereClause) => {
  const where = whereClause?.where || whereClause || {};
  return await prisma.orderItem.count({ where });
};
var findFirst3 = async (where) => {
  return await prisma.orderItem.findFirst({
    where,
    include: {
      order: true,
      product: true
    }
  });
};
var create3 = async (data) => {
  return await prisma.orderItem.create({
    data,
    include: {
      order: true,
      product: true
    }
  });
};
var update2 = async (id, data) => {
  return await prisma.orderItem.update({
    where: { id },
    data,
    include: {
      order: true,
      product: true
    }
  });
};
var deleteOrderItem = async (id) => {
  return await prisma.orderItem.delete({
    where: { id }
  });
};
var simplifiedOrderItems = {
  findMany: findMany3,
  findFirst: findFirst3,
  create: create3,
  update: update2,
  delete: deleteOrderItem,
  getStats: getStats3,
  groupBy
};

// src/sessions.ts
var import_crypto = require("crypto");
function generateSessionId() {
  return (0, import_crypto.randomBytes)(32).toString("hex");
}
async function createUserSession(userId, ipAddress, userAgent) {
  const sessionId = generateSessionId();
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return await prisma.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: {
        isActive: false,
        invalidatedAt: /* @__PURE__ */ new Date()
      }
    });
    const session = await tx.userSession.create({
      data: {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true
      }
    });
    return session;
  });
}
async function validateSession(sessionId) {
  if (!sessionId) {
    return false;
  }
  const session = await prisma.userSession.findUnique({
    where: { sessionId }
  });
  if (!session) {
    return false;
  }
  if (!session.isActive) {
    return false;
  }
  if (session.expiresAt < /* @__PURE__ */ new Date()) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        invalidatedAt: /* @__PURE__ */ new Date()
      }
    });
    return false;
  }
  return true;
}
async function invalidateSession(sessionId) {
  await prisma.userSession.updateMany({
    where: {
      sessionId,
      isActive: true
    },
    data: {
      isActive: false,
      invalidatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function invalidateAllUserSessions(userId) {
  await prisma.userSession.updateMany({
    where: {
      userId,
      isActive: true
    },
    data: {
      isActive: false,
      invalidatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getUserActiveSessions(userId) {
  return await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: /* @__PURE__ */ new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
async function cleanupExpiredSessions() {
  const result = await prisma.userSession.updateMany({
    where: {
      isActive: true,
      expiresAt: {
        lt: /* @__PURE__ */ new Date()
      }
    },
    data: {
      isActive: false,
      invalidatedAt: /* @__PURE__ */ new Date()
    }
  });
  return result.count;
}
var sessions = {
  generateSessionId,
  createUserSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions
};

// src/audit.ts
var AuditLogger = class {
  constructor(prisma2) {
    this.idCounter = 0;
    this.prisma = prisma2;
  }
  // Get next public ID
  async getNextPublicId() {
    return 1;
  }
  // Main logging method
  async log(data) {
    try {
      console.log("\u{1F50D} AuditLogger.log - Starting audit log creation...");
      const id = await this.getNextPublicId();
      console.log("\u{1F50D} AuditLogger.log - Got id:", id);
      const validatedUserId = await this.validateUserId(data.context.userId);
      const validatedOutletId = await this.validateOutletId(data.context.outletId);
      console.log("\u{1F50D} AuditLogger.log - About to create audit log with data:", {
        id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: validatedUserId,
        outletId: validatedOutletId
      });
      console.log("\u{1F50D} Audit log would be created:", {
        id,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId
      });
      console.log("\u2705 AuditLogger.log - Audit log created successfully");
    } catch (error) {
      console.error("\u274C AuditLogger.log - Audit logging failed:", error);
      console.error("\u274C AuditLogger.log - Error details:", error instanceof Error ? error.message : String(error));
      console.error("\u274C AuditLogger.log - Error stack:", error instanceof Error ? error.stack : void 0);
    }
  }
  // Validate foreign key IDs to prevent constraint violations
  async validateUserId(userId) {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      return user ? userId : null;
    } catch (error) {
      console.warn("\u26A0\uFE0F AuditLogger - Failed to validate userId:", userId, error);
      return null;
    }
  }
  // Note: validateMerchantId removed - tenant databases are already isolated per tenant
  async validateOutletId(outletId) {
    if (!outletId) return null;
    try {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { id: true }
      });
      return outlet ? outletId : null;
    } catch (error) {
      console.warn("\u26A0\uFE0F AuditLogger - Failed to validate outletId:", outletId, error);
      return null;
    }
  }
  // Convenience methods for common operations
  async logCreate(entityType, entityId, entityName, newValues, context, description) {
    await this.log({
      action: "CREATE",
      entityType,
      entityId,
      entityName,
      newValues,
      description: description || `Created ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logUpdate(entityType, entityId, entityName, oldValues, newValues, context, description) {
    const changes = this.calculateChanges(oldValues, newValues);
    await this.log({
      action: "UPDATE",
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      changes,
      description: description || `Updated ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logDelete(entityType, entityId, entityName, oldValues, context, description) {
    await this.log({
      action: "DELETE",
      entityType,
      entityId,
      entityName,
      oldValues,
      description: description || `Deleted ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }
  async logLogin(userId, userEmail, userRole, context, success = true) {
    await this.log({
      action: "LOGIN",
      entityType: "User",
      entityId: userId.toString(),
      entityName: userEmail,
      newValues: { success, timestamp: (/* @__PURE__ */ new Date()).toISOString() },
      severity: success ? "INFO" : "WARNING",
      category: "SECURITY",
      description: success ? `User logged in: ${userEmail}` : `Failed login attempt: ${userEmail}`,
      context
    });
  }
  async logLogout(userId, userEmail, context) {
    await this.log({
      action: "LOGOUT",
      entityType: "User",
      entityId: userId.toString(),
      entityName: userEmail,
      category: "SECURITY",
      description: `User logged out: ${userEmail}`,
      context
    });
  }
  async logSecurityEvent(event, entityType, entityId, context, severity = "WARNING", description) {
    await this.log({
      action: "CUSTOM",
      entityType,
      entityId,
      severity,
      category: "SECURITY",
      description: description || `Security event: ${event}`,
      context
    });
  }
  // Calculate changes between old and new values
  calculateChanges(oldValues, newValues) {
    const changes = {};
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    for (const key of Array.from(allKeys)) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }
    return changes;
  }
  // Query audit logs
  async getAuditLogs(filter = {}) {
    const where = {};
    if (filter.action) where.action = filter.action;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.severity) where.severity = filter.severity;
    if (filter.category) where.category = filter.category;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    const logs = [];
    const total = 0;
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      user: log.user ? {
        id: log.user.id,
        email: log.user.email,
        name: `${log.user.firstName} ${log.user.lastName}`,
        role: log.user.role
      } : null,
      // Note: merchant removed - tenant databases are already isolated per tenant
      outlet: log.outlet ? {
        id: log.outlet.id,
        name: log.outlet.name
      } : null,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      sessionId: log.sessionId,
      requestId: log.requestId,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      severity: log.severity,
      category: log.category,
      description: log.description,
      createdAt: log.createdAt
    }));
    return {
      logs: transformedLogs,
      total,
      hasMore: offset + limit < total
    };
  }
  // Get audit statistics
  async getAuditStats(filter = {}) {
    const where = {};
    if (filter.outletId) where.outletId = filter.outletId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }
    const totalLogs = 0;
    const actionStats = [];
    const entityStats = [];
    const severityStats = [];
    const categoryStats = [];
    const recentActivity = 0;
    return {
      totalLogs,
      logsByAction: actionStats.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {}),
      logsByEntity: entityStats.reduce((acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      }, {}),
      logsBySeverity: severityStats.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {}),
      logsByCategory: categoryStats.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {}),
      recentActivity
    };
  }
};
var auditLogger = null;
function getAuditLogger(prisma2) {
  if (!auditLogger) {
    if (!prisma2) {
      throw new Error("Prisma client is required for audit logging");
    }
    auditLogger = new AuditLogger(prisma2);
  }
  return auditLogger;
}
function extractAuditContext(request, user) {
  const headers = request.headers;
  return {
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    // Note: merchantId removed - tenant databases are already isolated per tenant
    outletId: user?.outletId,
    ipAddress: headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown",
    userAgent: headers.get("user-agent") || "unknown",
    sessionId: headers.get("x-session-id") || void 0,
    requestId: headers.get("x-request-id") || void 0,
    metadata: {
      method: request.method,
      url: request.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}

// src/registration.ts
var import_auth = require("@rentalshop/auth");
async function registerUser(data) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: data.email }
      });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }
      const registrationType = determineRegistrationType(data);
      if (registrationType === "MERCHANT") {
        throw new Error("MERCHANT registration is deprecated. Use registerTenantWithTrial for tenant registration instead.");
      } else if (registrationType === "OUTLET_ADMIN" || registrationType === "OUTLET_STAFF") {
        return await registerOutletUser(tx, data);
      } else {
        return await registerBasicUser(tx, data);
      }
    });
    return result;
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error(error.message || "Registration failed");
  }
}
function determineRegistrationType(data) {
  if (data.role === "MERCHANT") {
    return "MERCHANT";
  }
  if (data.role === "OUTLET_ADMIN" || data.role === "OUTLET_STAFF") {
    return data.role;
  }
  if (data.businessName) {
    return "MERCHANT";
  }
  if (data.merchantCode) {
    return "OUTLET_STAFF";
  }
  return "BASIC";
}
async function registerOutletUser(tx, data) {
  if (!data.outletCode) {
    throw new Error("Outlet code is required for outlet user registration");
  }
  const outlet = await tx.outlet.findUnique({
    where: { id: parseInt(data.outletCode) }
  });
  if (!outlet) {
    throw new Error("Invalid outlet code. Please check with your manager.");
  }
  const hashedPassword = await (0, import_auth.hashPassword)(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(" ")[0] || "",
      lastName: data.name.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "OUTLET_STAFF",
      outletId: outlet.id,
      isActive: true
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      outlet: {
        id: outlet.id,
        name: outlet.name
      }
    },
    token: "",
    // Will be generated by auth service
    message: `${data.role === "OUTLET_ADMIN" ? "Outlet admin" : "Staff"} account created successfully`
  };
}
async function registerBasicUser(tx, data) {
  const hashedPassword = await (0, import_auth.hashPassword)(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(" ")[0] || "",
      lastName: data.name.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "CLIENT",
      isActive: true
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    },
    token: "",
    // Will be generated by auth service
    message: "User account created successfully"
  };
}
async function registerTenantWithTrial(data) {
  const {
    createTenant: createTenant2,
    subdomainExists: subdomainExists2,
    tenantEmailExists: tenantEmailExists2,
    getDefaultPlan: getDefaultPlan2
  } = await Promise.resolve().then(() => (init_main_db(), main_db_exports));
  const { getTenantDb: getTenantDb2, createTenantDatabase: createTenantDatabase2 } = await Promise.resolve().then(() => (init_tenant_db(), tenant_db_exports));
  const {
    sanitizeSubdomain: sanitize,
    validateSubdomain: validate,
    buildTenantUrl: buildUrl
  } = await Promise.resolve().then(() => (init_subdomain_utils(), subdomain_utils_exports));
  const subdomain = data.subdomain ? sanitize(data.subdomain) : sanitize(data.businessName);
  if (!validate(subdomain)) {
    throw new Error("Invalid subdomain format");
  }
  if (await subdomainExists2(subdomain)) {
    throw new Error("Subdomain already taken");
  }
  if (await tenantEmailExists2(data.email)) {
    throw new Error("Email already registered");
  }
  const defaultPlan = await getDefaultPlan2();
  const planId = defaultPlan?.id || void 0;
  const trialDays = defaultPlan?.trialDays || 14;
  const trialStart = /* @__PURE__ */ new Date();
  const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1e3);
  console.log(`Creating database for tenant: ${subdomain}`);
  const databaseUrl = await createTenantDatabase2(subdomain);
  const tenant = await createTenant2({
    subdomain,
    name: data.businessName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    country: data.country,
    taxId: data.taxId,
    businessType: data.businessType,
    website: data.website,
    description: data.description,
    databaseUrl,
    status: "active",
    planId: planId || void 0,
    subscriptionStatus: "trial",
    trialStart,
    trialEnd
  });
  const tenantDb = await getTenantDb2(subdomain);
  const result = await tenantDb.$transaction(async (tx) => {
    let trialPlan = await tx.plan.findFirst({
      where: {
        name: "Trial",
        isActive: true
      }
    });
    if (!trialPlan && defaultPlan) {
      trialPlan = await tx.plan.create({
        data: {
          name: defaultPlan.name,
          description: defaultPlan.description,
          basePrice: defaultPlan.basePrice,
          currency: defaultPlan.currency,
          trialDays: defaultPlan.trialDays,
          limits: defaultPlan.limits,
          features: defaultPlan.features,
          isActive: defaultPlan.isActive,
          isPopular: defaultPlan.isPopular,
          sortOrder: defaultPlan.sortOrder
        }
      });
    }
    const outlet = await tx.outlet.create({
      data: {
        name: data.outletName || "Main Store",
        address: data.address || "Address to be updated",
        phone: data.phone,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        description: "Default outlet created during registration",
        isActive: true,
        isDefault: true
      }
    });
    const defaultCategory = await tx.category.create({
      data: {
        name: "General",
        description: "Default category for general products",
        isActive: true,
        isDefault: false
      }
    });
    const hashedPassword = await (0, import_auth.hashPassword)(data.password);
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "MERCHANT",
        outletId: outlet.id,
        isActive: true,
        emailVerified: false,
        emailVerifiedAt: null
      }
    });
    let subscription = null;
    if (trialPlan && trialPlan.id) {
      subscription = await tx.subscription.create({
        data: {
          planId: trialPlan.id,
          status: "trial",
          currentPeriodStart: trialStart,
          currentPeriodEnd: trialEnd,
          trialStart,
          trialEnd,
          amount: 0,
          currency: trialPlan.currency || "USD",
          interval: "month",
          intervalCount: 1,
          period: 1,
          discount: 0,
          savings: 0
        }
      });
    }
    return {
      user,
      outlet,
      subscription,
      plan: trialPlan
    };
  });
  const tenantUrl = buildUrl(subdomain);
  return {
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      email: tenant.email
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role
    },
    outlet: {
      id: result.outlet.id,
      name: result.outlet.name
    },
    subscription: {
      planName: result.plan?.name || "Trial",
      trialEnd: result.subscription?.trialEnd || trialEnd
    },
    tenantUrl
  };
}

// src/email-verification.ts
var import_crypto2 = require("crypto");
function generateVerificationToken() {
  return (0, import_crypto2.randomBytes)(32).toString("hex");
}
async function createEmailVerification(userId, email, expiresInHours = 24) {
  const token = generateVerificationToken();
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  await prisma.$executeRaw`
    UPDATE "EmailVerification"
    SET verified = true, "verifiedAt" = NOW()
    WHERE "userId" = ${userId}
      AND verified = false
      AND "expiresAt" > NOW()
  `;
  const verification = await prisma.emailVerification.create({
    data: {
      userId,
      token,
      email,
      expiresAt
    }
  });
  return verification;
}
async function verifyEmailByToken(token) {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      email: true,
      token: true,
      verified: true,
      expiresAt: true
    }
  });
  if (!verification) {
    return {
      success: false,
      error: "Token kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c kh\xF4ng t\u1ED3n t\u1EA1i"
    };
  }
  if (verification.verified) {
    return {
      success: false,
      error: "Token \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng"
    };
  }
  if (/* @__PURE__ */ new Date() > verification.expiresAt) {
    return {
      success: false,
      error: "Token \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng y\xEAu c\u1EA7u g\u1EEDi l\u1EA1i email x\xE1c th\u1EF1c"
    };
  }
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
      verifiedAt: /* @__PURE__ */ new Date()
    }
  });
  const user = await prisma.user.findUnique({
    where: { id: verification.userId },
    select: {
      id: true,
      email: true
    }
  });
  if (!user) {
    return {
      success: false,
      error: "User kh\xF4ng t\u1ED3n t\u1EA1i"
    };
  }
  await prisma.user.update({
    where: { id: verification.userId },
    data: {
      emailVerified: true,
      emailVerifiedAt: /* @__PURE__ */ new Date()
    }
  });
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email
    }
  };
}
async function getVerificationTokenByUserId(userId) {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      verified: false,
      expiresAt: { gt: /* @__PURE__ */ new Date() }
      // Not expired
    },
    orderBy: { createdAt: "desc" }
  });
  return verification;
}
async function resendVerificationToken(userId, email) {
  return await createEmailVerification(userId, email);
}
async function isEmailVerified(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true }
  });
  return user?.emailVerified || false;
}
async function deleteExpiredTokens() {
  const result = await prisma.emailVerification.deleteMany({
    where: {
      expiresAt: { lt: /* @__PURE__ */ new Date() },
      verified: false
    }
  });
  return result.count;
}

// src/index.ts
init_tenant_db();

// src/tenant-db-manager.ts
var import_client18 = require("@prisma/client");
var import_pg3 = require("pg");
async function getMainDb() {
  const url = new URL(process.env.MAIN_DATABASE_URL);
  return new import_pg3.Client({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });
}

// src/index.ts
init_main_db();
init_subdomain_utils();
var db = {
  // ============================================================================
  // PRISMA CLIENT (for transactions)
  // ============================================================================
  prisma,
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  users: simplifiedUsers,
  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================
  customers: simplifiedCustomers,
  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================
  products: simplifiedProducts,
  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================
  orders: simplifiedOrders,
  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================
  payments: simplifiedPayments,
  // ============================================================================
  // OUTLET OPERATIONS
  // ============================================================================
  outlets: simplifiedOutlets,
  // ============================================================================
  // MERCHANT OPERATIONS
  // ============================================================================
  // merchants: simplifiedMerchants, // TEMPORARY: Disabled for multi-tenant migration
  // ============================================================================
  // PLAN OPERATIONS
  // ============================================================================
  plans: simplifiedPlans,
  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  categories: simplifiedCategories,
  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================
  auditLogs: simplifiedAuditLogs,
  // ============================================================================
  // ORDER ITEM OPERATIONS
  // ============================================================================
  orderItems: simplifiedOrderItems,
  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================
  subscriptions: simplifiedSubscriptions,
  // ============================================================================
  // ORDER NUMBER OPERATIONS
  // ============================================================================
  orderNumbers: simplifiedOrderNumbers,
  // ============================================================================
  // OUTLET STOCK OPERATIONS
  // ============================================================================
  outletStock: {
    /**
     * Aggregate outlet stock statistics
     */
    aggregate: async (options) => {
      return await prisma.outletStock.aggregate(options);
    }
  },
  // ============================================================================
  // SUBSCRIPTION ACTIVITY OPERATIONS
  // ============================================================================
  subscriptionActivities: simplifiedSubscriptionActivities,
  // ============================================================================
  // SESSION OPERATIONS (Single Session Enforcement)
  // ============================================================================
  sessions
};
var checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (error) {
    return { status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" };
  }
};
var generateOrderNumber2 = async (outletId) => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const generateRandom8Digits = () => {
    return Math.floor(1e7 + Math.random() * 9e7).toString();
  };
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const randomSequence = generateRandom8Digits();
    const orderNumber = randomSequence;
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    });
    if (!existingOrder) {
      return orderNumber;
    }
  }
  throw new Error("Failed to generate unique order number after maximum retries");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuditLogger,
  buildTenantUrl,
  checkDatabaseConnection,
  clearTenantCache,
  createEmailVerification,
  createOrderNumberWithFormat,
  createSubscriptionPayment,
  createTenant,
  createTenantDatabase,
  db,
  deleteExpiredTokens,
  extractAuditContext,
  extractSubdomain,
  generateOrderNumber,
  generateSubdomain,
  generateVerificationToken,
  getAuditLogger,
  getCachedTenants,
  getDefaultOutlet,
  getDefaultPlan,
  getExpiredSubscriptions,
  getMainDb,
  getMainDbClient,
  getOutletOrderStats,
  getPlanById,
  getProtocol,
  getReservedSubdomains,
  getRootDomain,
  getSubscriptionById,
  getTenantById,
  getTenantBySubdomain,
  getTenantDb,
  getVerificationTokenByUserId,
  isEmailVerified,
  isReservedSubdomain,
  listActivePlans,
  listAllTenants,
  prisma,
  registerTenantWithTrial,
  registerUser,
  resendVerificationToken,
  sanitizeSubdomain,
  searchOrders,
  simplifiedPayments,
  simplifiedSubscriptionActivities,
  subdomainExists,
  tenantEmailExists,
  updateSubscription,
  updateTenant,
  validateSubdomain,
  verifyEmailByToken
});
//# sourceMappingURL=index.js.map