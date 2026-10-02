/**
 * #347 — outlets carry a merchant-written print note (≤ 500 chars, empty clears it).
 */
import { outletCreateSchema, outletUpdateSchema } from '../../../packages/utils/src/core/validation-schemas';

describe('outlet printNote validation (#347)', () => {
  it('accepts a multi-line note up to 500 characters on update', () => {
    const note = '*** Vui lòng mang theo CMND/BLX khi lấy đồ\nĐổi trả trong 24h';
    const parsed = outletUpdateSchema.safeParse({ printNote: note });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.printNote).toBe(note);
    expect(outletUpdateSchema.safeParse({ printNote: 'a'.repeat(500) }).success).toBe(true);
  });

  it('rejects a note longer than 500 characters', () => {
    expect(outletUpdateSchema.safeParse({ printNote: 'a'.repeat(501) }).success).toBe(false);
    expect(outletCreateSchema.safeParse({ name: 'Shop', printNote: 'a'.repeat(501) }).success).toBe(false);
  });

  it('stores an empty or blank note as null so it can be cleared', () => {
    const empty = outletUpdateSchema.safeParse({ printNote: '' });
    const blank = outletUpdateSchema.safeParse({ printNote: '   ' });
    expect(empty.success && empty.data.printNote).toBeNull();
    expect(blank.success && blank.data.printNote).toBeNull();
  });

  it('leaves printNote out when the field is not sent', () => {
    const parsed = outletUpdateSchema.safeParse({ name: 'Shop' });
    expect(parsed.success && 'printNote' in parsed.data).toBe(false);
  });

  it('accepts printNote on create', () => {
    const parsed = outletCreateSchema.safeParse({ name: 'Shop', printNote: 'Mang CMND' });
    expect(parsed.success && parsed.data.printNote).toBe('Mang CMND');
  });
});
