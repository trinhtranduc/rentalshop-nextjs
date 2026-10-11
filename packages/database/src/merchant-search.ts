/**
 * Conditions of the admin Merchants search (#817): the shop's name, email and phone, and the owner's
 * name, email and phone (users with role MERCHANT). Pure, so it can be tested without a database.
 */

/** Variants of a typed phone number: digits only, and without the leading 0 for a local number. Empty when it is not a number. */
function phoneVariants(term: string): string[] {
  const digits = term.replace(/[\s.\-()]/g, '');
  if (!/^\+?\d{3,}$/.test(digits)) return [];
  const variants = [digits];
  // A local number (0901...) also appears as +84901... or 84901...
  if (/^0\d{5,}$/.test(digits)) variants.push(digits.slice(1));
  return variants;
}

export function buildMerchantSearchConditions(term: string, normalized: string, phoneMatchedIds: number[] = []): any[] {
  const insensitive = (value: string) => ({ contains: value, mode: 'insensitive' as const });
  const names = [...new Set([term, normalized])];
  const phones = [...new Set([term, ...phoneVariants(term)])];

  const merchant: any[] = [
    ...names.map((n) => ({ name: insensitive(n) })),
    { email: insensitive(term) },
    ...phones.map((p) => ({ phone: { contains: p } })),
  ];

  const owner: any[] = [
    ...names.flatMap((n) => [{ firstName: insensitive(n) }, { lastName: insensitive(n) }]),
    { email: insensitive(term) },
    ...phones.map((p) => ({ phone: { contains: p } })),
  ];

  const byPhoneDigits = phoneMatchedIds.length > 0 ? [{ id: { in: phoneMatchedIds } }] : [];
  return [...merchant, { users: { some: { role: 'MERCHANT', deletedAt: null, OR: owner } } }, ...byPhoneDigits];
}

/** Digits of a typed phone search for the stored-number lookup; `null` below 5 digits (too many false matches). */
export function phoneDigitsForLookup(term: string): string | null {
  const digits = term.replace(/\D/g, '');
  return /^[\d\s.\-()+]+$/.test(term.trim()) && digits.length >= 5 ? digits : null;
}
