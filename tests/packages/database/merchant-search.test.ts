/**
 * #817: the admin Merchants page finds a shop by its name, phone and email, and by the owner's
 * name, email and phone (users with role MERCHANT).
 */
import { buildMerchantSearchConditions } from '../../../packages/database/src/merchant-search';

const flat = (conds: any[]) => JSON.stringify(conds);
const ownerOr = (conds: any[]) => conds.find((c) => c.users)?.users.some;

describe('buildMerchantSearchConditions (#817)', () => {
  it('keeps the old conditions: merchant name and email, case-insensitive', () => {
    const c = buildMerchantSearchConditions('Outdoor', 'Outdoor');
    expect(c).toContainEqual({ name: { contains: 'Outdoor', mode: 'insensitive' } });
    expect(c).toContainEqual({ email: { contains: 'Outdoor', mode: 'insensitive' } });
  });

  it('searches the merchant phone', () => {
    const c = buildMerchantSearchConditions('0901234567', '0901234567');
    expect(c).toContainEqual({ phone: { contains: '0901234567' } });
  });

  it('searches the owner: role MERCHANT, not deleted, by name, email and phone', () => {
    const owner = ownerOr(buildMerchantSearchConditions('lan', 'lan'));
    expect(owner.role).toBe('MERCHANT');
    expect(owner.deletedAt).toBeNull();
    expect(flat(owner.OR)).toContain('"firstName":{"contains":"lan","mode":"insensitive"}');
    expect(flat(owner.OR)).toContain('"lastName":{"contains":"lan","mode":"insensitive"}');
    expect(flat(owner.OR)).toContain('"email":{"contains":"lan","mode":"insensitive"}');
    expect(flat(owner.OR)).toContain('"phone":{"contains":"lan"}');
  });

  it('a phone typed with spaces, dots or dashes still matches (digits only)', () => {
    const c = buildMerchantSearchConditions('0901 234.567', '0901 234.567');
    expect(c).toContainEqual({ phone: { contains: '0901234567' } });
    expect(flat(ownerOr(c).OR)).toContain('"phone":{"contains":"0901234567"}');
  });

  it('a local number also matches the international form (+84 / 84) without the leading 0', () => {
    const c = buildMerchantSearchConditions('0901234567', '0901234567');
    expect(c).toContainEqual({ phone: { contains: '901234567' } });
    expect(flat(ownerOr(c).OR)).toContain('"phone":{"contains":"901234567"}');
  });

  it('a short digit string is not stripped of its 0 (too many false matches)', () => {
    const c = buildMerchantSearchConditions('090', '090');
    expect(c).not.toContainEqual({ phone: { contains: '90' } });
  });

  it('adds the accent-free name when it differs (merchant and owner)', () => {
    const c = buildMerchantSearchConditions('Nguyễn', 'Nguyen');
    expect(c).toContainEqual({ name: { contains: 'Nguyen', mode: 'insensitive' } });
    expect(flat(ownerOr(c).OR)).toContain('"firstName":{"contains":"Nguyen","mode":"insensitive"}');
  });

  it('does not repeat a condition', () => {
    const c = buildMerchantSearchConditions('abc', 'abc');
    expect(new Set(c.map((x) => JSON.stringify(x))).size).toBe(c.length);
  });
});
