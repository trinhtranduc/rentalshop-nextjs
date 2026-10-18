/**
 * #986 part A: iOS, Android, and locales/vi/errors-mobile.json share one code list.
 * English and Vietnamese sentences match locales/en/errors.json and locales/vi/errors.json.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

function readJson(rel: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function iosUnescape(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[++i];
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else out += n;
      continue;
    }
    out += s[i];
  }
  return out;
}

function parseIos(rel: string): Map<string, string[]> {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const map = new Map<string, string[]>();
  const re = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = iosUnescape(m[1]);
    const value = iosUnescape(m[2]);
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  }
  return map;
}

function xmlUnescape(s: string): string {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseXml(rel: string): Map<string, string> {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const map = new Map<string, string>();
  const re = /<string name="([^"]+)">([\s\S]*?)<\/string>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) map.set(m[1], xmlUnescape(m[2]));
  return map;
}

function parseKotlinCodes(): Map<string, string> {
  const text = fs.readFileSync(
    path.join(root, 'apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/error/ApiErrorMessages.kt'),
    'utf8'
  );
  const start = text.indexOf('internal fun stringId');
  const end = text.indexOf('internal fun noParamsStringId');
  const block = text.slice(start, end);
  const map = new Map<string, string>();
  for (const line of block.split('\n')) {
    const res = line.match(/->\s*R\.string\.(\w+)/);
    if (!res || line.includes('else ->')) continue;
    for (const found of line.matchAll(/"([A-Z][A-Z0-9_]*)"/g)) map.set(found[1], res[1]);
  }
  return map;
}

const mobile = readJson('locales/vi/errors-mobile.json');
const codes = Object.keys(mobile).filter((k) => !k.startsWith('_')).sort();
const en = readJson('locales/en/errors.json');
const vi = readJson('locales/vi/errors.json');
const banned = /prisma|\bSQL\b|stack trace|\bconstraint\b|\bundefined\b|\bnull\b|P1001|\bdatabase\b|cơ sở dữ liệu|internal server|máy chủ|gateway|ML model|mô hình ML|\bAWS\b|\bS3\b/i;

describe('#986 mobile error catalog', () => {
  it('uses the same codes on iOS, Android, and errors-mobile.json', () => {
    const ios = parseIos('apps/mobile/POS ADBD/en.lproj/Localizable.strings');
    const kotlin = parseKotlinCodes();
    const missingIos = codes.filter((c) => !ios.has(c));
    const missingAndroid = codes.filter((c) => !kotlin.has(c));
    const extraAndroid = [...kotlin.keys()].filter((c) => !codes.includes(c));
    expect(missingIos).toEqual([]);
    expect(missingAndroid).toEqual([]);
    expect(extraAndroid).toEqual([]);
    expect(codes.length).toBeGreaterThan(300);
  });

  it('copies English and Vietnamese sentences from errors.json', () => {
    const iosEn = parseIos('apps/mobile/POS ADBD/en.lproj/Localizable.strings');
    const iosVi = parseIos('apps/mobile/POS ADBD/vi-VN.lproj/Localizable.strings');
    const xmlEn = parseXml('apps/mobile-android/app/src/main/res/values/strings.xml');
    const xmlVi = parseXml('apps/mobile-android/app/src/main/res/values-vi/strings.xml');
    const kotlin = parseKotlinCodes();
    const mismatches: string[] = [];
    for (const code of codes) {
      if (en[code] == null || vi[code] == null) {
        mismatches.push(`${code} missing from errors.json`);
        continue;
      }
      if (banned.test(en[code]) || banned.test(vi[code])) mismatches.push(`${code} technical wording`);
      const enValues = iosEn.get(code) ?? [];
      const viValues = iosVi.get(code) ?? [];
      if (enValues.some((v) => v !== en[code])) mismatches.push(`${code} iOS en`);
      if (viValues.some((v) => v !== vi[code])) mismatches.push(`${code} iOS vi`);
      const res = kotlin.get(code);
      if (!res || xmlEn.get(res) !== en[code] || xmlVi.get(res) !== vi[code]) {
        mismatches.push(`${code} Android`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('keeps INVALID_CREDENTIALS and PRODUCT_HAS_OPEN_ORDERS on both apps', () => {
    const iosEn = parseIos('apps/mobile/POS ADBD/en.lproj/Localizable.strings');
    const iosVi = parseIos('apps/mobile/POS ADBD/vi-VN.lproj/Localizable.strings');
    const kotlin = parseKotlinCodes();
    for (const code of ['INVALID_CREDENTIALS', 'PRODUCT_HAS_OPEN_ORDERS']) {
      expect(iosEn.get(code)).toEqual([en[code]]);
      expect(iosVi.get(code)).toEqual([vi[code]]);
      expect(kotlin.has(code)).toBe(true);
    }
  });

  it('adds the new mobile codes to ja, ko, and zh catalogs', () => {
    const extra = [
      'RATING_REQUEST_SHOWN',
      'DEPOSIT_EDIT_FAILED',
      'DATABASE_ERROR',
      'INTERNAL_SERVER_ERROR',
      'GATEWAY_ERROR',
      'AWS_S3_TEST_FAILED',
    ];
    for (const locale of ['ja', 'ko', 'zh']) {
      const catalog = readJson(`locales/${locale}/errors.json`);
      for (const code of extra) {
        expect(typeof catalog[code]).toBe('string');
        expect(catalog[code]).not.toBe(vi[code]);
        expect(banned.test(catalog[code])).toBe(false);
      }
    }
  });
});
