/**
 * #1566 — English names the two kinds of money apart, on the web, iOS and Android:
 * - tiền cọc (paid at booking, counts toward the rent) → "booking deposit";
 * - thế chân (held, given back at return) → "security deposit" (#1560).
 * A bare "deposit" is not allowed where the Vietnamese says cọc or thế chân.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const BARE = /(?<![Ss]ecurity )(?<![Bb]ooking )\b[Dd]eposits?\b/;

function flatJson(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (o: unknown, path: string) => {
    if (typeof o === 'string') out[path] = o;
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith('.json'))) {
    walk(JSON.parse(readFileSync(join(root, dir, f), 'utf8')), f);
  }
  return out;
}
const ios = (folder: string) =>
  Object.fromEntries(
    [...readFileSync(join(root, 'apps/mobile/POS ADBD', `${folder}.lproj`, 'Localizable.strings'), 'utf8').matchAll(
      /^\s*"((?:[^"\\]|\\.)+)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/gm
    )].map((m) => [m[1], m[2]])
  ) as Record<string, string>;
const android = (dir: string) =>
  Object.fromEntries(
    [...readFileSync(join(root, 'apps/mobile-android/app/src/main/res', dir, 'strings.xml'), 'utf8').matchAll(
      /<string name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g
    )].map((m) => [m[1], m[2]])
  ) as Record<string, string>;

/** Keys whose English still says a bare "deposit" where the Vietnamese says cọc or thế chân */
function bare(en: Record<string, string>, vi: Record<string, string>): string[] {
  return Object.keys(en).filter((k) => {
    const v = (vi[k] ?? '').toLowerCase();
    return (v.includes('cọc') || v.includes('thế chân')) && BARE.test(en[k]);
  });
}

describe('booking deposit vs security deposit in English (#1566)', () => {
  it('web', () => {
    expect(existsSync(join(root, 'locales/en'))).toBe(true);
    expect(bare(flatJson('locales/en'), flatJson('locales/vi'))).toEqual([]);
  });

  it('iOS', () => {
    expect(bare(ios('en'), ios('vi-VN'))).toEqual([]);
  });

  it('Android', () => {
    expect(bare(android('values'), android('values-vi'))).toEqual([]);
  });

  it('examples', () => {
    const web = flatJson('locales/en');
    expect(web['orders.json.amount.deposit'] ?? web['orders.json.detailMoney.deposit'] ?? '').toMatch(/^Booking [Dd]eposit|^$/);
    const i = ios('en');
    expect(i['Collateral (received)_Short']).toBe('Security deposit held');
    expect(i['Collateral (return)_Short']).toBe('Security deposit due');
  });
});
