import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

let currentPathname = '/en/post';
let selectedLocale = 'fr';
let navigation: { assign: jest.Mock; push: jest.Mock };
let LanguageSwitcher: React.ComponentType<Record<string, unknown>>;

const sourcePath = path.join(__dirname, '../packages/ui/src/components/layout/LanguageSwitcher.tsx');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function loadSwitcher() {
  const module = { exports: {} as { LanguageSwitcher?: React.ComponentType<Record<string, unknown>> } };
  navigation = { assign: jest.fn(), push: jest.fn() };
  const select = ({ onValueChange, children }: { onValueChange?: (value: string) => void; children?: React.ReactNode }) => {
    onValueChange?.(selectedLocale);
    return React.createElement('div', null, children);
  };
  const primitive = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children);
  const mockRequire = (id: string) => {
    if (id === 'next-intl') return { useLocale: () => 'en' };
    if (id === 'next/navigation') return {
      useRouter: () => ({ push: navigation.push, refresh: jest.fn() }),
      usePathname: () => currentPathname,
    };
    if (id === '@rentalshop/ui') return {
      Select: select,
      SelectContent: primitive,
      SelectItem: primitive,
      SelectTrigger: primitive,
      SelectValue: primitive,
    };
    if (id === 'lucide-react') return { Globe: primitive };
    return require(id);
  };
  new Function('require', 'module', 'exports', compiled)(mockRequire, module, module.exports);
  LanguageSwitcher = module.exports.LanguageSwitcher!;
}

function renderPublicSwitcher(props: Record<string, unknown> = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { assign: navigation.assign, search: '?campaign=spring' } },
  });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: '' } });
  try {
    renderToStaticMarkup(React.createElement(LanguageSwitcher, { publicLocale: 'en', ...props }));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete (globalThis as typeof globalThis & { window?: unknown }).window;
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete (globalThis as typeof globalThis & { document?: unknown }).document;
  }
}

beforeEach(() => {
  selectedLocale = 'fr';
  loadSwitcher();
});

it('keeps a post listing and its query when switching locale', () => {
  currentPathname = '/en/post';
  renderPublicSwitcher();

  expect(navigation.assign).toHaveBeenCalledWith('/fr/post?campaign=spring');
});

it('uses the published translated edition slug for an article', () => {
  currentPathname = '/en/post/anyrent-introduction';
  renderPublicSwitcher({ publicLocalePaths: { fr: '/fr/post/presentation-anyrent' } });

  expect(navigation.assign).toHaveBeenCalledWith('/fr/post/presentation-anyrent?campaign=spring');
});

it('keeps Vietnamese prefix-free when switching to the default locale', () => {
  currentPathname = '/en/post';
  selectedLocale = 'vi';
  renderPublicSwitcher();

  expect(navigation.assign).toHaveBeenCalledWith('/post?campaign=spring');
});
