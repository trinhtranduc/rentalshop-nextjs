import {
  assertAnyRole,
  authenticateRequest,
  canAccessResource,
  canAccessUserManagement,
  canCreateOrders,
  canDeleteOrders,
  canExportCustomers,
  canExportOrders,
  canExportProducts,
  canManageOrders,
  canManageOutlets,
  canManageProducts,
  canManageUsers,
  canUpdateOrders,
  canViewOrders,
  createAuthError,
  createPermissionError,
  createScopeError,
  generateToken,
  getUserScope,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  isMerchantLevel,
  isOutletTeam,
  validateScope,
  verifyToken,
  verifyTokenSimple,
  withAnyAuth,
  withAuthRoles,
  withManagementAuth,
  withMerchantAuth
} from "./chunk-BRTTGE3H.mjs";
import {
  getCurrentUserClient,
  isAuthenticated,
  isAuthenticatedWithVerification,
  loginUserClient,
  logoutUserClient,
  verifyTokenWithServer
} from "./chunk-TQGWHOSM.mjs";
import {
  isAuthenticated as isAuthenticated2,
  isAuthenticatedWithVerification as isAuthenticatedWithVerification2,
  verifyTokenWithServer as verifyTokenWithServer2
} from "./chunk-24PAMDEZ.mjs";
import "./chunk-MJPHVYKR.mjs";

// src/auth.ts
import { prisma } from "@rentalshop/database";

// src/password.ts
import * as bcrypt from "bcryptjs";
var hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};
var comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// src/auth.ts
import { getSubscriptionError } from "@rentalshop/utils";
var loginUser = async (credentials) => {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      merchant: true,
      outlet: true
    }
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const isValidPassword = await comparePassword(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }
  const subscriptionError = await getSubscriptionError({
    role: user.role,
    merchant: user.merchant
  });
  if (subscriptionError) {
    console.log("\u{1F50D} LOGIN: Subscription check failed:", subscriptionError.message);
    throw subscriptionError;
  }
  const token = generateToken({
    userId: user.id,
    // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role
  });
  return {
    user: {
      id: user.id,
      // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || void 0,
      merchantId: user.merchantId ? Number(user.merchantId) : void 0,
      outletId: user.outletId ? Number(user.outletId) : void 0,
      merchant: user.merchant ? {
        id: user.merchant.id,
        // Return merchant id to frontend (number)
        name: user.merchant.name,
        description: user.merchant.description || void 0
      } : void 0,
      outlet: user.outlet ? {
        id: user.outlet.id,
        // Return outlet id to frontend (number)
        name: user.outlet.name,
        address: user.outlet.address || void 0
      } : void 0
    },
    token
  };
};
var registerUser = async (data) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const hashedPassword = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || data.name?.split(" ")[0] || "",
      lastName: data.lastName || data.name?.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "OUTLET_STAFF"
    }
  });
  const token = generateToken({
    userId: user.id,
    // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role
  });
  return {
    user: {
      id: user.id,
      // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || void 0,
      merchantId: user.merchantId ? Number(user.merchantId) : void 0,
      outletId: user.outletId ? Number(user.outletId) : void 0
    },
    token
  };
};

