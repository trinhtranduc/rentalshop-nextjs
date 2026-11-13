/**
 * #1554 (#1553 phase 1) — every app language that is switched on has every string, on the web, iOS and Android.
 * The list of app languages and their on/off switch live in one place: packages/constants/src/app-languages.ts.
 * Missing keys still fall back to English on the web (mergeOverEnglish), but a language is switched on only when complete.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { APP_LANGUAGES, enabledAppLanguages, isEnabledAppLanguage } from '../packages/constants/src/app-languages';

const root = join(__dirname, '..');
const VI_CHARS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
/** Vietnamese words a translation may keep: the garment "áo dài", the đồng sign, the language's own name */
const KEEP = [/áo dài/giu, /(\d|\(|\s|^)đ(?!\p{L})/gu, /Tiếng Việt/gu];
const leftoverVietnamese = (text: string) => VI_CHARS.test(KEEP.reduce((t, re) => t.replace(re, '$1'), text));
/** Web strings only Android reads (its error catalog) */
const MOBILE_ONLY_FILES = ['errors-mobile.json'];

type Flat = Record<string, unknown>;
function flat(obj: unknown, prefix = ''): Flat {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.entries(obj as Record<string, unknown>).reduce<Flat>(
      (out, [k, v]) => ({ ...out, ...flat(v, prefix ? `${prefix}.${k}` : k) }),
      {}
    );
  }
  return { [prefix]: obj };
}
/** ICU variable names: {count}, {count, plural, …} → count */
const icuVars = (s: string) => [...s.matchAll(/\{\s*([A-Za-z_][\w]*)\s*[,}]/g)].map((m) => m[1]).sort();
/** printf-style arguments as a set: %@, %d, %1$@, %1$s, %.2f (a literal %% is not one; plural forms repeat them) */
const printfArgs = (s: string) =>
  [...new Set([...s.replace(/%%/g, '').matchAll(/%(\d+\$)?[-+#0]*\d*(\.\d+)?(@|s|d|f|ld|lld|i)/g)].map((m) => m[0]))].sort();
/** Keys whose word order needs other arguments per language (English month name, Vietnamese month number) */
const ARGS_MAY_DIFFER = ['v2_calendar_month'];

describe('app languages (#1554)', () => {
  it('Tiếng Việt and English are on; 日本語, 한국어, 中文 are listed but off until translated', () => {
    expect(enabledAppLanguages().map((l) => l.code)).toEqual(['vi', 'en']);
    for (const code of ['ja', 'ko', 'zh']) {
      expect(APP_LANGUAGES.find((l) => l.code === code)?.enabled).toBe(false);
      expect(isEnabledAppLanguage(code)).toBe(false);
    }
    expect(new Set(APP_LANGUAGES.map((l) => l.code)).size).toBe(APP_LANGUAGES.length);
  });

  it('every language names its folders on the web, iOS and Android', () => {
    for (const l of APP_LANGUAGES) {
      expect(l.web).toBe(l.code);
      expect(l.ios).toMatch(/^[a-z]{2}(-[A-Za-z]+)?$/);
      expect(typeof l.android).toBe('string');
    }
    expect(APP_LANGUAGES.find((l) => l.code === 'vi')).toMatchObject({ ios: 'vi-VN', android: 'vi' });
    expect(APP_LANGUAGES.find((l) => l.code === 'en')).toMatchObject({ ios: 'en', android: '' });
  });

  it('the language switch of the shop pages lists the languages that are on', () => {
    const switcher = readFileSync(join(root, 'packages/ui/src/components/layout/LanguageSwitcher.tsx'), 'utf8');
    expect(switcher).toContain('enabledAppLanguages()');
    expect(switcher).not.toMatch(/const basicLanguages[^=]*=\s*\[\s*\{ code: 'vi'/);
  });
});

describe.each(enabledAppLanguages().filter((l) => l.code !== 'vi').map((l) => [l.code, l] as const))(
  'web strings complete: %s (#1554)',
  (_code, lang) => {
    const files = readdirSync(join(root, 'locales/vi')).filter((f) => f.endsWith('.json') && !MOBILE_ONLY_FILES.includes(f));
    it.each(files)('%s', (file) => {
      const vi = flat(JSON.parse(readFileSync(join(root, 'locales/vi', file), 'utf8')));
      const path = join(root, 'locales', lang.web, file);
      const other = existsSync(path) ? flat(JSON.parse(readFileSync(path, 'utf8'))) : {};
      const missing = Object.keys(vi).filter((k) => !(k in other));
      expect(missing).toEqual([]);
      const vars = (s: unknown) => (typeof s === 'string' ? [...new Set(icuVars(s))].join() : '');
      // the same variables; English may add plural forms ({count, plural, …}) around them
      const badVars = Object.keys(vi).filter((k) => k in other && vars(vi[k]) !== vars(other[k]));
      expect(badVars).toEqual([]);
      const vietnamese = Object.keys(other).filter((k) => typeof other[k] === 'string' && leftoverVietnamese(other[k] as string));
      expect(vietnamese).toEqual([]);
    });
  }
);

function iosStrings(folder: string): Record<string, string> {
  const text = readFileSync(join(root, 'apps/mobile/POS ADBD', `${folder}.lproj`, 'Localizable.strings'), 'utf8');
  return Object.fromEntries([...text.matchAll(/^\s*"((?:[^"\\]|\\.)+)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/gm)].map((m) => [m[1], m[2]]));
}
function androidStrings(folder: string): Record<string, string> {
  const dir = folder ? `values-${folder}` : 'values';
  const text = readFileSync(join(root, 'apps/mobile-android/app/src/main/res', dir, 'strings.xml'), 'utf8');
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/<string name="([^"]+)"(?![^>]*translatable="false")[^>]*>([\s\S]*?)<\/string>/g)) out[m[1]] = m[2];
  for (const m of text.matchAll(/<plurals name="([^"]+)"[^>]*>([\s\S]*?)<\/plurals>/g)) out[`plurals:${m[1]}`] = m[2];
  return out;
}

describe.each(enabledAppLanguages().filter((l) => l.code !== 'vi').map((l) => [l.code, l] as const))(
  'app strings complete: %s (#1554)',
  (_code, lang) => {
    it('iOS Localizable.strings has every key, the same arguments and no Vietnamese', () => {
      const vi = iosStrings('vi-VN');
      const other = iosStrings(lang.ios);
      expect(Object.keys(vi).filter((k) => !(k in other))).toEqual([]);
      expect(Object.keys(vi).filter((k) => k in other && printfArgs(vi[k]).join() !== printfArgs(other[k]).join())).toEqual([]);
      expect(Object.keys(other).filter((k) => leftoverVietnamese(other[k]))).toEqual([]);
    });

    it('Android strings.xml has every string, the same arguments and no Vietnamese', () => {
      const vi = androidStrings('vi');
      const other = androidStrings(lang.android);
      expect(Object.keys(vi).filter((k) => !(k in other))).toEqual([]);
      expect(
        Object.keys(vi).filter(
          (k) => k in other && !ARGS_MAY_DIFFER.includes(k) && printfArgs(vi[k]).join() !== printfArgs(other[k]).join()
        )
      ).toEqual([]);
      expect(Object.keys(other).filter((k) => leftoverVietnamese(other[k]))).toEqual([]);
    });
  }
);
