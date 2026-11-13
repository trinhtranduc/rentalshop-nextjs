/**
 * #1554 (#1553 phase 1) — no new Vietnamese text written straight into code. Text a shop owner reads goes through
 * the language files (locales/*, Localizable.strings, strings.xml) so it can be translated.
 * Today's count per file is the ceiling (tests/fixtures/hardcoded-vi-baseline.json); the clean-up PRs lower it with
 *   node scripts/i18n/hardcoded-vi.js --write
 */
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scan = require('../scripts/i18n/hardcoded-vi.js') as {
  scanRepo: (root: string) => Record<string, number>;
  readBaseline: (root: string) => Record<string, number>;
  isAllowed: (file: string) => boolean;
  countLines: (text: string) => number;
};

const root = join(__dirname, '..');

describe('hard-coded Vietnamese text (#1554)', () => {
  it('counts string literals with Vietnamese letters, not comments', () => {
    const swift = ['let a = "Đơn hàng"', '// Ghi chú tiếng Việt', ' * mô tả', 'let b = "Order"', 'Text("Lưu")'].join('\n');
    expect(scan.countLines(swift)).toBe(2);
    expect(scan.countLines("const x = 'Tiền tệ'; // ok\nconst y = `Đã lưu ${n}`;\n<p>Không có</p>")).toBe(3);
    expect(scan.countLines('const a = "VND"; // Việt Nam')).toBe(0);
  });

  it('Vietnamese-only pages (SEO landing pages, terms, privacy) and test files are allowed', () => {
    expect(scan.isAllowed('apps/client/app/cho-thue-ao-dai/page.tsx')).toBe(true);
    expect(scan.isAllowed('apps/client/app/terms/page.tsx')).toBe(true);
    expect(scan.isAllowed('apps/client/app/privacy/page.tsx')).toBe(true);
    expect(scan.isAllowed('packages/ui/src/components/forms/OrderForm.tsx')).toBe(false);
    expect(scan.isAllowed('apps/mobile/POS ADBD/Viewcontrollers/Order/OrderDetailViewController.swift')).toBe(false);
  });

  it('no file has more hard-coded Vietnamese lines than its ceiling', () => {
    const now = scan.scanRepo(root);
    const ceiling = scan.readBaseline(root);
    const over = Object.entries(now)
      .filter(([file, n]) => n > (ceiling[file] ?? 0))
      .map(([file, n]) => `${file}: ${n} > ${ceiling[file] ?? 0}`);
    // Move the text into the language files (skill i18n-keys). After a clean-up, lower the ceiling with --write.
    expect(over).toEqual([]);
  });
});
