/**
 * #745: "Thêm chi nhánh" is hidden on the shop web by default; NEXT_PUBLIC_ENABLE_ADD_OUTLET=true brings it back.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { isAddOutletEnabledFor } from '../apps/client/lib/outlets';

describe('isAddOutletEnabledFor (#745)', () => {
  it('is off without the flag or with any other value', () => {
    for (const flag of [undefined, '', 'false', '0', 'no', 'yes', '1']) expect(isAddOutletEnabledFor(flag)).toBe(false);
  });

  it('is on only for "true" (any case, spaces ignored)', () => {
    for (const flag of ['true', 'TRUE', ' True ']) expect(isAddOutletEnabledFor(flag)).toBe(true);
  });
});

describe('the outlets page (#745)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../apps/client/app/outlets/page.tsx'), 'utf8');

  it('shows the add button and the add dialog only through the flag', () => {
    expect(source).toContain("import { isAddOutletEnabled } from '../../lib/outlets'");
    expect(source).toContain('const canAdd = isAddOutletEnabled()');
    // both entries are wrapped, nothing opens the add dialog without it
    expect(source).toMatch(/\{canAdd && \(\s*<button type="button" onClick=\{\(\) => setDialog\(\{ kind: 'add' \}\)\}/);
    expect(source).toMatch(/\{canAdd && \(\s*<OutletFormDialog\s+open=\{dialog\?\.kind === 'add'\}/);
    expect(source.match(/setDialog\(\{ kind: 'add' \}\)/g)).toHaveLength(1);
  });
});
