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
  // Reserve 3 characters for random suffix if needed
  if (key.length > 47) {
    key = key.slice(0, 47);
  }

  return key;
}

/**
 * Generate random numeric string (3 digits)
 * Used as suffix for tenant keys when duplicate is found
 */
function generateRandomSuffix(): string {
  // Generate 3 random digits (000-999)
  return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

/**
 * Generate a unique tenant key from a merchant / shop name.
 * If the generated key already exists, appends a random 3-character suffix.
 * 
 * @param name - Merchant/shop name
 * @param checkExists - Async function to check if tenant key exists in database
 * @param maxAttempts - Maximum attempts to generate unique key (default: 10)
 * @returns Promise<string> - Unique tenant key
 * 
 * Examples:
 *  - "Áo dài Phạm" -> "aodaipham" (if not exists)
 *  - "Áo dài Phạm" -> "aodaipham123" (if "aodaipham" exists, adds random 3-digit suffix)
 */
export async function generateUniqueTenantKey(
  name: string,
  checkExists: (key: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  if (!name) {
    throw new Error('Name is required to generate tenant key');
  }

  // Generate base tenant key from name
  const baseKey = generateTenantKeyFromName(name);
  
  if (!baseKey) {
    throw new Error('Unable to generate tenant key from name');
  }

  // Check if base key is available
  const exists = await checkExists(baseKey);
  if (!exists) {
    return baseKey;
  }

  // If base key exists, try adding random suffix
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomSuffix = generateRandomSuffix();
    const candidateKey = baseKey + randomSuffix;
    
    // Check if candidate key is available
    const candidateExists = await checkExists(candidateKey);
    if (!candidateExists) {
      return candidateKey;
    }
  }

  // If all attempts failed, throw error
  throw new Error(`Unable to generate unique tenant key after ${maxAttempts} attempts`);
}


