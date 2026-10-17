import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = fs.readFileSync(path.join(__dirname, '../apps/client/app/components/public-content/PublicShell.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const componentModule = { exports: {} as { PublicShell?: React.ComponentType<{ locale: 'en'; kind: 'list'; children: React.ReactNode }> } };
const cssModules = new Proxy({}, { get: (_target, key) => String(key) });
const LandingBrandLogo = () => React.createElement('div', { 'data-testid': 'landing-brand-logo' }, 'AnyRent');
const LanguageSwitcher = ({ publicLocale }: { publicLocale: string }) => React.createElement('div', {
  'data-testid': 'public-language-switcher',
  'data-locale': publicLocale,
});
const mockRequire = (id: string) => {
  if (id === 'next/link') return { __esModule: true, default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', { href, ...props }, children) };
  if (id === '../LandingBrandLogo') return { LandingBrandLogo };
  if (id === '@rentalshop/ui') return { LanguageSwitcher };
  if (id.endsWith('.module.css')) return { __esModule: true, default: cssModules };
  if (id.includes('public-content/messages')) return require('../apps/client/lib/public-content/messages');
  return require(id);
};
new Function('require', 'module', 'exports', compiled)(mockRequire, componentModule, componentModule.exports);
const PublicShell = componentModule.exports.PublicShell!;

it('renders the landing brandmark and public locale selector in the localized post shell', () => {
  const html = renderToStaticMarkup(React.createElement(PublicShell, {
    locale: 'en',
    kind: 'list',
    children: React.createElement('main', null, 'Article list'),
  }));

  expect(html).toContain('data-testid="landing-brand-logo"');
  expect(html).toContain('data-testid="public-language-switcher"');
  expect(html).toContain('data-locale="en"');
  expect(html).not.toContain('/anyrent-logo-dark.svg');
});
