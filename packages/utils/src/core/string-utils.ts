/**
 * String Utility Functions
 * 
 * Provides common string manipulation and validation functions
 */

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Vietnamese phone number
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Generate URL-friendly slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate email format and return error message if invalid
 * @param email - Email string to validate (optional)
 * @param required - Whether email is required (default: false)
 * @param errorMessages - Custom error messages
 * @returns Error message string if invalid, undefined if valid
 */
export const validateEmail = (
  email: string | undefined | null,
  options?: {
    required?: boolean;
    requiredMessage?: string;
    invalidMessage?: string;
  }
): string | undefined => {
  const {
    required = false,
    requiredMessage = 'Email is required',
    invalidMessage = 'Invalid email format'
  } = options || {};

  // Check if email is empty
  if (!email || email.trim() === '') {
    return required ? requiredMessage : undefined;
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return invalidMessage;
  }

  return undefined;
};

/**
 * Validate Vietnamese phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Remove extra whitespace and normalize spaces
 */
export const normalizeWhitespace = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Generate random string of specified length
 */
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if string is empty or only whitespace
 */
export const isEmpty = (text: string): boolean => {
  return !text || text.trim().length === 0;
};

/**
 * Extract initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};
