import * as _rentalshop_utils from '@rentalshop/utils';
export { StoredUser, authenticatedFetch, clearAuthData, getAuthToken, getCurrentUser, getStoredUser, handleApiResponse, isAuthenticated, storeAuthData } from '@rentalshop/utils';
import { U as User, L as LoginCredentials } from './i18n-DV747hs9.mjs';

declare const loginUser: (credentials: LoginCredentials) => Promise<_rentalshop_utils.ApiResponse<_rentalshop_utils.AuthResponse>>;
declare const logoutUser: () => Promise<_rentalshop_utils.ApiResponse<void>>;
declare const verifyTokenWithServer: () => Promise<_rentalshop_utils.ApiResponse<User>>;
declare const isAuthenticatedWithVerification: () => Promise<boolean>;

export { isAuthenticatedWithVerification, loginUser, logoutUser, verifyTokenWithServer };
