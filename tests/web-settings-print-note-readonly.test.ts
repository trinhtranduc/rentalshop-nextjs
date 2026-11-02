/**
 * #1332 Settings › In & phiếu: only the shop owner edits the print note and the bank QR.
 * Every other role reads the note of its branch, with the sentence the apps show ("Chỉ chủ shop sửa được ghi chú và QR").
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from '@jest/globals';
import { canEditPrintSettings } from '../apps/client/app/settings/settings-model';

const settingsDir = path.join(__dirname, '../apps/client/app/settings');
const source = fs.readFileSync(path.join(settingsDir, 'ReadOnlyPrintNotes.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const loaded = { exports: {} as { ReadOnlyPrintNotes?: React.ComponentType<any> } };
new Function('require', 'module', 'exports', compiled)(require, loaded, loaded.exports);
const render = (notes: Array<{ id: number; name: string; saved: string }>) =>
  renderToStaticMarkup(
    React.createElement(loaded.exports.ReadOnlyPrintNotes!, { notes, fieldLabel: 'Ghi chú in', empty: 'Chưa có ghi chú', explanation: 'Chỉ chủ shop sửa được.' }),
  );

describe('canEditPrintSettings (#1332)', () => {
  it('only the owner', () => {
    expect(canEditPrintSettings('MERCHANT')).toBe(true);
    expect(canEditPrintSettings('merchant')).toBe(true);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'ADMIN', 'OPS', '', null, undefined]) {
      expect(canEditPrintSettings(role)).toBe(false);
    }
  });
});

describe('ReceiptSection wiring (#1332)', () => {
  const sections = fs.readFileSync(path.join(settingsDir, 'sections.tsx'), 'utf8');
  const panel = fs.readFileSync(path.join(settingsDir, 'SettingsPanel.tsx'), 'utf8');

  it('the panel asks the owner rule, not "owner or manager"', () => {
    expect(panel).toContain('canEditNote={canEditPrintSettings(role)}');
    expect(panel).not.toContain("canEditNote={role === 'MERCHANT' || role === 'OUTLET_ADMIN'}");
  });

  it('the note block is not hidden from other roles; it switches to the read-only view', () => {
    expect(sections).not.toContain('{canEditNote && (');
    expect(sections).toContain('<ReadOnlyPrintNotes');
  });
});

describe('ReadOnlyPrintNotes (#1332)', () => {
  it('shows the saved note in a read-only box and the explanation, with no save button', () => {
    const html = render([{ id: 1, name: 'Chi nhánh 1', saved: 'Mang theo CCCD' }]);
    expect(html).toContain('Mang theo CCCD');
    expect(html).toMatch(/<textarea[^>]*readOnly/i);
    expect(html).toContain('Chỉ chủ shop sửa được.');
    expect(html).toContain('Ghi chú in');
    expect(html).not.toContain('<button');
  });

  it('names each branch when there are several, and an empty note shows the placeholder', () => {
    const html = render([
      { id: 1, name: 'Chi nhánh 1', saved: '' },
      { id: 2, name: 'Chi nhánh 2', saved: 'B' },
    ]);
    expect(html).toContain('Chi nhánh 1');
    expect(html).toContain('Chi nhánh 2');
    expect(html).toContain('placeholder="Chưa có ghi chú"');
  });
});

describe('locale text (#1332)', () => {
  const read = (l: string) => JSON.parse(fs.readFileSync(path.join(__dirname, `../locales/${l}/settings.json`), 'utf8')).web.printer;

  it.each(['en', 'vi', 'ja', 'ko', 'zh'])('%s has both strings', (l) => {
    expect(read(l).noteReadOnly).toBeTruthy();
    expect(read(l).noteEmpty).toBeTruthy();
    expect(read(l).bankQrReadOnly).toBeTruthy();
  });

  it('the Vietnamese sentence no longer names the branch manager', () => {
    expect(read('vi').bankQrReadOnly).not.toContain('quản lý chi nhánh');
    expect(read('en').bankQrReadOnly).not.toContain('manager');
  });
});
