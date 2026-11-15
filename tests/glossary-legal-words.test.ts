/**
 * #1564 — words a rental shop must not show customers in each market (locales/GLOSSARY.md, Markets):
 * - ja 手付金, ko 계약금, zh 定金: a deposit the customer loses and the shop pays back double (legal rule).
 *   AnyRent's tiền cọc is 内金 / 예약금 / 订金.
 * - zh 保证金: on Chinese platforms the seller's own bond. Thế chân (money given back at return) is 押金.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const FORBIDDEN: Record<string, RegExp> = { ja: /手付金/, ko: /계약금/, zh: /定金|保证金/ };

function values(lang: string): Array<[string, string]> {
  const dir = join(root, 'locales', lang);
  if (!existsSync(dir)) return [];
  const out: Array<[string, string]> = [];
  const walk = (o: unknown, path: string) => {
    if (typeof o === 'string') out.push([path, o]);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) walk(JSON.parse(readFileSync(join(dir, f), 'utf8')), f);
  return out;
}

describe('legally loaded deposit words (#1564)', () => {
  it.each(Object.keys(FORBIDDEN))('%s files do not use them', (lang) => {
    expect(values(lang).filter(([, v]) => FORBIDDEN[lang].test(v)).map(([k]) => k)).toEqual([]);
  });

  it('zh says 订金 for the booking deposit (Vietnamese: cọc)', () => {
    const zh = Object.fromEntries(values('zh'));
    expect(zh['errors.json.DEPOSIT_AMOUNT_REQUIRED']).toContain('订金');
    expect(zh['settings.json.web.deposit.stage1Title']).toBe('订金');
  });
});
