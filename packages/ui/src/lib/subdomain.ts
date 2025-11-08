'use client';

/**
 * Convert Vietnamese characters with diacritics to ASCII without diacritics.
 * This mirrors the backend implementation so the generated subdomain preview
 * in the registration flow matches the API behaviour.
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Sanitize subdomain from business name or user input.
 * Converts Vietnamese characters to ASCII and removes spaces/special chars.
 */
export function sanitizeSubdomain(input: string): string {
  if (!input) return '';

  let sanitized = removeVietnameseDiacritics(input);
  sanitized = sanitized.toLowerCase().trim();
  sanitized = sanitized.replace(/[^a-z0-9]/g, '');
  sanitized = sanitized.substring(0, 50);

  return sanitized;
}

