// Database package exports
export * from './client';

// Database operations
export * from './product';
export * from './customer';
export * from './order';
export * from './utils';
export * from './seed';

// Database-specific types only
export type {
  PhoneNumber,
} from './types';

// Utility functions
export {
  createPhoneNumber
} from './types';

// User management functions (explicitly export to ensure they're available)
export {
  findUserByEmail,
  findUserById,
  findUserByPublicId,
  createUser,
  updateUser
} from './utils'; 