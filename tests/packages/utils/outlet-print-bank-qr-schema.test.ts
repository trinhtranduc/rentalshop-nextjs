/**
 * #628 — outlets carry `printBankQr` (bank block + VietQR on bills). Optional: old callers never send it.
 */
import { outletCreateSchema, outletUpdateSchema } from '../../../packages/utils/src/core/validation-schemas';

describe('outlet printBankQr validation (#628)', () => {
  it('accepts true and false on update', () => {
    const on = outletUpdateSchema.safeParse({ printBankQr: true });
    const off = outletUpdateSchema.safeParse({ printBankQr: false });
    expect(on.success && on.data.printBankQr).toBe(true);
    expect(off.success && off.data.printBankQr).toBe(false);
  });

  it('leaves printBankQr out when an old caller does not send it', () => {
    const parsed = outletUpdateSchema.safeParse({ name: 'Shop', printNote: 'Mang CCCD' });
    expect(parsed.success && 'printBankQr' in parsed.data).toBe(false);
  });

  it('rejects a non-boolean', () => {
    expect(outletUpdateSchema.safeParse({ printBankQr: 'yes' }).success).toBe(false);
    expect(outletUpdateSchema.safeParse({ printBankQr: 1 }).success).toBe(false);
  });

  it('accepts printBankQr on create', () => {
    const parsed = outletCreateSchema.safeParse({ name: 'Shop', printBankQr: true });
    expect(parsed.success && parsed.data.printBankQr).toBe(true);
  });
});
