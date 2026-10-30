/**
 * #1344 Settings › In & phiếu › "Hiện ghi chú đơn trên ảnh chia sẻ": the owner switches it on the web.
 * A missing key is unknown (load the profile), never OFF; only the owner changes it, the others see a dimmed row.
 */
import { describe, expect, it } from '@jest/globals';
import { canChangeShareOrderNote, shareOrderNoteFlag } from '../apps/client/app/settings/settings-model';

describe('shareOrderNoteFlag (#1344)', () => {
  it('no merchant or no flag is unknown, not OFF', () => {
    expect(shareOrderNoteFlag(null)).toBeNull();
    expect(shareOrderNoteFlag(undefined)).toBeNull();
    expect(shareOrderNoteFlag({ id: 12, name: 'Shop' })).toBeNull();
    expect(shareOrderNoteFlag({ shareOrderNote: 'true' })).toBeNull();
  });

  it('gives the stored value', () => {
    expect(shareOrderNoteFlag({ shareOrderNote: true })).toBe(true);
    expect(shareOrderNoteFlag({ shareOrderNote: false })).toBe(false);
  });
});

describe('canChangeShareOrderNote (#1344)', () => {
  it('only the owner', () => {
    expect(canChangeShareOrderNote('MERCHANT')).toBe(true);
    expect(canChangeShareOrderNote('merchant')).toBe(true);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'ADMIN', 'OPS', '', null, undefined]) {
      expect(canChangeShareOrderNote(role)).toBe(false);
    }
  });
});
