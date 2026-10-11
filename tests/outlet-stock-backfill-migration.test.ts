/**
 * #824: one-time backfill of 0-stock OutletStock rows for every (non-deleted product, active outlet of the same
 * merchant) pair that has no row yet. Data-only and idempotent (ON CONFLICT DO NOTHING on the unique pair).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.resolve(__dirname, '../prisma/migrations');
const NAME = '20261011120000_backfill_outlet_stock_zero';

describe(`migration ${NAME}`, () => {
  const file = path.join(DIR, NAME, 'migration.sql');
  const sql = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const code = sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();

  it('exists in a new folder', () => {
    expect(sql).not.toBe('');
  });

  it('is data only: one INSERT, no DDL, no UPDATE or DELETE', () => {
    expect(code).not.toMatch(/\b(CREATE|ALTER|DROP|TRUNCATE|UPDATE|DELETE)\b/i);
    expect(code.match(/\bINSERT INTO\b/gi)).toHaveLength(1);
  });

  it('inserts 0 / 0 / 0 rows into OutletStock', () => {
    expect(code).toMatch(/INSERT INTO "(public"\.")?OutletStock" \( ?"productId", "outletId", "stock", "available", "renting", "createdAt", "updatedAt" ?\)/);
    expect(code).toMatch(/SELECT p\."id", o\."id", 0, 0, 0, (NOW\(\)|CURRENT_TIMESTAMP), (NOW\(\)|CURRENT_TIMESTAMP)/i);
  });

  it('pairs non-deleted products with active outlets of the same merchant', () => {
    expect(code).toMatch(/o\."merchantId" = p\."merchantId"/);
    expect(code).toMatch(/p\."deletedAt" IS NULL/);
    expect(code).toMatch(/o\."isActive" = true/);
  });

  it('is idempotent on the unique (productId, outletId)', () => {
    expect(code).toMatch(/ON CONFLICT \("productId", "outletId"\) DO NOTHING/);
  });
});
