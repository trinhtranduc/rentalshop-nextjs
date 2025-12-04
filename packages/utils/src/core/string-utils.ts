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

/**
 * Remove Vietnamese diacritics (accents) from text
 * Converts Vietnamese characters to their non-accented equivalents
 * Example: "A Tiến" -> "A Tien", "Nguyễn" -> "Nguyen"
 * 
 * This is useful for search functionality where users can search
 * with or without Vietnamese accents
 */
export const removeVietnameseDiacritics = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Vietnamese character mapping
  const VNMAP: Record<string, string> = {
    'ạ': 'a', 'ả': 'a', 'ã': 'a', 'à': 'a', 'á': 'a', 'â': 'a', 'ậ': 'a', 'ầ': 'a', 'ấ': 'a',
    'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'ó': 'o', 'ò': 'o', 'ọ': 'o', 'õ': 'o', 'ỏ': 'o', 'ô': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ồ': 'o', 'ố': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẹ': 'e', 'ẽ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ú': 'u', 'ù': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ự': 'u', 'ữ': 'u', 'ử': 'u', 'ừ': 'u', 'ứ': 'u',
    'í': 'i', 'ì': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỵ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ậ': 'A', 'Ầ': 'A', 'Ấ': 'A',
    'Ẩ': 'A', 'Ẫ': 'A', 'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'Ó': 'O', 'Ò': 'O', 'Ọ': 'O', 'Õ': 'O', 'Ỏ': 'O', 'Ô': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ồ': 'O', 'Ố': 'O', 'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'É': 'E', 'È': 'E', 'Ẻ': 'E', 'Ẹ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ú': 'U', 'Ù': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ự': 'U', 'Ữ': 'U', 'Ử': 'U', 'Ừ': 'U', 'Ứ': 'U',
    'Í': 'I', 'Ì': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ý': 'Y', 'Ỳ': 'Y', 'Ỷ': 'Y', 'Ỵ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Check if character has Vietnamese mapping
    if (VNMAP[char]) {
      result += VNMAP[char];
    } else {
      // Keep original character (including spaces, numbers, etc.)
      result += char;
    }
  }
  
  return result;
};
