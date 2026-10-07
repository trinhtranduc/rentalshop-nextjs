/**
 * Bank block of the bill (#628): the outlet's default bank account and its VietQR, printed when the outlet's
 * `printBankQr` is on. Pure (no `@rentalshop/*` import) so Jest loads it; the VietQR encoder is passed in
 * (`generateVietQRString` from `@rentalshop/utils`), so the payload is the one the bank-account pages use.
 */

export interface BillBankAccountInput {
  id?: number | null;
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

/** Same shape as `BankAccountInfo` of `@rentalshop/utils` (bank-qr.ts). */
export interface VietQrInfo {
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  bankCode?: string;
}

export type VietQrEncoder = (info: VietQrInfo) => string;

export interface BillBankBlock {
  bankName: string;
  accountNumber: string;
  holder: string;
  /** VietQR payload without amount; null when the encoder rejects the account (lines still print). */
  qr: string | null;
}

/** What the bill shows: nothing (switch off or still loading), a hint (on, no default account), or the block. */
export type BillBankState = { kind: 'off' } | { kind: 'noAccount' } | { kind: 'show'; block: BillBankBlock };

const text = (v: string | null | undefined) => (typeof v === 'string' ? v.trim() : '');

/** The default active account with a number; any other account is never printed. */
export function pickBillBankAccount(accounts: readonly BillBankAccountInput[] | null | undefined): BillBankAccountInput | null {
  if (!Array.isArray(accounts)) return null;
  return accounts.find((a) => a && a.isDefault === true && a.isActive !== false && text(a.accountNumber) !== '') ?? null;
}

/** VietQR string for an account, or null when the encoder throws (unknown bank, bad number…). */
export function billBankQr(account: BillBankAccountInput, encode: VietQrEncoder): string | null {
  const accountNumber = text(account.accountNumber);
  const accountHolderName = text(account.accountHolderName);
  if (!accountNumber || !accountHolderName) return null;
  try {
    const qr = encode({
      accountNumber,
      accountHolderName,
      bankName: text(account.bankName),
      bankCode: text(account.bankCode) || undefined,
    });
    return qr || null;
  } catch {
    return null;
  }
}

/**
 * `enabled` is the outlet's `printBankQr`; `accounts` the outlet's active accounts (null = not loaded or the
 * load failed, which shows nothing: the bill never shows an error for this).
 */
export function billBankState(
  enabled: boolean | null | undefined,
  accounts: readonly BillBankAccountInput[] | null | undefined,
  encode: VietQrEncoder,
): BillBankState {
  if (enabled !== true || accounts == null) return { kind: 'off' };
  const account = pickBillBankAccount(accounts);
  if (!account) return { kind: 'noAccount' };
  return {
    kind: 'show',
    block: {
      bankName: text(account.bankName),
      accountNumber: text(account.accountNumber),
      holder: text(account.accountHolderName),
      qr: billBankQr(account, encode),
    },
  };
}

/** QR side in mm on the slip: ~32 mm on 80 mm paper, ~28 mm on 58 mm. */
export function billQrSizeMm(width: 80 | 58): number {
  return width === 58 ? 28 : 32;
}
