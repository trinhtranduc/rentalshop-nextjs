import * as _rentalshop_utils from '@rentalshop/utils';
export { AuthResponse, StoredUser, authenticatedFetch, clearAuthData, getAuthToken, getCurrentUser, getStoredUser, handleApiResponse, isAuthenticated, storeAuthData } from '@rentalshop/utils';
import { U as User, L as LoginCredentials } from './i18n-BOQxA9wU.js';

declare const loginUser: (credentials: LoginCredentials) => Promise<_rentalshop_utils.ApiResponse<_rentalshop_utils.AuthResponse>>;
declare const logoutUser: () => Promise<_rentalshop_utils.ApiResponse<void>>;
declare const verifyTokenWithServer: () => Promise<_rentalshop_utils.ApiResponse<User>>;
declare const loginUserClient: (credentials: LoginCredentials) => Promise<_rentalshop_utils.ApiResponse<_rentalshop_utils.AuthResponse>>;
declare const logoutUserClient: () => Promise<_rentalshop_utils.ApiResponse<void>>;
declare const getCurrentUserClient: () => _rentalshop_utils.StoredUser | null;

declare const isAuthenticatedWithVerification: () => Promise<boolean>;

export { getCurrentUserClient, isAuthenticatedWithVerification, loginUser, loginUserClient, logoutUser, logoutUserClient, verifyTokenWithServer };
