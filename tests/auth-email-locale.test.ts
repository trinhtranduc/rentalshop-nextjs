/**
 * #1539 — the verification and password reset emails exist in every email.json language; 'en' picks English (the shop
 * language), and empty or unknown keeps the Vietnamese email sent before.
 */
import {
  generatePasswordResetEmail,
  generateVerificationEmail,
  passwordResetEmailSubject,
  verificationEmailSubject,
} from '../packages/utils/src/services/email';

const VERIFY = { name: 'Lan', email: 'lan@shop.com', verificationUrl: 'https://anyrent.shop/verify-email?token=t1' };
const RESET = { name: 'Lan', email: 'lan@shop.com', resetUrl: 'https://anyrent.shop/reset-password?token=t2' };

describe('verification email language (#1539)', () => {
  it('en: English subject and body, html lang en, link and name kept', () => {
    const html = generateVerificationEmail({ ...VERIFY, locale: 'en' });
    expect(verificationEmailSubject('en')).toBe('Verify your email - AnyRent');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Verify your email');
    expect(html).toContain('Hello <strong>Lan</strong>');
    expect(html).toContain(VERIFY.verificationUrl);
    expect(html).not.toContain('Xác thực email');
  });

  it.each([['vi'], [undefined], [''], ['fr']])('%s: the Vietnamese email as before', (locale) => {
    const html = generateVerificationEmail({ ...VERIFY, locale: locale as any });
    expect(verificationEmailSubject(locale as any)).toBe('Xác thực email của bạn - AnyRent');
    expect(html).toContain('<html lang="vi">');
    expect(html).toContain('Xác thực email của bạn');
    expect(html).toContain('Xin chào <strong>Lan</strong>');
    expect(html).toContain(VERIFY.verificationUrl);
  });
});

describe('password reset email language (#1539)', () => {
  it('en: English subject and body', () => {
    const html = generatePasswordResetEmail({ ...RESET, locale: 'en' });
    expect(passwordResetEmailSubject('en')).toBe('Reset your password - AnyRent');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Reset your password');
    expect(html).toContain(RESET.resetUrl);
    expect(html).not.toContain('Đặt lại mật khẩu');
  });

  it.each([['vi'], [undefined], ['de']])('%s: the Vietnamese email as before', (locale) => {
    const html = generatePasswordResetEmail({ ...RESET, locale: locale as any });
    expect(passwordResetEmailSubject(locale as any)).toBe('Đặt lại mật khẩu của bạn - AnyRent');
    expect(html).toContain('Đặt lại mật khẩu của bạn');
    expect(html).toContain(RESET.resetUrl);
  });
});

describe('the other email.json languages (#1539)', () => {
  it('ja / ko / zh have their own subject, not the Vietnamese one', () => {
    for (const locale of ['ja', 'ko', 'zh']) {
      expect(verificationEmailSubject(locale)).not.toBe('Xác thực email của bạn - AnyRent');
      expect(passwordResetEmailSubject(locale)).toMatch(/AnyRent$/);
      expect(generateVerificationEmail({ ...VERIFY, locale })).toContain(`<html lang="${locale}">`);
    }
  });
});
