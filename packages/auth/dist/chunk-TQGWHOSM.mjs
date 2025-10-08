// src/client/index.ts
import {
  getAuthToken,
  getStoredUser,
  storeAuthData,
  clearAuthData,
  authenticatedFetch,
  handleApiResponse,
  isAuthenticated,
  getCurrentUser
} from "@rentalshop/utils";
import { authApi, getCurrentUser as getCurrentUser2 } from "@rentalshop/utils";
var loginUser = authApi.login;
var logoutUser = authApi.logout;
var verifyTokenWithServer = authApi.verifyToken;
var loginUserClient = authApi.login;
var logoutUserClient = authApi.logout;
var getCurrentUserClient = getCurrentUser2;
var isAuthenticatedWithVerification = async () => {
  const { isAuthenticated: isAuthenticated2 } = await import("@rentalshop/utils");
  if (!isAuthenticated2())
    return false;
  try {
    const result = await authApi.verifyToken();
    return result.success === true;
  } catch (error) {
    return false;
  }
};

export {
  loginUser,
  logoutUser,
  verifyTokenWithServer,
  loginUserClient,
  logoutUserClient,
  getCurrentUserClient,
  isAuthenticatedWithVerification,
  getAuthToken,
  getStoredUser,
  storeAuthData,
  clearAuthData,
  authenticatedFetch,
  handleApiResponse,
  isAuthenticated,
  getCurrentUser
};
//# sourceMappingURL=chunk-TQGWHOSM.mjs.map