/**
 * #802 step 1: the admin web uses the approved blue style (tokens), only in apps/admin.
 */
import * as fs from 'fs';
import * as path from 'path';

const css = fs.readFileSync(path.resolve(__dirname, '../apps/admin/app/globals.css'), 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tok = (name: string) => root.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

describe('admin theme tokens (#802)', () => {
  it('the brand and action colour is the approved blue, not the old green', () => {
    expect(tok('--brand-primary')?.toLowerCase()).toBe('#1d4ed8');
    expect(tok('--action-primary')?.toLowerCase()).toBe('#1d4ed8');
    expect(root).not.toMatch(/#4CAF50/i);
  });

  it('shadcn primary and ring are the same blue (224 76% 48%)', () => {
    expect(tok('--primary')).toBe('224 76% 48%');
    expect(tok('--ring')).toBe('224 76% 48%');
  });

  it('radius is 10px and borders use the soft blue-grey', () => {
    expect(tok('--radius')).toBe('0.625rem');
    expect(tok('--border')).toBe('214 28% 89%');
    expect(tok('--input')).toBe('214 28% 89%');
  });

  it('the page background is #f3f5f8 and the dialog background stays white', () => {
    expect(tok('--background-primary')?.toLowerCase()).toBe('#f3f5f8');
    expect(tok('--background')).toBe('0 0% 100%');
  });

  it('text colours follow the style', () => {
    expect(tok('--text-primary')?.toLowerCase()).toBe('#17212e');
    expect(tok('--text-secondary')?.toLowerCase()).toBe('#5d6b7d');
  });
});
