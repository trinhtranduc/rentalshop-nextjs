/**
 * #804 (step 2 of #802): the admin shell follows the portal shell: white sidebar, top bar with search,
 * create button and dark-mode switch, a drawer on a phone, font Be Vietnam Pro. Only apps/admin changes.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const shell = (f: string) => read(`apps/admin/app/components/shell/${f}`);

describe('admin shell (#804)', () => {
  it('layout loads Be Vietnam Pro with next/font and the theme boot script before paint', () => {
    const layout = read('apps/admin/app/layout.tsx');
    expect(layout).toMatch(/Be_Vietnam_Pro/);
    expect(layout).toMatch(/--font-be-vietnam/);
    expect(layout).toMatch(/vietnamese/);
    expect(layout).toMatch(/themeBootScript/);
    expect(layout).toMatch(/shell\.css/);
  });

  it('theme module keeps the choice in localStorage and on html[data-ar-theme]', () => {
    const theme = shell('theme.ts');
    expect(theme).toMatch(/data-ar-theme/);
    expect(theme).toMatch(/localStorage/);
    expect(theme).toMatch(/prefers-color-scheme/);
    expect(shell('AdminThemeSwitch.tsx')).toMatch(/toggleTheme/);
  });

  it('AdminLayout uses the new shell, not the packages/ui AdminSidebar', () => {
    const layout = read('apps/admin/app/components/AdminLayout.tsx');
    expect(layout).toMatch(/AdminShell/);
    expect(layout).not.toMatch(/\bAdminSidebar\b/);
  });

  it('the shell has a sidebar, a top bar with search and create, and a drawer', () => {
    const s = shell('AdminShell.tsx');
    expect(s).toMatch(/ar-theme/);
    expect(s).toMatch(/role="dialog"/);
    expect(s).toMatch(/lg:hidden/);
    const top = shell('AdminTopBar.tsx');
    expect(top).toMatch(/role="search"/);
    expect(top).toMatch(/AdminThemeSwitch/);
    expect(top).toMatch(/create/i);
    expect(top).toMatch(/min-h-\[44px\]|h-11/);
    const side = shell('AdminSideNav.tsx');
    expect(side).toMatch(/bg-ar-primary-soft/);
    expect(side).toMatch(/bg-ar-surface/);
    expect(side).toMatch(/filterAdminMenuByRole/);
    expect(side).toMatch(/Logout|Sign out/);
  });

  it('keeps every menu item and route of the old AdminSidebar', () => {
    const old = read('packages/ui/src/components/layout/AdminSidebar.tsx');
    const nav = shell('nav.ts');
    const entries = [...old.matchAll(/label:\s*'([^']+)',\s*href:\s*'([^']+)'/g)];
    expect(entries.length).toBeGreaterThanOrEqual(20);
    for (const [, label, href] of entries) {
      expect(nav).toContain(`'${label}'`);
      expect(nav).toContain(`'${href}'`);
    }
  });

  it('shell.css (or globals) marks the Be Vietnam Pro font on .ar-theme and fixes touch targets', () => {
    const css = read('apps/admin/app/globals.css') + read('apps/admin/app/shell.css');
    expect(css).toMatch(/font-family:\s*var\(--font-be-vietnam\)/);
    expect(css).toMatch(/admin shell \(#804\)/);
  });
});
