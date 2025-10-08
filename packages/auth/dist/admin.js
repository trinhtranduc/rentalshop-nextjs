"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/admin/index.ts
var admin_exports = {};
__export(admin_exports, {
  authenticatedFetch: () => import_utils.authenticatedFetch,
  clearAuthData: () => import_utils.clearAuthData,
  getAuthToken: () => import_utils.getAuthToken,
  getCurrentUser: () => import_utils.getCurrentUser,
  getStoredUser: () => import_utils.getStoredUser,
  handleApiResponse: () => import_utils.handleApiResponse,
  isAuthenticated: () => import_utils.isAuthenticated,
  isAuthenticatedWithVerification: () => isAuthenticatedWithVerification,
  loginUser: () => loginUser,
  logoutUser: () => logoutUser,
  storeAuthData: () => import_utils.storeAuthData,
  verifyTokenWithServer: () => verifyTokenWithServer
});
module.exports = __toCommonJS(admin_exports);
var import_utils = require("@rentalshop/utils");
var import_utils2 = require("@rentalshop/utils");
var loginUser = import_utils2.authApi.login;
var logoutUser = import_utils2.authApi.logout;
var verifyTokenWithServer = import_utils2.authApi.verifyToken;
var isAuthenticatedWithVerification = async () => {
  const { isAuthenticated: isAuthenticated2 } = await import("@rentalshop/utils");
  if (!isAuthenticated2())
    return false;
  try {
    const result = await import_utils2.authApi.verifyToken();
    return result.success === true;
  } catch (error) {
    return false;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authenticatedFetch,
  clearAuthData,
  getAuthToken,
  getCurrentUser,
  getStoredUser,
  handleApiResponse,
  isAuthenticated,
  isAuthenticatedWithVerification,
  loginUser,
  logoutUser,
  storeAuthData,
  verifyTokenWithServer
});
//# sourceMappingURL=admin.js.map