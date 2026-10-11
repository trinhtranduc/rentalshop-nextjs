/**
 * #824 / #736: on the shop web outlets page
 * - "Thêm chi nhánh" (button and dialog) only for the shop owner (MERCHANT), still behind NEXT_PUBLIC_ENABLE_ADD_OUTLET;
 * - disable / re-enable only for the owner (OUTLET_ADMIN keeps "Sửa" for its own outlet);
 * - "Sửa" in the detail dialog follows the same permission as the row "Sửa" button.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { isOutletOwnerRole, outletActions } from '../apps/client/app/outlets/outlets-model';

describe('isOutletOwnerRole', () => {
  it('only the shop owner and the platform admin', () => {
    expect(isOutletOwnerRole('MERCHANT')).toBe(true);
    expect(isOutletOwnerRole('ADMIN')).toBe(true);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'OPS', undefined, null, '']) {
      expect(isOutletOwnerRole(role as any)).toBe(false);
    }
  });
});

describe('outletActions for OUTLET_ADMIN (edit, no status change)', () => {
  it('edits but cannot disable or enable', () => {
    expect(outletActions({ isDefault: false, isActive: true }, true, false)).toEqual(['view', 'edit', 'bank']);
    expect(outletActions({ isDefault: false, isActive: false }, true, false)).toEqual(['view', 'edit', 'bank']);
  });
  it('the owner keeps disable / enable', () => {
    expect(outletActions({ isDefault: false, isActive: true }, true, true)).toContain('disable');
    expect(outletActions({ isDefault: false, isActive: false }, true, true)).toContain('enable');
  });
});

describe('the outlets page (#736)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../apps/client/app/outlets/page.tsx'), 'utf8');

  it('the add entry needs the flag AND the owner role', () => {
    expect(source).toMatch(/const canAdd = isAddOutletEnabled\(\) && isOwner;/);
    expect(source).toMatch(/const isOwner = isOutletOwnerRole\(user\?\.role\);/);
  });

  it('row actions pass the edit permission and the owner flag', () => {
    expect(source).toContain('outletActions(row, canManageOutlets, isOwner)');
  });

  it('the detail dialog "Sửa" is shown only with the edit permission', () => {
    const footer = source.slice(source.indexOf('footer={'), source.indexOf('{view && ('));
    expect(footer).toMatch(/\{canManageOutlets && \(\s*<button type="button" onClick=\{\(\) => setDialog\(\{ kind: 'edit', row: view \}\)\}/);
  });
});