// src/middleware.ts
function withAuth(handler) {
  return async (request, ...args) => {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(request, authResult.user, ...args);
  };
}
async function optionalAuth(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return null;
    }
    const authResult = await authenticateRequest(request);
    return authResult.success ? authResult.user : null;
  } catch (error) {
    console.error("Optional authentication error:", error);
    return null;
  }
}
function authorizeRequest(user, options = {}) {
  const userScope = getUserScope(user);
  if (options.permission && !hasPermission(user, options.permission)) {
    return {
      authorized: false,
      error: createPermissionError(options.permission),
      userScope
    };
  }
  if (options.resource && !canAccessResource(user, options.resource, options.action || "view")) {
    return {
      authorized: false,
      error: createPermissionError(`${options.resource}.${options.action || "view"}`),
      userScope
    };
  }
  if (options.scope) {
    const scopeCheck = validateScope(userScope, options.scope);
    if (!scopeCheck.valid) {
      return {
        authorized: false,
        error: scopeCheck.error,
        userScope
      };
    }
  }
  return { authorized: true, userScope };
}
function withAuthAndAuthz(options = {}, handler) {
  return async (request, ...args) => {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const authzResult = authorizeRequest(authResult.user, options);
    if (!authzResult.authorized) {
      return authzResult.error;
    }
    const authorizedRequest = {
      request,
      user: authResult.user,
      userScope: authzResult.userScope
    };
    return handler(authorizedRequest, ...args);
  };
}
var withAdminAuth = withAuthAndAuthz.bind(null, { permission: "system.manage" });
var withUserManagementAuth = withAuthAndAuthz.bind(null, { permission: "users.manage" });
var withProductManagementAuth = withAuthAndAuthz.bind(null, { permission: "products.manage" });
var withProductExportAuth = withAuthAndAuthz.bind(null, { permission: "products.export" });
var withOrderManagementAuth = withAuthAndAuthz.bind(null, { permission: "orders.manage" });
var withOrderCreateAuth = withAuthAndAuthz.bind(null, { permission: "orders.create" });
var withOrderViewAuth = withAuthAndAuthz.bind(null, { permission: "orders.view" });
var withOrderUpdateAuth = withAuthAndAuthz.bind(null, { permission: "orders.update" });
var withOrderDeleteAuth = withAuthAndAuthz.bind(null, { permission: "orders.delete" });
var withOrderExportAuth = withAuthAndAuthz.bind(null, { permission: "orders.export" });
var withCustomerManagementAuth = withAuthAndAuthz.bind(null, { permission: "customers.manage" });
var withCustomerExportAuth = withAuthAndAuthz.bind(null, { permission: "customers.export" });
var withBillingManagementAuth = withAuthAndAuthz.bind(null, { permission: "billing.manage" });
var withViewAuth = withAuthAndAuthz.bind(null, { action: "view" });
function withMerchantScope(merchantId) {
  return withAuthAndAuthz.bind(null, {
    scope: { merchantId },
    resource: "merchant",
    action: "view"
  });
}
function withOutletScope(outletId) {
  return withAuthAndAuthz.bind(null, {
    scope: { outletId },
    resource: "outlet",
    action: "view"
  });
}
function getUserScopeFromRequest(authorizedRequest) {
  return authorizedRequest.userScope;
}
function buildSecureWhereClause(authorizedRequest, additionalWhere = {}) {
  const { userScope } = authorizedRequest;
  if (userScope.canAccessSystem) {
    return additionalWhere;
  }
  const where = { ...additionalWhere };
  if (userScope.merchantId) {
    where.merchantId = userScope.merchantId;
  }
  if (userScope.outletId) {
    where.outletId = userScope.outletId;
  }
  return where;
}
async function validateResourceBelongsToUser(authorizedRequest, resourceType, resourceId) {
  const { userScope } = authorizedRequest;
  if (userScope.canAccessSystem) {
    return { valid: true };
  }
  return { valid: true };
}
export {
  assertAnyRole,
  authenticateRequest,
  authorizeRequest,
  buildSecureWhereClause,
  canAccessResource,
  canAccessUserManagement,
  canCreateOrders,
  canDeleteOrders,
  canExportCustomers,
  canExportOrders,
  canExportProducts,
  canManageOrders,
  canManageOutlets,
  canManageProducts,
  canManageUsers,
  canUpdateOrders,
  canViewOrders,
  comparePassword,
  createAuthError,
  createPermissionError,
  createScopeError,
  generateToken,
  getCurrentUserClient,
  getUserScope,
  getUserScopeFromRequest,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hashPassword,
  isAuthenticated2 as isAuthenticatedAdmin,
  isAuthenticated as isAuthenticatedClient,
  isAuthenticatedWithVerification2 as isAuthenticatedWithVerificationAdmin,
  isAuthenticatedWithVerification as isAuthenticatedWithVerificationClient,
  isMerchantLevel,
  isOutletTeam,
  loginUser,
  loginUserClient,
  logoutUserClient,
  optionalAuth,
  registerUser,
  validateResourceBelongsToUser,
  validateScope,
  verifyToken,
  verifyTokenSimple,
  verifyTokenWithServer2 as verifyTokenWithServerAdmin,
  verifyTokenWithServer as verifyTokenWithServerClient,
  withAdminAuth,
  withAnyAuth,
  withAuth,
  withAuthAndAuthz,
  withAuthRoles,
  withBillingManagementAuth,
  withCustomerExportAuth,
  withCustomerManagementAuth,
  withManagementAuth,
  withMerchantAuth,
  withMerchantScope,
  withOrderCreateAuth,
  withOrderDeleteAuth,
  withOrderExportAuth,
  withOrderManagementAuth,
  withOrderUpdateAuth,
  withOrderViewAuth,
  withOutletScope,
  withProductExportAuth,
  withProductManagementAuth,
  withUserManagementAuth,
  withViewAuth
};
//# sourceMappingURL=index.mjs.map