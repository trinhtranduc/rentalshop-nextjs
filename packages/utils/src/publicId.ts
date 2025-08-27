/**
 * Public ID utilities for working with numeric IDs directly
 * These replace the internal CUID system for public-facing URLs and references
 * Now using simple numeric IDs instead of prefixed strings
 */

export type EntityType = 'USER' | 'MERCHANT' | 'OUTLET' | 'CATEGORY' | 'PRODUCT' | 'CUSTOMER' | 'ORDER';

export interface PublicIdConfig {
  startNumber: number;
}

const ENTITY_CONFIGS: Record<EntityType, PublicIdConfig> = {
  USER: { startNumber: 1 },
  MERCHANT: { startNumber: 1 },
  OUTLET: { startNumber: 1 },
  CATEGORY: { startNumber: 1 },
  PRODUCT: { startNumber: 1 },
  CUSTOMER: { startNumber: 1 },
  ORDER: { startNumber: 1 }
};

/**
 * Format a numeric ID for display (now just returns the number as string)
 * @param entityType - The type of entity (kept for compatibility)
 * @param numericId - The numeric ID from database
 * @returns The numeric ID as a string
 */
export function formatPublicId(entityType: EntityType, numericId: number): string {
  return numericId.toString();
}

/**
 * Parse a public ID string to numeric ID (now just converts string to number)
 * @param publicId - The numeric ID as string
 * @returns The numeric ID or null if invalid
 */
export function parsePublicId(publicId: number): number | null {
  try {
    // Since publicId is already a number, just validate it
    if (isNaN(publicId) || publicId < 1) return null;
    return publicId;
  } catch {
    return null;
  }
}

/**
 * Get the entity type from a public ID (now just validates it's a positive number)
 * @param publicId - The numeric ID as string
 * @returns The entity type (defaults to USER for compatibility) or null if invalid
 */
export function getEntityTypeFromPublicId(publicId: number): EntityType | null {
  try {
    // Since publicId is already a number, just validate it
    if (isNaN(publicId) || publicId < 1) return null;
    return 'USER'; // Default to USER for compatibility
  } catch {
    return null;
  }
}

/**
 * Validate if a public ID format is correct (now just checks if it's a positive number)
 * @param publicId - The public ID to validate
 * @param expectedType - The expected entity type (kept for compatibility)
 * @returns True if valid, false otherwise
 */
export function validatePublicId(publicId: number, expectedType: EntityType): boolean {
  const numericId = parsePublicId(publicId);
  return numericId !== null && numericId > 0;
}

/**
 * Generate the next public ID for a given entity type
 * @param entityType - The type of entity
 * @param currentMaxId - The current maximum numeric ID in the database
 * @returns The next numeric ID to use
 */
export function getNextPublicId(entityType: EntityType, currentMaxId: number): number {
  const config = ENTITY_CONFIGS[entityType];
  return Math.max(config.startNumber, currentMaxId + 1);
}

/**
 * Get display information for a public ID
 * @param publicId - The numeric ID as string
 * @returns Object with entity type and numeric ID
 */
export function getPublicIdInfo(publicId: number): { entityType: EntityType; numericId: number } | null {
  const numericId = parsePublicId(publicId);
  
  if (!numericId) return null;
  
  return { entityType: 'USER', numericId }; // Default to USER for compatibility
}

/**
 * Get all entity types for validation
 * @returns Array of all valid entity types
 */
export function getAllEntityTypes(): EntityType[] {
  return Object.keys(ENTITY_CONFIGS) as EntityType[];
}

/**
 * Get configuration for a specific entity type
 * @param entityType - The entity type
 * @returns The configuration object
 */
export function getEntityConfig(entityType: EntityType): PublicIdConfig {
  return ENTITY_CONFIGS[entityType];
}
