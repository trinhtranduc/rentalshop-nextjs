/**
 * Collateral types. iOS, Android and the API store codes (CASH, ID_CARD, CREDIT_CARD, DOCUMENT);
 * the web used to offer "ID Card / Driver License / Passport / Other", so editing showed an empty
 * select and saving could overwrite the code. Web now uses the codes; old web values still display.
 */
export const COLLATERAL_CODES = ['ID_CARD', 'DOCUMENT', 'CASH', 'CREDIT_CARD'] as const;

const LEGACY: Record<string, string> = {
  'id card': 'ID_CARD',
  'driver license': 'DRIVER_LICENSE',
  passport: 'PASSPORT',
  other: 'OTHER',
};

/** Translation key suffix for a stored collateral type, or null when unknown. */
export function collateralKey(value?: string | null): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if ((COLLATERAL_CODES as readonly string[]).includes(upper)) return upper;
  return LEGACY[value.trim().toLowerCase()] ?? null;
}
