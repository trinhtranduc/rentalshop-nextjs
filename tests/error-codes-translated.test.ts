/**
 * #740: the web never shows an API error code.
 *
 * 1. Every code the API can return has a translation in locales/en and locales/vi `errors.json` (a new code added
 *    in the API without its sentence fails here).
 * 2. `lookupErrorTranslation` tells a missing translation apart: next-intl answers `errors.<CODE>` for a missing
 *    key, which the old `t(code) !== code` check took for a translation.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { looksLikeErrorCode, lookupErrorTranslation } from '../packages/utils/src/core/error-display';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = [
  'apps/api/app',
  'apps/api/lib',
  'packages/auth/src',
  'packages/middleware/src',
  'packages/utils/src',
  'packages/database/src',
  'packages/errors/src',
];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '__tests__', '.next'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Codes the API sends: ResponseBuilder.error('X'), `code: 'X'`, ErrorCode.X */
function apiCodes(): Map<string, string> {
  const found = new Map<string, string>();
  const patterns = [
    /ResponseBuilder\.error\(\s*['"]([A-Z][A-Z0-9_]{3,})['"]/g,
    /\bcode:\s*['"]([A-Z][A-Z0-9_]{3,})['"]/g,
    /ErrorCode\.([A-Z][A-Z0-9_]{3,})/g,
  ];
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const re of patterns) {
        for (const m of text.matchAll(re)) if (!found.has(m[1])) found.set(m[1], path.relative(ROOT, file));
      }
    }
  }
  return found;
}

function keys(lang: string): Set<string> {
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', lang, 'errors.json'), 'utf8'));
  return new Set(Object.keys(json).filter((k) => k !== '_comment'));
}

describe('error codes have a translation (#740)', () => {
  const codes = apiCodes();

  it('finds the codes of the API', () => {
    expect(codes.size).toBeGreaterThan(300);
    expect(codes.has('PLAN_LIMIT_EXCEEDED')).toBe(true);
  });

  for (const lang of ['en', 'vi']) {
    it(`locales/${lang}/errors.json has every code of the API`, () => {
      const have = keys(lang);
      const missing = [...codes].filter(([code]) => !have.has(code)).map(([code, file]) => `${code} (${file})`);
      expect(missing).toEqual([]);
    });
  }

  it('en and vi have the same codes', () => {
    const en = keys('en');
    const vi = keys('vi');
    expect([...en].filter((k) => !vi.has(k))).toEqual([]);
    expect([...vi].filter((k) => !en.has(k))).toEqual([]);
  });

  it('no translation is empty or a copy of its code', () => {
    for (const lang of ['en', 'vi']) {
      const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', lang, 'errors.json'), 'utf8'));
      const bad = Object.entries(json)
        .filter(([k, v]) => k !== '_comment' && (typeof v !== 'string' || !v.trim() || v === k || looksLikeErrorCode(v)))
        .map(([k]) => k);
      expect(bad).toEqual([]);
    }
  });
});

describe('lookupErrorTranslation (#740)', () => {
  const messages: Record<string, string> = { PLAN_LIMIT_EXCEEDED: 'Vượt quá giới hạn gói' };
  /** What next-intl does: a missing key answers `<namespace>.<key>` */
  const nextIntl = Object.assign((key: string) => messages[key] ?? `errors.${key}`, { has: (key: string) => key in messages });
  /** A translator without `has` */
  const noHas = (key: string) => messages[key] ?? `errors.${key}`;

  it('returns the sentence of a known code', () => {
    expect(lookupErrorTranslation(nextIntl, 'PLAN_LIMIT_EXCEEDED')).toBe('Vượt quá giới hạn gói');
    expect(lookupErrorTranslation(noHas, 'PLAN_LIMIT_EXCEEDED')).toBe('Vượt quá giới hạn gói');
  });

  it('returns null, never the code or errors.<CODE>, for a missing one', () => {
    expect(lookupErrorTranslation(nextIntl, 'PLAN_UPGRADE_REQUIRED')).toBeNull();
    expect(lookupErrorTranslation(noHas, 'PLAN_UPGRADE_REQUIRED')).toBeNull();
    expect(lookupErrorTranslation((key: string) => key, 'SOME_CODE')).toBeNull();
  });

  it('returns null for no code and survives a throwing translator', () => {
    expect(lookupErrorTranslation(nextIntl, undefined)).toBeNull();
    expect(lookupErrorTranslation(nextIntl, '')).toBeNull();
    expect(
      lookupErrorTranslation(() => {
        throw new Error('boom');
      }, 'X_CODE'),
    ).toBeNull();
  });

  it('looksLikeErrorCode tells a code or key from a sentence', () => {
    for (const code of ['PLAN_LIMIT_EXCEEDED', 'errors.PLAN_UPGRADE_REQUIRED', 'NO_SUBSCRIPTION']) expect(looksLikeErrorCode(code)).toBe(true);
    for (const text of ['Plan limit exceeded', 'Vượt quá giới hạn gói', '', 'OK', 'Not Found']) expect(looksLikeErrorCode(text)).toBe(false);
  });
});
