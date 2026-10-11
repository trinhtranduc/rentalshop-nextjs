/**
 * #802 step 1: the admin web follows the style of the shop portal (apps/client): the same blue,
 * the same --ar-* tokens and Tailwind `ar-*` colours. Only apps/admin changes.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const adminCss = read('apps/admin/app/globals.css');
const clientCss = read('apps/client/app/globals.css');
const rootOf = (css: string) => css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tok = (css: string, name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
const arBlock = (css: string, selector: string) => {
  const start = css.indexOf(selector);
  return css.slice(start, css.indexOf('}', start));
};
const arTokens = (block: string) => [...block.matchAll(/(--ar-[a-z0-9-]+):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()}`);

describe('admin follows the portal style (#802)', () => {
  const adminRoot = rootOf(adminCss);

  it('the brand and action colour is the portal blue, not the old green', () => {
    expect(tok(adminRoot, '--brand-primary')?.toLowerCase()).toBe('#1d4ed8');
    expect(tok(adminRoot, '--action-primary')?.toLowerCase()).toBe('#1d4ed8');
    expect(adminRoot).not.toMatch(/#4CAF50/i);
  });

  it('shadcn primary and ring are that blue (224 76% 48% = 29 78 216)', () => {
    expect(tok(adminRoot, '--primary')).toBe('224 76% 48%');
    expect(tok(adminRoot, '--ring')).toBe('224 76% 48%');
  });

  it('text and page colours are the portal ink, muted and page values', () => {
    expect(tok(adminRoot, '--text-primary')?.toLowerCase()).toBe('#0f172a');
    expect(tok(adminRoot, '--text-secondary')?.toLowerCase()).toBe('#475569');
    expect(tok(adminRoot, '--background-primary')?.toLowerCase()).toBe('#f3f4f6');
    expect(tok(adminRoot, '--background')).toBe('0 0% 100%'); // dialogs use bg-background
  });

  it('the light --ar-* tokens are identical to the portal ones', () => {
    const client = arTokens(arBlock(clientCss, ':root {\n  --ar-page'));
    expect(client.length).toBeGreaterThan(30);
    expect(arTokens(arBlock(adminCss, ':root {\n  --ar-page'))).toEqual(client);
  });

  it('the dark --ar-* tokens are identical to the portal ones', () => {
    const sel = "html[data-ar-theme='dark'] .ar-theme {";
    expect(arTokens(arBlock(adminCss, sel))).toEqual(arTokens(arBlock(clientCss, sel)));
  });

  it('the admin Tailwind config maps the same ar-* colours as the portal', () => {
    const colours = (file: string) => [...read(file).matchAll(/'?([a-z0-9-]+)'?: ar\('([a-z0-9-]+)'\)/g)].map((m) => `${m[1]}=${m[2]}`);
    expect(colours('apps/admin/tailwind.config.js')).toEqual(colours('apps/client/tailwind.config.js'));
    expect(colours('apps/admin/tailwind.config.js').length).toBeGreaterThan(30);
  });
});
