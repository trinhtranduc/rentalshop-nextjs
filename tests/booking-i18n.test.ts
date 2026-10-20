// #1124 PR6: the public shop page (products.public: catalog, booking sheet, request form, tracking page) and the
// shop's online-booking screens (orders.web.online, settings.web.onlineBooking) had vi + en only; ja / ko / zh fell
// back to English. Each of these subtrees must be translated for ja, ko and zh and merged over English in i18n.ts.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const at = (o: any, dotted: string) => dotted.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const flat = (o: any, p = ''): Record<string, string> =>
  Object.entries(o ?? {}).reduce((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    return typeof v === 'object' && v !== null ? { ...acc, ...flat(v, key) } : { ...acc, [key]: String(v) };
  }, {} as Record<string, string>);
// ICU argument names: {count}, {name}, {count, plural, ...}
const args = (s: string) => [...s.matchAll(/\{(\w+)(?=[,}])/g)].map((m) => m[1]).sort().join(',');
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

const SUBTREES: [string, string][] = [
  ['products', 'public'],
  ['orders', 'web.online'],
  ['settings', 'web.onlineBooking'],
];

describe.each(['ja', 'ko', 'zh'])('%s booking / public shop strings (#1124)', (locale) => {
  it.each(SUBTREES)('%s.%s is fully translated', (ns, subtree) => {
    const vi = flat(at(read(`locales/vi/${ns}.json`), subtree));
    const en = flat(at(read(`locales/en/${ns}.json`), subtree));
    const file = `locales/${locale}/${ns}.json`;
    expect(fs.existsSync(path.join(root, file))).toBe(true);
    const tr = flat(at(read(file), subtree));
    const problems: string[] = [];
    for (const key of Object.keys(vi)) {
      const v = tr[key];
      if (!v || !v.trim()) { problems.push(`${key}: missing`); continue; }
      if (args(v) !== args(en[key])) problems.push(`${key}: arguments ${args(v)} != ${args(en[key])}`);
      if (VI.test(v)) problems.push(`${key}: Vietnamese left`);
      if (v === en[key] && !/^[\d\s/{}#,.:-]*$/.test(v)) problems.push(`${key}: same as English`);
    }
    expect(problems).toEqual([]);
  });

  it('i18n.ts merges the translated files over English', () => {
    const src = fs.readFileSync(path.join(root, 'apps/client/i18n.ts'), 'utf8');
    for (const [ns] of SUBTREES) expect(src).toContain(`../../locales/${locale}/${ns}.json`);
  });
});
