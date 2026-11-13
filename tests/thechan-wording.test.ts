/**
 * #1560 — the money or papers held until the return are "thế chân" in Vietnamese (as the apps, #492) and
 * "Security deposit" / "Security document" in English, never "thế chấp" / "Collateral".
 * Owner, 2026-11-13: other languages say guarantee money (tiền đảm bảo); Vietnamese keeps thế chân.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function jsonValues(dir: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (o: unknown, path: string) => {
    if (typeof o === 'string') out.push([path, o]);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith('.json'))) {
    walk(JSON.parse(readFileSync(join(root, dir, f), 'utf8')), f);
  }
  return out;
}
const iosValues = (folder: string) =>
  [...readFileSync(join(root, 'apps/mobile/POS ADBD', `${folder}.lproj`, 'Localizable.strings'), 'utf8').matchAll(
    /^\s*"((?:[^"\\]|\\.)+)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/gm
  )].map((m) => [m[1], m[2]] as [string, string]);
const androidTexts = (dir: string) =>
  [...readFileSync(join(root, 'apps/mobile-android/app/src/main/res', dir, 'strings.xml'), 'utf8').matchAll(
    /<(string|item)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g
  )].map((m) => [m[2], m[3].replace(/^[A-Za-z]+\|/, '')] as [string, string]);

describe('thế chân wording (#1560)', () => {
  it('web Vietnamese says thế chân, never thế chấp', () => {
    expect(jsonValues('locales/vi').filter(([, v]) => /thế chấp/i.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('English says security deposit / security document, never collateral (web, iOS, Android)', () => {
    const web = jsonValues('locales/en').filter(([, v]) => /collateral/i.test(v)).map(([k]) => k);
    const ios = iosValues('en').filter(([, v]) => /collateral/i.test(v)).map(([k]) => k);
    const android = androidTexts('values').filter(([, v]) => /collateral/i.test(v)).map(([k]) => k);
    expect({ web, ios, android }).toEqual({ web: [], ios: [], android: [] });
  });

  it('the papers are a security document, the money a security deposit', () => {
    const en = Object.fromEntries(jsonValues('locales/en'));
    expect(en['orders.json.amount.collateralType']).toBe('Security Document Type');
    expect(en['orders.json.amount.securityDeposit']).toBe('Security Deposit');
    expect(en['dashboard.json.home.kpi.collateral']).toBe('Security deposit');
    const ios = Object.fromEntries(iosValues('en'));
    expect(ios['history.field.collateralDetails']).toBe('Security document details');
    expect(ios['Collateral money held']).toBe('Security deposit held');
  });
});
