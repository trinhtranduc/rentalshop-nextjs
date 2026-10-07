/**
 * #628 — bank block on the web bill: the outlet's default active account and its VietQR (no amount),
 * only when the outlet's `printBankQr` is on. Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh (no day logic,
 * but the bill suite runs in both).
 */
import { describe, expect, it } from '@jest/globals';
import {
  billBankQr,
  billBankState,
  billQrSizeMm,
  pickBillBankAccount,
  type BillBankAccountInput,
} from '../apps/client/app/orders/receipt/bank-qr-model';
import { generateVietQRString } from '../packages/utils/src/core/bank-qr';

const VCB: BillBankAccountInput = {
  id: 1,
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '0123456789',
  accountHolderName: 'NGUYEN VAN A',
  isDefault: true,
  isActive: true,
};
const ACB: BillBankAccountInput = { id: 2, bankName: 'ACB', accountNumber: '9876543210', accountHolderName: 'NGUYEN VAN A', isDefault: false, isActive: true };
const BIDV: BillBankAccountInput = { id: 3, bankName: 'BIDV', accountNumber: '11112222', accountHolderName: 'TRAN B', isDefault: false, isActive: true };

describe('pickBillBankAccount (#628)', () => {
  it('takes the default active account wherever it sits in the list', () => {
    expect(pickBillBankAccount([ACB, VCB, BIDV])).toBe(VCB);
  });

  it('prints no account when none is default (never falls back to the first one)', () => {
    expect(pickBillBankAccount([ACB, BIDV])).toBeNull();
    expect(pickBillBankAccount([])).toBeNull();
    expect(pickBillBankAccount(null)).toBeNull();
  });

  it('skips an inactive default and one without a number', () => {
    expect(pickBillBankAccount([{ ...VCB, isActive: false }, ACB])).toBeNull();
    expect(pickBillBankAccount([{ ...VCB, accountNumber: '  ' }])).toBeNull();
  });
});

describe('billBankQr (#628)', () => {
  it('equals generateVietQRString for the same account (static QR, no amount)', () => {
    const qr = billBankQr(VCB, generateVietQRString);
    expect(qr).toBe(
      generateVietQRString({ bankName: 'Vietcombank', bankCode: 'VCB', accountNumber: '0123456789', accountHolderName: 'NGUYEN VAN A' }),
    );
    expect(qr!.startsWith('000201010211')).toBe(true); // static
    expect(qr).toContain('970436'); // Vietcombank BIN
    expect(qr).toContain('0123456789');
    expect(qr).not.toMatch(/54\d{2}\d+5802VN/); // no amount tag before the country code
    expect(qr).toMatch(/6304[0-9A-F]{4}$/); // CRC
  });

  it('trims the fields it passes to the encoder', () => {
    expect(billBankQr({ ...ACB, accountNumber: ' 9876543210 ', bankName: ' ACB ' }, generateVietQRString)).toBe(billBankQr(ACB, generateVietQRString));
  });

  it('is null when the encoder rejects the account (unknown bank, short number) or a field is missing', () => {
    expect(billBankQr({ ...VCB, bankName: 'Ngân hàng lạ', bankCode: null }, generateVietQRString)).toBeNull();
    expect(billBankQr({ ...VCB, accountNumber: '123' }, generateVietQRString)).toBeNull();
    expect(billBankQr({ ...VCB, accountHolderName: '' }, generateVietQRString)).toBeNull();
  });
});

describe('billBankState (#628)', () => {
  it('is off when the outlet switch is off, whatever the accounts', () => {
    expect(billBankState(false, [VCB], generateVietQRString)).toEqual({ kind: 'off' });
    expect(billBankState(undefined, [VCB], generateVietQRString)).toEqual({ kind: 'off' });
  });

  it('is off while the accounts are not loaded or failed to load (no error on the bill)', () => {
    expect(billBankState(true, null, generateVietQRString)).toEqual({ kind: 'off' });
  });

  it('asks for an account when on and the outlet has no default account', () => {
    expect(billBankState(true, [], generateVietQRString)).toEqual({ kind: 'noAccount' });
    expect(billBankState(true, [ACB], generateVietQRString)).toEqual({ kind: 'noAccount' });
  });

  it('shows bank, number, holder and the QR when on', () => {
    expect(billBankState(true, [ACB, VCB], generateVietQRString)).toEqual({
      kind: 'show',
      block: { bankName: 'Vietcombank', accountNumber: '0123456789', holder: 'NGUYEN VAN A', qr: generateVietQRString(VCB as never) },
    });
  });

  it('keeps the text lines when the QR cannot be built', () => {
    const s = billBankState(true, [{ ...VCB, bankName: 'Ngân hàng lạ', bankCode: null }], generateVietQRString);
    expect(s.kind === 'show' && s.block.qr).toBeNull();
    expect(s.kind === 'show' && s.block.accountNumber).toBe('0123456789');
  });
});

describe('billQrSizeMm (#628)', () => {
  it('is 32 mm on 80 mm paper and 28 mm on 58 mm', () => {
    expect(billQrSizeMm(80)).toBe(32);
    expect(billQrSizeMm(58)).toBe(28);
  });
});
