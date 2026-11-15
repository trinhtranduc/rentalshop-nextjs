/**
 * #1597 the logged-in web speaks every language that is on for the web (`webLanguages()`, #1579 / #1580).
 * Settings → Language lists them, and the server (`i18n.ts`) and the root layout load `locales/<code>/*.json` over
 * English. Before: Settings listed VI / EN, the app kept 5 languages, and ja / ko / zh showed English on most pages.
 */
import * as fs from 'fs';
import * as path from 'path';
import { webLanguages } from '../packages/constants/src/app-languages';
import { APP_LOCALES, appLocaleFor } from '../apps/client/lib/public-content/shop-locale';
import { APP_NAMESPACES, appMessages } from '../apps/client/lib/app-messages';

const root = path.join(__dirname, '..');
const src = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const read = (p: string) => JSON.parse(src(p));
const WEB = webLanguages().map((l) => l.code);

const flat = (o: unknown, p = ''): Record<string, unknown> =>
  o && typeof o === 'object' && !Array.isArray(o)
    ? Object.entries(o as Record<string, unknown>).reduce(
        (acc, [k, v]) => ({ ...acc, ...flat(v, p ? `${p}.${k}` : k) }),
        {} as Record<string, unknown>
      )
    : { [p]: o };

describe('#1597 app languages on the web', () => {
  it('the app languages are the web languages (12)', () => {
    expect([...APP_LOCALES].sort()).toEqual([...WEB].sort());
    expect(WEB).toHaveLength(12);
  });

  it.each(WEB)('NEXT_LOCALE=%s keeps that language', (code) => {
    expect(appLocaleFor(code)).toBe(code);
  });

  it('no language or an unknown one → Vietnamese', () => {
    expect(appLocaleFor(undefined)).toBe('vi');
    expect(appLocaleFor('')).toBe('vi');
    expect(appLocaleFor('xx')).toBe('vi');
  });

  it('Settings → Language lists the web languages by their own names', () => {
    const settings = src('apps/client/app/settings/sections.tsx');
    expect(settings).toMatch(/export const LANGUAGES = webLanguages\(\)/);
    expect(settings).not.toMatch(/\{ value: 'en', label: 'English' \}/);
  });

  it('the server config and the root layout load the app messages', () => {
    expect(src('apps/client/i18n.ts')).toMatch(/appMessages\(/);
    expect(src('apps/client/app/layout.tsx')).toMatch(/: await appMessages\(locale\)/);
  });

  it('the language switch no longer sends zh / ko / ja back to English', () => {
    expect(src('packages/ui/src/components/layout/LanguageSwitcher.tsx')).not.toMatch(/\['zh', 'ko', 'ja'\]\.includes/);
  });

  it('the date range picker names months in the picked language (Thai with Gregorian years)', () => {
    const picker = src('packages/ui/src/components/ui/date-range-picker.tsx');
    expect(picker).not.toMatch(/intlLocaleMap\[locale\] \|\| 'vi-VN'/);
    expect(picker).toMatch(/th-TH-u-ca-gregory/);
  });
});

describe.each(WEB)('#1597 %s messages', (code) => {
  it.each([...APP_NAMESPACES])('%s: the language file over English', async (ns) => {
    const got = flat((await appMessages(code))[ns]);
    const own = flat(read(`locales/${code}/${ns}.json`));
    const en = flat(read(`locales/en/${ns}.json`));
    expect(Object.keys(own).filter((k) => got[k] !== own[k])).toEqual([]);
    expect(Object.keys(en).filter((k) => !(k in got))).toEqual([]);
  });
});
