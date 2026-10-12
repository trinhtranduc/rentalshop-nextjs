/**
 * #924 admin merchant detail, Module card: status pills read "Đang bật", "Đang tắt", "Hết hạn", "Chưa có".
 * `.ar-pill` capitalises every word (#806, for enum pills); the module pills opt out with `ar-pill-plain`.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const card = read('apps/admin/app/merchants/[id]/MerchantModulesCard.tsx');
const css = read('apps/admin/app/details.css');

describe('admin Module card pills keep sentence case (#924)', () => {
  it('ar-pill-plain turns the global capitalise off (higher specificity)', () => {
    const plain = css.search(/\.ar-pill\.ar-pill-plain\s*\{[^}]*text-transform:\s*none/);
    const capitalise = css.search(/\.ar-pill\s*\{\s*text-transform:\s*capitalize/);
    expect(plain).toBeGreaterThan(-1);
    expect(capitalise).toBeGreaterThan(-1);
  });

  it('every pill of the card uses ar-pill-plain and the labels are sentence case', () => {
    const pills = card.match(/className=\{?[`"][^`"]*ar-pill[^`"]*[`"]/g) || [];
    expect(pills.length).toBeGreaterThanOrEqual(2);
    for (const p of pills) expect(p).toContain('ar-pill-plain');
    for (const label of ['Đang bật', 'Đang tắt', 'Hết hạn', 'Chưa có']) expect(card).toContain(label);
  });
});
