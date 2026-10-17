import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Compile the actual TSX server component, independent of Jest's preserved JSX setting.
const source = fs.readFileSync(path.join(__dirname, '../apps/client/lib/public-content/RichPostBody.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const componentModule = { exports: {} as { RichPostBody?: React.ComponentType<{ content: string }> } };
new Function('require', 'module', 'exports', compiled)(require, componentModule, componentModule.exports);
const Body = componentModule.exports.RichPostBody!;
const render = (doc: unknown) => renderToStaticMarkup(React.createElement(Body, { content: JSON.stringify(doc) }));

it('renders article copy and allowed images on the server for crawlers', () => {
  const html = render({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Rental workflow' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Reserve → pick up → return', marks: [{ type: 'bold' }] }] },
    { type: 'image', attrs: { src: 'https://cdn.example.com/workflow.png', alt: 'Workflow' } },
  ] });
  expect(html).toContain('<h2>Rental workflow</h2>');
  expect(html).toContain('<strong>Reserve → pick up → return</strong>');
  expect(html).toContain('src="https://cdn.example.com/workflow.png"');
});
it('escapes HTML text and rejects javascript and embedded data image URLs', () => {
  const html = render({ type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] },
    { type: 'image', attrs: { src: 'data:image/svg+xml,<svg onload="alert(1)"/>' } },
  ] });
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toMatch(/<script|javascript:|data:image|<img/);
});
it('handles null documents without crashing a public article', () => {
  expect(render(null)).toBe('');
});
