/**
 * Subdomain utilities for multi-tenant routing
 */

/**
 * Reserved subdomains that cannot be used
 */
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp', 'client', 'www2', 'test', 'demo', 'staging'];

/**
 * Convert Vietnamese characters with diacritics to ASCII without diacritics
 * á, à, ả, ã, ạ, ă, ằ, ắ, ẳ, ẵ, ặ, â, ầ, ấ, ẩ, ẫ, ậ → a
 * đ → d
 * é, è, ẻ, ẽ, ẹ, ê, ề, ế, ể, ễ, ệ → e
 * í, ì, ỉ, ĩ, ị → i
 * ó, ò, ỏ, õ, ọ, ô, ồ, ố, ổ, ỗ, ộ, ơ, ờ, ớ, ở, ỡ, ợ → o
 * ú, ù, ủ, ũ, ụ, ư, ừ, ứ, ử, ữ, ự → u
 * ý, ỳ, ỷ, ỹ, ỵ → y
 */
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Sanitize subdomain from business name or user input
 * Converts Vietnamese characters to ASCII and removes spaces/special chars
 * Example: "Áo dài Phạm" → "aodaipham"
 */
export function sanitizeSubdomain(input: string): string {
  if (!input) return '';
  
  // Step 1: Remove Vietnamese diacritics
  let sanitized = removeVietnameseDiacritics(input);
  
  // Step 2: Convert to lowercase and trim
  sanitized = sanitized.toLowerCase().trim();
  
  // Step 3: Replace spaces and special characters with nothing (not dash)
  // Only keep alphanumeric characters
  sanitized = sanitized.replace(/[^a-z0-9]/g, '');
  
  // Step 4: Limit length
  sanitized = sanitized.substring(0, 50);
  
  return sanitized;
}

/**
 * Validate subdomain format and reserved words
 */
export function validateSubdomain(subdomain: string): boolean {
  if (!subdomain || subdomain.length === 0) return false;
  
  // Check reserved words
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return false;
  }
  
  // Format validation: must start and end with alphanumeric, can contain dashes
  // Length: 1-50 characters
  // Pattern: ^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$
  const pattern = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
  
  return pattern.test(subdomain) && subdomain.length >= 1 && subdomain.length <= 50;
}

/**
 * Generate subdomain from business name
 */
export function generateSubdomain(businessName: string): string {
  return sanitizeSubdomain(businessName);
}

/**
 * Get root domain from environment
 */
export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
}

/**
 * Get protocol (http or https) from environment
 */
export function getProtocol(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https';
  }
  return 'http';
}

/**
 * Build tenant URL from subdomain
 */
export function buildTenantUrl(subdomain: string): string {
  const protocol = getProtocol();
  const rootDomain = getRootDomain();
  return `${protocol}://${subdomain}.${rootDomain}`;
}

/**
 * Extract subdomain from hostname
 * Edge Runtime compatible - no Node.js dependencies
 */
export function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null;
  
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Split by dots
  const parts = host.split('.');
  
  // For localhost subdomains: shop1.localhost
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0];
  }
  
  // For production: shop1.example.com
  // Assuming root domain has 2 parts (example.com)
  // Subdomain would be the first part
  if (parts.length > 2) {
    return parts[0];
  }
  
  // For exact match with root domain (no subdomain)
  const rootDomain = getRootDomain().split(':')[0];
  if (host === rootDomain || host === `www.${rootDomain}`) {
    return null;
  }
  
  return null;
}

/**
 * Check if subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}

/**
 * Get list of reserved subdomains
 */
export function getReservedSubdomains(): string[] {
  return [...RESERVED_SUBDOMAINS];
}
