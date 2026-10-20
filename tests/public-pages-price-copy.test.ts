// #1120: pricing copy said "from 79,000 VND" while production Basic is 99,000đ. Owner (2026-10-20): Vietnamese keeps
// "từ 99.000đ/tháng"; the other locales carry no amount until USD prices exist (Lemon Squeezy).
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', 'locales');
const locales = fs.readdirSync(root).filter((l) => fs.existsSync(path.join(root, l, 'publicPages.json')));
const strings = (o: unknown): string[] => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : []);

describe('pricing copy amounts (#1120)', () => {
  it.each(locales.filter((l) => l !== 'vi'))('%s pricing texts carry no VND amount', (l) => {
    const d = JSON.parse(fs.readFileSync(path.join(root, l, 'publicPages.json'), 'utf8'));
    const amounts = strings(d).filter((s) => /\d{2,3}[ ., ]000/.test(s));
    expect(amounts).toEqual([]);
  });
  it('vi says from 99.000đ/tháng', () => {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'vi', 'publicPages.json'), 'utf8'));
    expect(strings(d).filter((s) => /\d{2,3}\.000đ/.test(s)).every((s) => s.includes('99.000đ'))).toBe(true);
  });
});
