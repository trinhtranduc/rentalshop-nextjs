/**
 * #1603: every product that is not deleted is shown at one open branch at least. A data-only migration lists the products
 * that are listed nowhere at the shop's default open branch (else its open branch with the smallest id). The rows themselves
 * are checked against a real database in e2e/business/product-listing.e2e.test.js (BF-LIST-18).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.resolve(__dirname, '../prisma/migrations');
const NAME = '20261116120000_products_listed_at_one_branch';

describe(`migration ${NAME}`, () => {
  const file = path.join(DIR, NAME, 'migration.sql');
  const sql = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const code = sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim();

  it('exists and sorts after the last migration on main-real', () => {
    expect(fs.existsSync(file)).toBe(true);
    const names = fs.readdirSync(DIR).filter((n) => /^\d{14}_/.test(n)).sort();
    expect(names.indexOf(NAME)).toBeGreaterThan(names.indexOf('20261113120000_merchant_language'));
    expect(names.indexOf('20261113120000_merchant_language')).toBeGreaterThanOrEqual(0);
  });

  it('is data only: no schema change, no drop, delete, truncate or loop', () => {
    expect(code).not.toMatch(/\b(ALTER|CREATE TABLE|CREATE INDEX|DROP|DELETE|TRUNCATE|LOOP|FOR EACH|DO \$\$)\b/i);
  });

  it('only touches products listed at no open branch, skips deleted ones, and is idempotent', () => {
    expect(code).toMatch(/"deletedAt" IS NULL/);
    expect(code).toMatch(/NOT EXISTS/);
    expect(code).toMatch(/"isActive"/);
    expect(code).toMatch(/"isDefault"/);
    expect(code).toMatch(/ON CONFLICT \("productId", "outletId"\) DO UPDATE SET "isListed" = true/);
  });
});
