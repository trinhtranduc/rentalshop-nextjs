/**
 * Generate a URL-safe tenant key from a merchant / shop name.
 *
 * Examples:
 *  - "Áo dài Phạm 1" -> "aodaipham1"
 *  - "My Shop!"      -> "myshop"
 */
export function generateTenantKeyFromName(name: string): string {
  if (!name) return '';

  // Normalize unicode, remove accents
  let key = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Special-case Vietnamese đ
  key = key.replace(/đ/g, 'd');

  // Remove protocol and known domain suffixes if user pasted a URL
  key = key
    .replace(/^https?:\/\//, '')
    .replace(/\.anyrent\.shop.*/g, '');

  // Keep only [a-z0-9]
  key = key.replace(/[^a-z0-9]/g, '');

  // Limit length to avoid overly long subdomains
  if (key.length > 50) {
    key = key.slice(0, 50);
  }

  return key;
}


