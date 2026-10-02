/**
 * #347 — RENT receipts print the outlet's note; SALE receipts never do.
 */
import { resolveReceiptPrintNote } from '../../../packages/ui/src/components/features/Orders/components/receipt-print-note';

describe('resolveReceiptPrintNote (#347)', () => {
  it('uses the note of the order outlet on a RENT receipt', () => {
    expect(
      resolveReceiptPrintNote({ orderType: 'RENT', outlet: { printNote: 'Mang CMND' } }, null)
    ).toBe('Mang CMND');
  });

  it('falls back to the outlet passed to the receipt (order just created)', () => {
    expect(resolveReceiptPrintNote({ orderType: 'RENT', outlet: undefined }, { printNote: 'Đổi trả 24h' })).toBe(
      'Đổi trả 24h'
    );
  });

  it('never prints on a SALE receipt', () => {
    expect(resolveReceiptPrintNote({ orderType: 'SALE', outlet: { printNote: 'Mang CMND' } }, null)).toBeNull();
  });

  it('prints nothing when the note is empty or blank', () => {
    expect(resolveReceiptPrintNote({ orderType: 'RENT', outlet: { printNote: '  ' } }, null)).toBeNull();
    expect(resolveReceiptPrintNote({ orderType: 'RENT', outlet: { printNote: null } }, { printNote: '' })).toBeNull();
  });

  it('treats a missing order type as RENT, like the receipt does', () => {
    expect(resolveReceiptPrintNote({ outlet: { printNote: 'Mang CMND' } }, null)).toBe('Mang CMND');
  });
});
