// Export core auth utilities
export * from './auth';
export * from './password';
export * from './jwt';
export * from './authorization';
export * from './subscription-access';
export * from './subscription-errors';

// Export specific JWT functions
export { verifyTokenSimple, generateToken, verifyToken } from './jwt';

// Export types (but exclude AuthResponse to avoid conflicts)
export type { 
  LoginCredentials, 
  RegisterData, 
  AuthUser 
} from './types';

// Export app-specific auth modules (with specific exports to avoid conflicts)
export { 
  isAuthenticated as isAuthenticatedClient,
  isAuthenticatedWithVerification as isAuthenticatedWithVerificationClient,
  verifyTokenWithServer as verifyTokenWithServerClient,
  loginUserClient,
  logoutUserClient,
  getCurrentUserClient
} from './client';

export type { AuthResponse } from './client';

export { 
  isAuthenticated as isAuthenticatedAdmin,
  isAuthenticatedWithVerification as isAuthenticatedWithVerificationAdmin,
  verifyTokenWithServer as verifyTokenWithServerAdmin
} from './admin';