/**
 * #1341 (#1335): OutletStock.isListed. Additive structure (idempotent column + index), then two set-based backfill
 * statements. The rows themselves are checked against a real database in e2e/business/product-listing.e2e.test.js (BF-LIST-14).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.resolve(__dirname, '../prisma/migrations');
const NAME = '20261031090000_outlet_stock_is_listed';

describe(`migration ${NAME}`, () => {
  const file = path.join(DIR, NAME, 'migration.sql');
  const sql = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const code = sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();

  it('sorts after the migrations it follows', () => {
    const names = fs.readdirSync(DIR).filter((n) => /^\d{14}_/.test(n)).sort();
    expect(names[names.length - 1]).toBe(NAME);
  });

  it('adds the column with a default and the index, both idempotent', () => {
    expect(code).toMatch(/ALTER TABLE "public"\."OutletStock" ADD COLUMN IF NOT EXISTS "isListed" BOOLEAN NOT NULL DEFAULT true/);
    expect(code).toMatch(/CREATE INDEX IF NOT EXISTS "OutletStock_outletId_isListed_idx" ON "public"\."OutletStock"\("outletId", "isListed"\)/);
  });

  it('matches the schema: Boolean @default(true) and @@index([outletId, isListed])', () => {
    const schema = fs.readFileSync(path.resolve(__dirname, '../prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model OutletStock {'), schema.indexOf('model Customer {'));
    expect(model).toMatch(/isListed\s+Boolean\s+@default\(true\)/);
    expect(model).toMatch(/@@index\(\[outletId, isListed\]\)/);
  });

  it('never drops, deletes or truncates, and has no loop (one set-based statement per step)', () => {
    expect(code).not.toMatch(/\b(DROP|DELETE|TRUNCATE|LOOP|FOR EACH|DO \$\$)\b/i);
    expect(code.match(/\bUPDATE\b/gi)).toHaveLength(2);
  });

  it('step 1 unlists only rows with stock 0, renting 0 and no order history at that branch, and leaves deleted products alone', () => {
    expect(code).toMatch(/SET "isListed" = false/);
    expect(code).toMatch(/os\."stock" = 0/);
    expect(code).toMatch(/os\."renting" = 0/);
    expect(code).toMatch(/NOT EXISTS \( SELECT 1 FROM "public"\."OrderItem" oi JOIN "public"\."Order" o ON o\."id" = oi\."orderId" WHERE oi\."productId" = os\."productId" AND o\."outletId" = os\."outletId" \)/);
    expect(code).toMatch(/p\."deletedAt" IS NULL/);
  });

  it('step 2 lists the smallest row id of every undeleted product that has none listed', () => {
    expect(code).toMatch(/SET "isListed" = true/);
    expect(code).toMatch(/SELECT MIN\(s\."id"\)/);
    expect(code).toMatch(/GROUP BY s\."productId" HAVING NOT bool_or\(s\."isListed"\)/);
  });
});
