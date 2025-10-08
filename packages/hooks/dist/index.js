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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CurrencyProvider: () => CurrencyProvider,
  useAuth: () => useAuth,
  useAuthErrorHandler: () => useAuthErrorHandler,
  useCanExportData: () => useCanExportData,
  useCanManageCategories: () => useCanManageCategories,
  useCanManageOutlets: () => useCanManageOutlets,
  useCanManageProducts: () => useCanManageProducts,
  useCanManageSubscriptions: () => useCanManageSubscriptions,
  useCanManageUsers: () => useCanManageUsers,
  useCanPerform: () => useCanPerform,
  useCanViewBilling: () => useCanViewBilling,
  useCurrency: () => useCurrency,
  useCustomerManagement: () => useCustomerManagement,
  useErrorHandler: () => useErrorHandler,
  useOrderManagement: () => useOrderManagement,
  usePagination: () => usePagination,
  useProductAvailability: () => useProductAvailability,
  useProductManagement: () => useProductManagement,
  useSimpleErrorHandler: () => useSimpleErrorHandler,
  useSubscriptionError: () => useSubscriptionError,
  useSubscriptionStatusInfo: () => useSubscriptionStatusInfo,
  useThrottledSearch: () => useThrottledSearch,
  useToastHandler: () => useToastHandler,
  useUserManagement: () => useUserManagement,
  useUserRole: () => useUserRole
});
module.exports = __toCommonJS(index_exports);

// src/hooks/useAuth.ts
var import_react = require("react");
var import_utils = require("@rentalshop/utils");
function useAuth() {
  const [state, setState] = (0, import_react.useState)({
    user: null,
    loading: true,
    error: null
  });
  const login = (0, import_react.useCallback)(async (email, password) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const { apiUrls } = await import("@rentalshop/utils");
      const response = await fetch(apiUrls.auth.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      if (response.status === 402) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          error: errorData.message || "Subscription issue detected",
          loading: false
        }));
        return false;
      }
      if (response.status === 401) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          error: errorData.message || "Invalid credentials",
          loading: false
        }));
        return false;
      }
      const data = await response.json();
      if (data.success && data.data?.token) {
        (0, import_utils.storeAuthData)(data.data.token, data.data.user);
        setState((prev) => ({
          ...prev,
          user: data.data.user,
          loading: false
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          error: data.message || "Login failed",
          loading: false
        }));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return false;
    }
  }, []);
  const logout = (0, import_react.useCallback)(() => {
    (0, import_utils.clearAuthData)();
    setState({
      user: null,
      loading: false,
      error: null
    });
  }, []);
  const clearError = (0, import_react.useCallback)(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);
  const refreshUser = (0, import_react.useCallback)(async () => {
    try {
      const token = (0, import_utils.getAuthToken)();
      console.log("\u{1F504} refreshUser called, token exists:", !!token);
      if (!token) {
        console.log("\u274C No token found, setting user to null");
        setState((prev) => ({ ...prev, user: null, loading: false }));
        return;
      }
      console.log("\u{1F310} Fetching user profile from API...");
      const { apiUrls, authenticatedFetch } = await import("@rentalshop/utils");
      const response = await authenticatedFetch(apiUrls.settings.user);
      console.log("\u{1F4E5} Profile API response:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      if (response.ok) {
        const data = await response.json();
        console.log("\u{1F4CA} Profile API data:", data);
        if (data.success && data.data) {
          console.log("\u2705 Setting user data:", data.data);
          setState((prev) => ({
            ...prev,
            user: data.data,
            loading: false
          }));
        } else {
          console.error("\u274C API returned success:false:", data);
          throw new Error("Failed to refresh user");
        }
      } else if (response.status === 402) {
        try {
          const errorData = await response.clone().json();
          console.log("\u26A0\uFE0F Subscription error detected, not logging out");
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorData.message || "Subscription issue detected"
          }));
          return;
        } catch (parseError) {
          console.log("\u{1F50D} Could not parse 402 error response");
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Subscription issue detected"
          }));
          return;
        }
      } else if (response.status === 401) {
        console.log("\u{1F512} Token expired, logging out and redirecting to login");
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      } else {
        console.error("\u274C API error:", response.status, response.statusText);
        console.log("\u26A0\uFE0F API error during refresh, but keeping existing user data");
        setState((prev) => ({ ...prev, loading: false }));
        if (response.status >= 500) {
          console.log("\u{1F525} Server error, keeping user data but not clearing auth");
        }
      }
    } catch (err) {
      console.error("\u{1F4A5} Error refreshing user:", err);
      console.log("\u26A0\uFE0F Refresh failed, but keeping existing user data");
      setState((prev) => ({ ...prev, loading: false }));
      if (err instanceof Error && (err.message.includes("Failed to fetch") || err.message.includes("Network error") || err.message.includes("fetch"))) {
        console.log("\u{1F310} Network error during refresh, keeping user data");
      }
    }
  }, [logout]);
  (0, import_react.useEffect)(() => {
    const token = (0, import_utils.getAuthToken)();
    const storedUser = (0, import_utils.getStoredUser)();
    console.log("\u{1F50D} useAuth useEffect - localStorage check:", {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 20) + "..." : "null",
      storedUserPreview: storedUser ? JSON.stringify(storedUser).substring(0, 100) + "..." : "null",
      storedUserFirstName: storedUser?.firstName,
      storedUserLastName: storedUser?.lastName,
      storedUserPhone: storedUser?.phone
    });
    if (token && storedUser) {
      console.log("\u2705 Found stored user data:", storedUser);
      setState((prev) => ({ ...prev, user: {
        ...storedUser,
        id: storedUser.id
        // Keep as number
      }, loading: false }));
      if (!storedUser.merchantId && !storedUser.outletId) {
        console.log("\u{1F504} User data incomplete (missing merchant/outlet IDs) - refreshing from API...");
        refreshUser();
      } else if (!storedUser.firstName || !storedUser.lastName) {
        console.log("\u{1F504} User data incomplete (missing firstName/lastName) - refreshing from API...");
        refreshUser();
      } else {
        console.log("\u2705 User data complete - no need to refresh");
      }
    } else if (token && !storedUser) {
      console.log("\u{1F504} Token exists but no user data - refreshing from API...");
      refreshUser();
    } else {
      console.log("\u274C No auth data found - user not authenticated");
      setState((prev) => ({ ...prev, user: null, loading: false }));
    }
  }, [refreshUser]);
  (0, import_react.useEffect)(() => {
    const checkTokenExpiry = () => {
      const token = (0, import_utils.getAuthToken)();
      if (!token) return;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1e3);
          const timeUntilExpiry = payload.exp - now;
          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            console.log("\u{1F504} Token expires soon, refreshing...");
            refreshUser();
          }
        }
      } catch (error) {
        console.warn("Failed to check token expiry:", error);
      }
    };
    const interval = setInterval(checkTokenExpiry, 6e4);
    checkTokenExpiry();
    return () => clearInterval(interval);
  }, [refreshUser]);
  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    refreshUser,
    clearError
  };
}

// src/hooks/useAuthErrorHandler.ts
var import_react2 = require("react");
var import_utils2 = require("@rentalshop/utils");
var useAuthErrorHandler = () => {
  const handleAuthError = (0, import_react2.useCallback)((error) => {
    console.error("Authentication error detected:", error);
    if (error?.message?.includes("Authentication required") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid token") || error?.message?.includes("Token expired") || error?.status === 401) {
      console.log("\u{1F504} Authentication error detected, logging out user");
      (0, import_utils2.clearAuthData)();
      if (typeof window !== "undefined") {
      }
    }
  }, []);
  return { handleAuthError };
};

// src/hooks/useCanPerform.ts
var import_react4 = require("react");

// src/hooks/useSubscriptionStatusInfo.ts
var import_react3 = require("react");
function useSubscriptionStatusInfo(options = {}) {
  const { checkInterval = 5 * 60 * 1e3 } = options;
  const { user } = useAuth();
  const [loading, setLoading] = (0, import_react3.useState)(true);
  const [hasActiveSubscription, setHasActiveSubscription] = (0, import_react3.useState)(false);
  const [isExpired, setIsExpired] = (0, import_react3.useState)(false);
  const [isExpiringSoon, setIsExpiringSoon] = (0, import_react3.useState)(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = (0, import_react3.useState)(null);
  const [subscriptionType, setSubscriptionType] = (0, import_react3.useState)(null);
  const [hasSubscription, setHasSubscription] = (0, import_react3.useState)(false);
  const [subscription, setSubscription] = (0, import_react3.useState)(null);
  const [status, setStatus] = (0, import_react3.useState)("");
  const [isTrial, setIsTrial] = (0, import_react3.useState)(false);
  const [isActive, setIsActive] = (0, import_react3.useState)(false);
  const [planName, setPlanName] = (0, import_react3.useState)("");
  const [error, setError] = (0, import_react3.useState)(null);
  const fetchSubscriptionStatus = (0, import_react3.useCallback)(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { subscriptionsApi } = await import("@rentalshop/utils");
      const response = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      if (response.success && response.data) {
        const data = response.data;
        const computedStatus = data.status || "UNKNOWN";
        const apiHasAccess = data.hasAccess ?? false;
        const apiDaysRemaining = data.daysRemaining ?? null;
        const apiIsExpiringSoon = data.isExpiringSoon ?? false;
        const isActive2 = computedStatus === "ACTIVE";
        const isExpired2 = computedStatus === "EXPIRED";
        const isTrial2 = computedStatus === "TRIAL";
        const isCanceled = computedStatus === "CANCELED";
        const isPastDue = computedStatus === "PAST_DUE";
        const isPaused = computedStatus === "PAUSED";
        const hasActive = apiHasAccess;
        setHasActiveSubscription(hasActive);
        setIsExpired(isExpired2);
        setIsExpiringSoon(apiIsExpiringSoon);
        setDaysUntilExpiry(apiDaysRemaining);
        setSubscriptionType(data.planName || computedStatus);
        setHasSubscription(true);
        setSubscription(data);
        setStatus(computedStatus);
        setIsTrial(isTrial2);
        setIsActive(isActive2);
        setPlanName(data.planName || "Unknown Plan");
        setError(null);
        console.log("\u2705 Subscription status mapped:", {
          computedStatus,
          hasAccess: apiHasAccess,
          daysRemaining: apiDaysRemaining,
          isExpiringSoon: apiIsExpiringSoon,
          statusReason: data.statusReason
        });
      } else {
        setHasActiveSubscription(false);
        setIsExpired(true);
        setIsExpiringSoon(false);
        setDaysUntilExpiry(null);
        setSubscriptionType(null);
        setHasSubscription(false);
        setSubscription(null);
        setStatus("NO_SUBSCRIPTION");
        setIsTrial(false);
        setIsActive(false);
        setPlanName("");
        setError("No subscription found");
      }
    } catch (error2) {
      console.error("Error fetching subscription status:", error2);
      setHasActiveSubscription(false);
      setIsExpired(true);
      setIsExpiringSoon(false);
      setDaysUntilExpiry(null);
      setSubscriptionType(null);
      setHasSubscription(false);
      setSubscription(null);
      setStatus("ERROR");
      setIsTrial(false);
      setIsActive(false);
      setPlanName("");
      setError(error2 instanceof Error ? error2.message : "Failed to fetch subscription");
    } finally {
      setLoading(false);
    }
  }, [user]);
  const canAccessFeature = (0, import_react3.useCallback)((feature) => {
    if (!hasActiveSubscription || isExpired) {
      return false;
    }
    return true;
  }, [hasActiveSubscription, isExpired]);
  const refreshStatus = (0, import_react3.useCallback)(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  (0, import_react3.useEffect)(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  (0, import_react3.useEffect)(() => {
    if (!user) return;
    const interval = setInterval(fetchSubscriptionStatus, checkInterval);
    return () => clearInterval(interval);
  }, [user, fetchSubscriptionStatus, checkInterval]);
  const statusMessage = subscription?.statusReason || (isExpired ? "Subscription expired" : isExpiringSoon ? `Expires in ${daysUntilExpiry} days` : isTrial ? `Trial (${daysUntilExpiry} days left)` : isActive ? "Active subscription" : "No subscription");
  const statusColor = status === "EXPIRED" ? "red" : status === "CANCELED" ? "red" : status === "PAST_DUE" ? "orange" : status === "PAUSED" ? "yellow" : isExpiringSoon ? "orange" : status === "TRIAL" ? "yellow" : status === "ACTIVE" ? "green" : "gray";
  const hasAccess = subscription?.hasAccess ?? (hasActiveSubscription && !isExpired);
  const accessLevel = status === "EXPIRED" || status === "CANCELED" ? "denied" : status === "PAST_DUE" ? "readonly" : status === "PAUSED" ? "readonly" : status === "TRIAL" ? "limited" : status === "ACTIVE" ? "full" : "denied";
  const requiresPayment = status === "EXPIRED" || status === "PAST_DUE" || isExpiringSoon;
  const upgradeRequired = status === "EXPIRED" || status === "CANCELED";
  const gracePeriodEnds = isExpiringSoon && daysUntilExpiry ? new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1e3) : null;
  const canExportData = hasAccess;
  const isRestricted = !hasAccess || status === "TRIAL" || status === "PAUSED";
  const isReadOnly = status === "EXPIRED" || status === "PAST_DUE" || status === "PAUSED";
  const isLimited = status === "TRIAL";
  const isDenied = status === "EXPIRED" || status === "CANCELED" || !hasActiveSubscription;
  return {
    // Original interface
    loading,
    hasActiveSubscription,
    isExpired,
    isExpiringSoon,
    daysUntilExpiry,
    subscriptionType,
    canAccessFeature,
    refreshStatus,
    // Extended interface for UI components
    hasSubscription,
    subscription,
    status,
    isTrial,
    isActive,
    planName,
    error,
    // Additional properties for other components
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted,
    isReadOnly,
    isLimited,
    isDenied
  };
}

// src/hooks/useCanPerform.ts
function useCanPerform(action) {
  const { user } = useAuth();
  const { hasActiveSubscription, isExpired, canAccessFeature } = useSubscriptionStatusInfo();
  const checkPermission = (0, import_react4.useCallback)((action2) => {
    if (!user) {
      return false;
    }
    const actionPermissions = {
      // Order actions
      "create_order": {
        action: "create_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      "edit_order": {
        action: "edit_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      "delete_order": {
        action: "delete_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      // Customer actions
      "create_customer": {
        action: "create_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      "edit_customer": {
        action: "edit_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      "delete_customer": {
        action: "delete_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      // Product actions
      "create_product": {
        action: "create_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      "edit_product": {
        action: "edit_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      "delete_product": {
        action: "delete_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      // Analytics and reporting
      "view_analytics": {
        action: "view_analytics",
        requiresSubscription: true,
        requiredFeatures: ["analytics"]
      },
      "export_data": {
        action: "export_data",
        requiresSubscription: true,
        requiredFeatures: ["analytics", "export"]
      },
      // User management
      "manage_users": {
        action: "manage_users",
        requiresSubscription: true,
        requiredRole: ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]
      },
      // Settings
      "manage_settings": {
        action: "manage_settings",
        requiresSubscription: true,
        requiredRole: ["ADMIN", "MERCHANT"]
      },
      // Bulk operations
      "bulk_operations": {
        action: "bulk_operations",
        requiresSubscription: true,
        requiredFeatures: ["bulk_operations"]
      }
    };
    const permission = actionPermissions[action2];
    if (!permission) {
      return true;
    }
    if (permission.requiresSubscription) {
      if (!hasActiveSubscription || isExpired) {
        return false;
      }
    }
    if (permission.requiredFeatures) {
      for (const feature of permission.requiredFeatures) {
        if (!canAccessFeature(feature)) {
          return false;
        }
      }
    }
    if (permission.requiredRole) {
      if (!permission.requiredRole.includes(user.role)) {
        return false;
      }
    }
    if (permission.customCheck) {
      return permission.customCheck(user, { hasActiveSubscription, isExpired });
    }
    return true;
  }, [user, hasActiveSubscription, isExpired, canAccessFeature]);
  return checkPermission(action);
}

// src/hooks/useCurrency.tsx
var import_react5 = require("react");
var import_utils3 = require("@rentalshop/utils");
var CurrencyContext = (0, import_react5.createContext)(void 0);
function CurrencyProvider({
  children,
  initialSettings = {}
}) {
  const [settings, setSettings] = (0, import_react5.useState)({
    ...import_utils3.DEFAULT_CURRENCY_SETTINGS,
    ...initialSettings
  });
  const currentCurrency = (0, import_utils3.getCurrentCurrency)(settings);
  const setCurrency = (0, import_react5.useCallback)((currencyCode) => {
    setSettings((prev) => ({
      ...prev,
      currentCurrency: currencyCode
    }));
    localStorage.setItem("rentalshop-currency", currencyCode);
  }, []);
  const toggleSymbol = (0, import_react5.useCallback)(() => {
    setSettings((prev) => ({
      ...prev,
      showSymbol: !prev.showSymbol
    }));
    localStorage.setItem("rentalshop-show-symbol", (!settings.showSymbol).toString());
  }, [settings.showSymbol]);
  const toggleCode = (0, import_react5.useCallback)(() => {
    setSettings((prev) => ({
      ...prev,
      showCode: !prev.showCode
    }));
    localStorage.setItem("rentalshop-show-code", (!settings.showCode).toString());
  }, [settings.showCode]);
  const getCurrencyByCode = (0, import_react5.useCallback)((code) => {
    return (0, import_utils3.getCurrency)(code);
  }, []);
  const convertAmount = (0, import_react5.useCallback)((amount, from, to) => {
    if (from === to) return amount;
    const fromCurrency = (0, import_utils3.getCurrency)(from);
    const toCurrency = (0, import_utils3.getCurrency)(to);
    if (!fromCurrency || !toCurrency) {
      throw new Error(`Invalid currency code: ${from} or ${to}`);
    }
    const amountInUSD = amount / fromCurrency.exchangeRate;
    return amountInUSD * toCurrency.exchangeRate;
  }, []);
  (0, import_react5.useEffect)(() => {
    try {
      const savedCurrency = localStorage.getItem("rentalshop-currency");
      const savedShowSymbol = localStorage.getItem("rentalshop-show-symbol");
      const savedShowCode = localStorage.getItem("rentalshop-show-code");
      if (savedCurrency && isValidCurrencyCode(savedCurrency)) {
        setSettings((prev) => ({ ...prev, currentCurrency: savedCurrency }));
      }
      if (savedShowSymbol !== null) {
        setSettings((prev) => ({ ...prev, showSymbol: savedShowSymbol === "true" }));
      }
      if (savedShowCode !== null) {
        setSettings((prev) => ({ ...prev, showCode: savedShowCode === "true" }));
      }
    } catch (error) {
      console.warn("Failed to load currency settings from localStorage:", error);
    }
  }, []);
  const contextValue = {
    settings,
    currentCurrency,
    setCurrency,
    toggleSymbol,
    toggleCode,
    getCurrencyByCode,
    convertAmount
  };
  return /* @__PURE__ */ React.createElement(CurrencyContext.Provider, { value: contextValue }, children);
}
function useCurrency() {
  const context = (0, import_react5.useContext)(CurrencyContext);
  if (context === void 0) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
function isValidCurrencyCode(code) {
  return ["USD", "VND"].includes(code);
}

// src/hooks/useCustomerManagement.ts
var import_react8 = require("react");
var import_navigation = require("next/navigation");

// src/hooks/usePagination.ts
var import_react6 = require("react");
var import_constants = require("@rentalshop/constants");
function usePagination(config = {}) {
  const { initialLimit = import_constants.PAGINATION.DEFAULT_PAGE_SIZE, initialOffset = 0 } = config;
  const [pagination, setPaginationState] = (0, import_react6.useState)({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });
  const setPagination = (0, import_react6.useCallback)((newPagination) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
      currentPage: Math.floor((newPagination.offset ?? prev.offset) / (newPagination.limit ?? prev.limit)) + 1,
      totalPages: Math.ceil((newPagination.total ?? prev.total) / (newPagination.limit ?? prev.limit))
    }));
  }, []);
  const handlePageChange = (0, import_react6.useCallback)((page) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({
      offset: newOffset,
      currentPage: page
    });
  }, [pagination.limit, setPagination]);
  const resetPagination = (0, import_react6.useCallback)(() => {
    setPagination({
      total: 0,
      offset: initialOffset,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    });
  }, [initialOffset, setPagination]);
  const updatePaginationFromResponse = (0, import_react6.useCallback)((response) => {
    setPagination({
      total: response.total,
      limit: response.limit,
      offset: response.offset,
      hasMore: response.hasMore ?? response.offset + response.limit < response.total,
      currentPage: Math.floor(response.offset / response.limit) + 1,
      totalPages: Math.ceil(response.total / response.limit)
    });
  }, [setPagination]);
  return {
    pagination,
    setPagination,
    handlePageChange,
    resetPagination,
    updatePaginationFromResponse
  };
}

// src/hooks/useThrottledSearch.ts
var import_react7 = require("react");
function useThrottledSearch(options) {
  const { delay, minLength, onSearch } = options;
  const [query, setQuery] = (0, import_react7.useState)("");
  const [isSearching, setIsSearching] = (0, import_react7.useState)(false);
  const timeoutRef = (0, import_react7.useRef)(null);
  const isSearchingRef = (0, import_react7.useRef)(false);
  const isInitialRender = (0, import_react7.useRef)(true);
  const handleSearchChange = (0, import_react7.useCallback)((value) => {
    console.log("\u{1F50D} useThrottledSearch: handleSearchChange called with:", value);
    setQuery(value);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (value.length >= minLength) {
      console.log("\u{1F50D} useThrottledSearch: Query meets minLength, setting up timeout");
      setIsSearching(true);
      isSearchingRef.current = true;
      timeoutRef.current = setTimeout(() => {
        console.log("\u{1F50D} useThrottledSearch: Timeout executing, calling onSearch with:", value);
        onSearch(value);
        setIsSearching(false);
        isSearchingRef.current = false;
      }, delay);
    } else if (value.length === 0) {
      console.log("\u{1F50D} useThrottledSearch: Query is empty, clearing search");
      setIsSearching(false);
      isSearchingRef.current = false;
      if (!isInitialRender.current) {
        onSearch("");
      }
    } else {
      console.log("\u{1F50D} useThrottledSearch: Query too short, not searching");
      setIsSearching(false);
      isSearchingRef.current = false;
    }
  }, [delay, minLength, onSearch]);
  const clearSearch = (0, import_react7.useCallback)(() => {
    setQuery("");
    setIsSearching(false);
    isSearchingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isInitialRender.current) {
      onSearch("");
    }
  }, [onSearch]);
  const cleanup = (0, import_react7.useCallback)(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  (0, import_react7.useEffect)(() => {
    isInitialRender.current = false;
    return cleanup;
  }, [cleanup]);
  return {
    query,
    isSearching,
    handleSearchChange,
    clearSearch,
    cleanup,
    setQuery
  };
}

// src/hooks/useCustomerManagement.ts
var import_utils4 = require("@rentalshop/utils");
var import_constants2 = require("@rentalshop/constants");
var useCustomerManagement = (options = {}) => {
  const router = (0, import_navigation.useRouter)();
  const {
    initialLimit = import_constants2.PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchCustomers = false,
    enableStats = false,
    merchantId,
    outletId
  } = options;
  const [customers, setCustomers] = (0, import_react8.useState)([]);
  const [loading, setLoading] = (0, import_react8.useState)(true);
  const [cityFilter, setCityFilter] = (0, import_react8.useState)("");
  const [stateFilter, setStateFilter] = (0, import_react8.useState)("");
  const [countryFilter, setCountryFilter] = (0, import_react8.useState)("");
  const [idTypeFilter, setIdTypeFilter] = (0, import_react8.useState)("all");
  const [statusFilter, setStatusFilter] = (0, import_react8.useState)("all");
  const [selectedCustomer, setSelectedCustomer] = (0, import_react8.useState)(null);
  const [showCustomerDetail, setShowCustomerDetail] = (0, import_react8.useState)(false);
  const [showCreateForm, setShowCreateForm] = (0, import_react8.useState)(false);
  const [showEditDialog, setShowEditDialog] = (0, import_react8.useState)(false);
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });
  const { query: searchTerm, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 300,
    minLength: 0,
    onSearch: (query) => {
      fetchCustomers(1, query, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter);
    }
  });
  const fetchCustomers = (0, import_react8.useCallback)(async (page = pagination.currentPage, searchQuery = "", city = "", state = "", country = "", idType = "all", status = "all") => {
    try {
      setLoading(true);
      let response;
      if (useSearchCustomers) {
        const filters2 = {
          search: searchQuery || void 0,
          city: city || void 0,
          state: state || void 0,
          country: country || void 0,
          idType: idType !== "all" ? idType : void 0,
          isActive: status !== "all" ? status === "active" : void 0,
          merchantId,
          outletId,
          // Add pagination parameters
          page,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit
        };
        response = await import_utils4.customersApi.searchCustomers(filters2);
      } else {
        response = await import_utils4.customersApi.getCustomersPaginated(page, pagination.limit);
      }
      if (response.success && response.data) {
        if (useSearchCustomers) {
          const searchResponse = response.data;
          const customersData = searchResponse.customers || [];
          const total = searchResponse.total || 0;
          const totalPagesCount = searchResponse.totalPages || 1;
          const currentPage = searchResponse.page || 1;
          const hasMore = searchResponse.hasMore || false;
          setCustomers(customersData);
          updatePaginationFromResponse({
            total,
            limit: pagination.limit,
            offset: (currentPage - 1) * pagination.limit,
            hasMore
          });
        } else {
          const customersResponse = response.data;
          const customersData = customersResponse.customers || [];
          const total = customersResponse.total || 0;
          const totalPagesCount = customersResponse.totalPages || 1;
          setCustomers(customersData);
          updatePaginationFromResponse({
            total,
            limit: pagination.limit,
            offset: (page - 1) * pagination.limit,
            hasMore: page < totalPagesCount
          });
        }
      } else {
        console.error("API Error:", response.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, useSearchCustomers, merchantId, outletId, updatePaginationFromResponse]);
  (0, import_react8.useEffect)(() => {
    const timeoutId = setTimeout(() => {
      handlePageChange(1);
      fetchCustomers(1, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, handlePageChange]);
  const filteredCustomers = (0, import_react8.useMemo)(() => {
    if (useSearchCustomers) {
      return customers;
    } else {
      return (customers || []).filter((customer) => {
        if (!customer || typeof customer !== "object") {
          return false;
        }
        const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) || (customer.address || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCity = !cityFilter || (customer.city || "").toLowerCase().includes(cityFilter.toLowerCase());
        const matchesState = !stateFilter || (customer.state || "").toLowerCase().includes(stateFilter.toLowerCase());
        const matchesCountry = !countryFilter || (customer.country || "").toLowerCase().includes(countryFilter.toLowerCase());
        const matchesIdType = idTypeFilter === "all" || customer.idType === idTypeFilter;
        const matchesStatus = statusFilter === "all" || statusFilter === "active" && customer.isActive || statusFilter === "inactive" && !customer.isActive;
        return matchesSearch && matchesCity && matchesState && matchesCountry && matchesIdType && matchesStatus;
      });
    }
  }, [customers, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, useSearchCustomers]);
  const stats = (0, import_react8.useMemo)(() => {
    if (!enableStats) return void 0;
    const customersArray = customers || [];
    const totalCustomers = customersArray.length;
    const activeCustomers = customersArray.filter((c) => c.isActive).length;
    const inactiveCustomers = customersArray.filter((c) => !c.isActive).length;
    const customersWithEmail = customersArray.filter((c) => c.email && c.email.trim() !== "").length;
    const customersWithAddress = customersArray.filter((c) => c.address && c.address.trim() !== "").length;
    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      customersWithEmail,
      customersWithAddress
    };
  }, [customers, enableStats]);
  const filters = (0, import_react8.useMemo)(() => ({
    search: searchTerm,
    city: cityFilter || void 0,
    state: stateFilter || void 0,
    country: countryFilter || void 0,
    idType: idTypeFilter !== "all" ? idTypeFilter : void 0,
    isActive: statusFilter !== "all" ? statusFilter === "active" : void 0,
    merchantId,
    outletId
  }), [searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, merchantId, outletId]);
  const handleViewCustomer = (0, import_react8.useCallback)((customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
  }, []);
  const handleEditCustomer = (0, import_react8.useCallback)((customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  }, []);
  const handleToggleStatus = (0, import_react8.useCallback)(async (customer) => {
    try {
      const response = await import_utils4.customersApi.updateCustomer(customer.id, {
        id: customer.id,
        isActive: !customer.isActive
      });
      if (response.success) {
        fetchCustomers();
      } else {
        throw new Error(response.error || "Failed to update customer status");
      }
    } catch (error) {
      console.error("Error updating customer status:", error);
    }
  }, [fetchCustomers]);
  const handleCustomerUpdated = (0, import_react8.useCallback)((updatedCustomer) => {
    setShowEditDialog(false);
    setShowCustomerDetail(false);
    fetchCustomers();
  }, [fetchCustomers]);
  const handleCustomerError = (0, import_react8.useCallback)((error) => {
    console.error("Customer operation error:", error);
  }, []);
  const handleCustomerRowAction = (0, import_react8.useCallback)((action, customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    switch (action) {
      case "view":
        handleViewCustomer(customer);
        break;
      case "edit":
        handleEditCustomer(customer);
        break;
      case "viewOrders":
        console.log("\u{1F504} Navigating to customer orders page:", `/customers/${customerId}/orders`);
        router.push(`/customers/${customerId}/orders`);
        break;
      case "activate":
      case "deactivate":
        handleToggleStatus(customer);
        break;
      case "delete":
        console.log("Delete customer:", customerId);
        break;
      default:
        console.log("Unknown action:", action);
    }
  }, [customers, handleViewCustomer, handleEditCustomer, handleToggleStatus, router]);
  const handleAddCustomer = (0, import_react8.useCallback)(() => {
    setShowCreateForm(true);
  }, []);
  const handleExportCustomers = (0, import_react8.useCallback)(() => {
    console.log("Export functionality coming soon!");
  }, []);
  const handleFiltersChange = (0, import_react8.useCallback)((newFilters) => {
    setCityFilter(newFilters.city || "");
    setStateFilter(newFilters.state || "");
    setCountryFilter(newFilters.country || "");
    setIdTypeFilter(newFilters.idType || "all");
    setStatusFilter(newFilters.isActive !== void 0 ? newFilters.isActive ? "active" : "inactive" : "all");
    handlePageChange(1);
  }, [handlePageChange]);
  const handleSearchChange = (0, import_react8.useCallback)((searchValue) => {
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);
  const handleClearFilters = (0, import_react8.useCallback)(() => {
    throttledSearchChange("");
    setCityFilter("");
    setStateFilter("");
    setCountryFilter("");
    setIdTypeFilter("all");
    setStatusFilter("all");
    handlePageChange(1);
  }, [throttledSearchChange, handlePageChange]);
  const handlePageChangeWithFetch = (0, import_react8.useCallback)((page) => {
    handlePageChange(page);
    fetchCustomers(page, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter);
  }, [handlePageChange, fetchCustomers, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter]);
  const handleCustomerCreated = (0, import_react8.useCallback)(async (customerData) => {
    try {
      const customerInput = {
        ...customerData,
        merchantId: 1
        // TODO: Get from user context or props
      };
      const response = await import_utils4.customersApi.createCustomer(customerInput);
      if (response.success) {
        setShowCreateForm(false);
        fetchCustomers();
      } else {
        throw new Error(response.error || "Failed to create customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }, [fetchCustomers]);
  const handleCustomerUpdatedAsync = (0, import_react8.useCallback)(async (customerData) => {
    if (!selectedCustomer) return;
    try {
      const response = await import_utils4.customersApi.updateCustomer(selectedCustomer.id, customerData);
      if (response.success) {
        setShowEditDialog(false);
        fetchCustomers();
      } else {
        throw new Error(response.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }, [selectedCustomer, fetchCustomers]);
  return {
    // State
    customers,
    loading,
    searchTerm,
    cityFilter,
    stateFilter,
    countryFilter,
    idTypeFilter,
    statusFilter,
    selectedCustomer,
    showCustomerDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    // Actions
    setSearchTerm: throttledSearchChange,
    // Use throttled search for better performance
    setCityFilter,
    setStateFilter,
    setCountryFilter,
    setIdTypeFilter,
    setStatusFilter,
    setSelectedCustomer,
    setShowCustomerDetail,
    setShowCreateForm,
    setShowEditDialog,
    // Handlers
    fetchCustomers,
    handleViewCustomer,
    handleEditCustomer,
    handleToggleStatus,
    handleCustomerUpdated,
    handleCustomerError,
    handleCustomerRowAction,
    handleAddCustomer,
    handleExportCustomers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleCustomerCreated,
    handleCustomerUpdatedAsync,
    // Computed values
    filteredCustomers,
    filters,
    stats
  };
};

// src/hooks/useOrderManagement.ts
var import_react9 = require("react");
var import_utils5 = require("@rentalshop/utils");
var import_constants3 = require("@rentalshop/constants");
function useOrderManagement(options = {}) {
  const {
    initialLimit = import_constants3.PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchOrders = true,
    enableStats = false,
    merchantId,
    outletId
  } = options;
  const [orders, setOrders] = (0, import_react9.useState)([]);
  const [loading, setLoading] = (0, import_react9.useState)(true);
  const [searchTerm, setSearchTerm] = (0, import_react9.useState)("");
  const [statusFilter, setStatusFilter] = (0, import_react9.useState)("all");
  const [orderTypeFilter, setOrderTypeFilter] = (0, import_react9.useState)("all");
  const [outletFilter, setOutletFilter] = (0, import_react9.useState)("all");
  const [dateRangeFilter, setDateRangeFilter] = (0, import_react9.useState)({ start: "", end: "" });
  const [sortBy, setSortBy] = (0, import_react9.useState)("createdAt");
  const [sortOrder, setSortOrder] = (0, import_react9.useState)("desc");
  const [selectedOrder, setSelectedOrder] = (0, import_react9.useState)(null);
  const [showOrderDetail, setShowOrderDetail] = (0, import_react9.useState)(false);
  const [showCreateForm, setShowCreateForm] = (0, import_react9.useState)(false);
  const [showEditDialog, setShowEditDialog] = (0, import_react9.useState)(false);
  const [stats, setStats] = (0, import_react9.useState)(null);
  const { pagination, handlePageChange: paginationPageChange, updatePaginationFromResponse } = usePagination({
    initialLimit,
    initialOffset: 0
  });
  const { handleSearchChange: throttledSearchChange } = useThrottledSearch({
    minLength: 0,
    delay: 300,
    onSearch: (query) => {
      fetchOrders(1, query, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
    }
  });
  const fetchOrders = (0, import_react9.useCallback)(async (page = 1, searchQuery = "", status = "all", orderType = "all", outlet = "all", dateRange = { start: "", end: "" }, sortByParam = "createdAt", sortOrderParam = "desc") => {
    try {
      setLoading(true);
      let response;
      if (useSearchOrders) {
        const filters = {
          search: searchQuery || void 0,
          status: status !== "all" ? status : void 0,
          orderType: orderType !== "all" ? orderType : void 0,
          outletId: outlet !== "all" ? parseInt(outlet) : void 0,
          startDate: dateRange.start || void 0,
          endDate: dateRange.end || void 0,
          // Add pagination parameters
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          page
        };
        console.log("\u{1F50D} fetchOrders - Calling API with filters:", {
          outletParam: outlet,
          outletId: filters.outletId,
          status: filters.status,
          orderType: filters.orderType
        });
        response = await import_utils5.ordersApi.searchOrders(filters);
      } else {
        response = await import_utils5.ordersApi.getOrdersPaginated(page, pagination.limit);
      }
      if (response.success && response.data) {
        let ordersData;
        let total;
        let totalPagesCount;
        if (Array.isArray(response.data)) {
          ordersData = response.data;
          total = response.data.length;
          totalPagesCount = 1;
        } else if (response.data.orders) {
          ordersData = response.data.orders;
          total = response.data.total || 0;
          totalPagesCount = response.data.totalPages || 1;
        } else {
          ordersData = [];
          total = 0;
          totalPagesCount = 1;
        }
        setOrders(ordersData);
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, useSearchOrders, updatePaginationFromResponse]);
  const fetchStats = (0, import_react9.useCallback)(async () => {
    if (!enableStats) return;
    try {
      console.log("Fetching order stats...");
      const response = await import_utils5.ordersApi.getOrderStats();
      console.log("Order stats response:", response);
      if (response.success && response.data) {
        console.log("Setting stats:", response.data);
        setStats(response.data);
      } else {
        console.error("Stats API failed:", response);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [enableStats]);
  (0, import_react9.useEffect)(() => {
    fetchOrders(1, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);
  (0, import_react9.useEffect)(() => {
    if (enableStats) {
      fetchStats();
    }
  }, [enableStats, fetchStats]);
  const handleViewOrder = (0, import_react9.useCallback)((order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  }, []);
  const handleEditOrder = (0, import_react9.useCallback)((order) => {
    setSelectedOrder(order);
    setShowEditDialog(true);
  }, []);
  const handlePickupOrder = (0, import_react9.useCallback)(async (orderId) => {
    try {
      const response = await import_utils5.ordersApi.pickupOrder(orderId);
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || "Failed to pickup order");
      }
    } catch (error) {
      console.error("Error picking up order:", error);
      return { success: false, error: error.message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);
  const handleReturnOrder = (0, import_react9.useCallback)(async (orderId) => {
    try {
      const response = await import_utils5.ordersApi.returnOrder(orderId);
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || "Failed to return order");
      }
    } catch (error) {
      console.error("Error returning order:", error);
      return { success: false, error: error.message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);
  const handleCancelOrder = (0, import_react9.useCallback)(async (orderId) => {
    try {
      const response = await import_utils5.ordersApi.cancelOrder(orderId);
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      return { success: false, error: error.message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);
  const handlePageChange = (0, import_react9.useCallback)((page) => {
    paginationPageChange(page);
    fetchOrders(page, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [paginationPageChange, fetchOrders, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);
  const handleSearchChange = (0, import_react9.useCallback)((searchValue) => {
    setSearchTerm(searchValue);
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);
  const handleFiltersChange = (0, import_react9.useCallback)((newFilters) => {
    console.log("\u{1F527} handleFiltersChange called with:", newFilters);
    if ("status" in newFilters) {
      const statusValue = newFilters.status;
      const newStatusFilter = statusValue === void 0 || statusValue === "all" ? "all" : Array.isArray(newFilters.status) ? newFilters.status[0] : newFilters.status;
      console.log("\u{1F527} Setting statusFilter:", newStatusFilter);
      setStatusFilter(newStatusFilter);
    }
    if ("orderType" in newFilters) {
      const orderTypeValue = newFilters.orderType;
      const newOrderTypeFilter = orderTypeValue === void 0 || orderTypeValue === "all" ? "all" : newFilters.orderType;
      console.log("\u{1F527} Setting orderTypeFilter:", newOrderTypeFilter);
      setOrderTypeFilter(newOrderTypeFilter);
    }
    if ("outletId" in newFilters) {
      const outletIdValue = newFilters.outletId;
      const newOutletFilter = outletIdValue === void 0 || outletIdValue === "all" || outletIdValue === null ? "all" : newFilters.outletId?.toString() || "all";
      console.log("\u{1F527} Setting outletFilter:", newOutletFilter, "from:", newFilters.outletId);
      setOutletFilter(newOutletFilter);
    }
    if (newFilters.startDate !== void 0 || newFilters.endDate !== void 0) {
      setDateRangeFilter({
        start: newFilters.startDate?.toString() || "",
        end: newFilters.endDate?.toString() || ""
      });
    }
    if (newFilters.sortBy !== void 0) {
      setSortBy(newFilters.sortBy);
    }
    if (newFilters.sortOrder !== void 0) {
      setSortOrder(newFilters.sortOrder);
    }
  }, []);
  const handleClearFilters = (0, import_react9.useCallback)(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setOutletFilter("all");
    setDateRangeFilter({ start: "", end: "" });
    setSortBy("createdAt");
    setSortOrder("desc");
    throttledSearchChange("");
    paginationPageChange(1);
  }, [throttledSearchChange, paginationPageChange]);
  const handleSort = (0, import_react9.useCallback)((column) => {
    const columnMapping = {
      "orderNumber": "orderNumber",
      "customerName": "customerName",
      "orderType": "orderType",
      "status": "status",
      "totalAmount": "totalAmount",
      "pickupPlanAt": "pickupPlanAt",
      "returnPlanAt": "returnPlanAt",
      "createdAt": "createdAt"
    };
    const newSortBy = columnMapping[column] || "createdAt";
    const newSortOrder = sortBy === newSortBy && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    paginationPageChange(1);
  }, [sortBy, sortOrder, paginationPageChange]);
  const refreshOrders = (0, import_react9.useCallback)(async () => {
    await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [fetchOrders, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);
  const refreshStats = (0, import_react9.useCallback)(async () => {
    if (enableStats) {
      await fetchStats();
    }
  }, [fetchStats, enableStats]);
  return {
    // State
    orders,
    loading,
    searchTerm,
    statusFilter,
    orderTypeFilter,
    outletFilter,
    dateRangeFilter,
    sortBy,
    sortOrder,
    selectedOrder,
    showOrderDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    stats,
    // Actions
    setSearchTerm: throttledSearchChange,
    setStatusFilter,
    setOrderTypeFilter,
    setOutletFilter,
    setDateRangeFilter,
    setSortBy,
    setSortOrder,
    setSelectedOrder,
    setShowOrderDetail,
    setShowCreateForm,
    setShowEditDialog,
    // Handlers
    fetchOrders,
    handleViewOrder,
    handleEditOrder,
    handlePickupOrder,
    handleReturnOrder,
    handleCancelOrder,
    handlePageChange,
    handleSearchChange,
    handleFiltersChange,
    handleClearFilters,
    handleSort,
    refreshOrders,
    refreshStats
  };
}

// src/hooks/useProductAvailability.ts
var import_react10 = require("react");
function useProductAvailability() {
  const calculateAvailability = (0, import_react10.useCallback)((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const pickup = new Date(pickupDate);
    const return_ = new Date(returnDate);
    if (pickup >= return_) {
      return {
        available: false,
        availableQuantity: 0,
        conflicts: [],
        message: "Return date must be after pickup date"
      };
    }
    const conflicts = existingOrders.filter((order) => {
      if (order.orderType !== "RENT") return false;
      const activeStatuses = ["RESERVED", "PICKUPED"];
      if (!activeStatuses.includes(order.status)) return false;
      const hasProduct = order.orderItems.some((item) => item.productId === product.id);
      if (!hasProduct) return false;
      const orderPickup = new Date(order.pickupPlanAt);
      const orderReturn = new Date(order.returnPlanAt);
      return pickup <= orderReturn && return_ >= orderPickup || orderPickup <= return_ && orderReturn >= pickup;
    });
    const conflictingQuantity = conflicts.reduce((total, order) => {
      const orderItem = order.orderItems.find((item) => item.productId === product.id);
      return total + (orderItem?.quantity || 0);
    }, 0);
    const availableQuantity = Math.max(0, product.available - conflictingQuantity);
    const available = availableQuantity >= requestedQuantity;
    let message = "";
    if (available) {
      message = `Available: ${availableQuantity} units`;
    } else {
      message = `Only ${availableQuantity} units available (requested: ${requestedQuantity})`;
    }
    return {
      available,
      availableQuantity,
      conflicts,
      message
    };
  }, []);
  const isProductAvailable = (0, import_react10.useCallback)((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const status = calculateAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders);
    return status.available;
  }, [calculateAvailability]);
  const getAvailabilityForDateRange = (0, import_react10.useCallback)((product, startDate, endDate, existingOrders = []) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split("T")[0];
      const status = calculateAvailability(
        product,
        dateStr,
        dateStr,
        1,
        existingOrders
      );
      results.push({
        date: dateStr,
        available: status.availableQuantity,
        conflicts: status.conflicts
      });
    }
    return results;
  }, [calculateAvailability]);
  return {
    calculateAvailability,
    isProductAvailable,
    getAvailabilityForDateRange
  };
}

// src/hooks/useProductManagement.ts
var import_react12 = require("react");

// src/hooks/useToast.ts
var import_react11 = require("react");
var import_utils6 = require("@rentalshop/utils");
var import_ui = require("@rentalshop/ui");
var useErrorHandler = (options = {}) => {
  const {
    onLogin,
    onRetry,
    onDismiss,
    autoHandleAuth = true
  } = options;
  const [isLoading, setIsLoading] = (0, import_react11.useState)(false);
  const { addToast } = (0, import_ui.useToasts)();
  const handleError = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils6.analyzeError)(error);
    return errorInfo;
  }, []);
  const showErrorToast = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils6.analyzeError)(error);
    const toastType = (0, import_utils6.getToastType)(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
  }, [addToast]);
  const handleApiCall = (0, import_react11.useCallback)(async (apiCall) => {
    setIsLoading(true);
    try {
      const result = await (0, import_utils6.withErrorHandlingForUI)(apiCall);
      if (result.error) {
        showErrorToast(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);
  const retry = (0, import_react11.useCallback)(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);
  const login = (0, import_react11.useCallback)(() => {
    if (onLogin) {
      onLogin();
    } else if (typeof window !== "undefined") {
    }
  }, [onLogin]);
  return {
    isLoading,
    handleError,
    handleApiCall,
    retry,
    login,
    showErrorToast
  };
};
var useSimpleErrorHandler = () => {
  const { addToast } = (0, import_ui.useToasts)();
  const handleError = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils6.analyzeError)(error);
    const toastType = (0, import_utils6.getToastType)(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);
  return {
    handleError
  };
};
var useToastHandler = () => {
  const { addToast } = (0, import_ui.useToasts)();
  const showError = (0, import_react11.useCallback)((title, message) => {
    addToast("error", title, message, 0);
  }, [addToast]);
  const showSuccess = (0, import_react11.useCallback)((title, message) => {
    addToast("success", title, message, 5e3);
  }, [addToast]);
  const showWarning = (0, import_react11.useCallback)((title, message) => {
    addToast("warning", title, message, 5e3);
  }, [addToast]);
  const showInfo = (0, import_react11.useCallback)((title, message) => {
    addToast("info", title, message, 5e3);
  }, [addToast]);
  const handleError = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils6.analyzeError)(error);
    const toastType = (0, import_utils6.getToastType)(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);
  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    handleError
  };
};

// src/hooks/useProductManagement.ts
var import_utils7 = require("@rentalshop/utils");
var import_constants4 = require("@rentalshop/constants");
var useProductManagement = (options = {}) => {
  const {
    initialLimit = import_constants4.PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchProducts = false,
    enableStats = false,
    merchantId,
    outletId
  } = options;
  const { handleError } = useSimpleErrorHandler();
  const [products, setProducts] = (0, import_react12.useState)([]);
  const [loading, setLoading] = (0, import_react12.useState)(true);
  const [categoryFilter, setCategoryFilter] = (0, import_react12.useState)("all");
  const [outletFilter, setOutletFilter] = (0, import_react12.useState)("all");
  const [availabilityFilter, setAvailabilityFilter] = (0, import_react12.useState)("all");
  const [statusFilter, setStatusFilter] = (0, import_react12.useState)("all");
  const [selectedProduct, setSelectedProduct] = (0, import_react12.useState)(null);
  const [showProductDetail, setShowProductDetail] = (0, import_react12.useState)(false);
  const [showCreateForm, setShowCreateForm] = (0, import_react12.useState)(false);
  const [showEditDialog, setShowEditDialog] = (0, import_react12.useState)(false);
  const [showOrdersDialog, setShowOrdersDialog] = (0, import_react12.useState)(false);
  const [showDeleteDialog, setShowDeleteDialog] = (0, import_react12.useState)(false);
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });
  const { query: searchTerm, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 300,
    minLength: 0,
    onSearch: (query) => {
      fetchProducts(1, query, categoryFilter, outletFilter, availabilityFilter, statusFilter);
    }
  });
  const fetchProducts = (0, import_react12.useCallback)(async (page = pagination.currentPage, searchQuery = "", category = "all", outlet = "all", availability = "all", status = "all") => {
    try {
      setLoading(true);
      let response;
      if (useSearchProducts) {
        const filters2 = {
          search: searchQuery || void 0,
          categoryId: category !== "all" ? parseInt(category) : void 0,
          outletId: outlet !== "all" ? parseInt(outlet) : void 0,
          available: availability === "in-stock" ? true : availability === "out-of-stock" ? false : void 0,
          status: status !== "all" ? status : void 0,
          // Add pagination parameters
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          page
        };
        if (merchantId) {
          response = await import_utils7.productsApi.searchMerchantProducts(merchantId, filters2);
        } else {
          response = await import_utils7.productsApi.searchProducts(filters2);
        }
      } else {
        response = await import_utils7.productsApi.getProductsPaginated(page, pagination.limit);
      }
      if (response.success && response.data) {
        let productsData;
        let total;
        let totalPagesCount;
        if (Array.isArray(response.data)) {
          productsData = response.data;
          total = response.data.length;
          totalPagesCount = 1;
        } else if (response.data.products) {
          productsData = response.data.products;
          total = response.data.total || 0;
          totalPagesCount = response.data.totalPages || 1;
        } else {
          productsData = [];
          total = 0;
          totalPagesCount = 1;
        }
        setProducts(productsData);
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      } else if ((0, import_utils7.isErrorResponse)(response)) {
        console.error("API Error:", response.message);
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, useSearchProducts, updatePaginationFromResponse, merchantId]);
  (0, import_react12.useEffect)(() => {
    const timeoutId = setTimeout(() => {
      handlePageChange(1);
      fetchProducts(1, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [categoryFilter, outletFilter, availabilityFilter, statusFilter, handlePageChange]);
  const filteredProducts = (0, import_react12.useMemo)(() => {
    if (useSearchProducts) {
      return products;
    } else {
      return (products || []).filter((product) => {
        if (!product || typeof product !== "object") {
          return false;
        }
        const matchesSearch = (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (product.description || "").toLowerCase().includes(searchTerm.toLowerCase()) || (product.barcode || "").toLowerCase().includes(searchTerm.toLowerCase());
        const productCategoryId = "category" in product ? product.category?.id : product.categoryId;
        const matchesCategory = categoryFilter === "all" || productCategoryId && productCategoryId.toString() === categoryFilter;
        const productOutletId = "outlet" in product ? product.outlet?.id : void 0;
        const matchesOutlet = outletFilter === "all" || productOutletId && productOutletId.toString() === outletFilter;
        const matchesAvailability = availabilityFilter === "all" || availabilityFilter === "in-stock" && product.available > 0 || availabilityFilter === "out-of-stock" && product.available === 0 || availabilityFilter === "low-stock" && product.available > 0 && product.available < 5;
        const matchesStatus = statusFilter === "all" || statusFilter === "active" && product.isActive || statusFilter === "inactive" && !product.isActive;
        return matchesSearch && matchesCategory && matchesOutlet && matchesAvailability && matchesStatus;
      });
    }
  }, [products, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter, useSearchProducts]);
  const stats = (0, import_react12.useMemo)(() => {
    if (!enableStats) return void 0;
    const productsArray = products || [];
    const totalProducts = productsArray.length;
    const activeProducts = productsArray.filter((p) => p.isActive).length;
    const inactiveProducts = productsArray.filter((p) => !p.isActive).length;
    const inStockProducts = productsArray.filter((p) => p.available > 0).length;
    const outOfStockProducts = productsArray.filter((p) => p.available === 0).length;
    const lowStockProducts = productsArray.filter((p) => p.available > 0 && p.available < 5).length;
    const totalStockValue = productsArray.reduce((sum, product) => {
      const stockValue = product.available * (product.rentPrice || 0);
      return sum + stockValue;
    }, 0);
    const productsWithPrice = productsArray.filter((p) => p.rentPrice && p.rentPrice > 0);
    const averagePrice = productsWithPrice.length > 0 ? productsWithPrice.reduce((sum, p) => sum + (p.rentPrice || 0), 0) / productsWithPrice.length : 0;
    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      inStockProducts,
      outOfStockProducts,
      lowStockProducts,
      totalStockValue,
      averagePrice
    };
  }, [products, enableStats]);
  const filters = (0, import_react12.useMemo)(() => ({
    search: searchTerm,
    categoryId: categoryFilter === "all" ? void 0 : parseInt(categoryFilter),
    available: availabilityFilter === "in-stock" ? true : availabilityFilter === "out-of-stock" ? false : void 0,
    status: statusFilter === "all" ? void 0 : statusFilter
  }), [searchTerm, categoryFilter, availabilityFilter, statusFilter]);
  const handleViewProduct = (0, import_react12.useCallback)(async (product) => {
    try {
      setLoading(true);
      const response = await import_utils7.productsApi.getProduct(product.id);
      if (response.success && response.data) {
        setSelectedProduct(response.data);
        setShowProductDetail(true);
      } else if ((0, import_utils7.isErrorResponse)(response)) {
        console.error("Failed to fetch product details:", response.message);
        setSelectedProduct(product);
        setShowProductDetail(true);
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      setSelectedProduct(product);
      setShowProductDetail(true);
    } finally {
      setLoading(false);
    }
  }, []);
  const handleEditProduct = (0, import_react12.useCallback)((product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  }, []);
  const handleToggleStatus = (0, import_react12.useCallback)(async (product) => {
    try {
      const updateData = {
        id: product.id,
        isActive: !product.isActive
      };
      const response = await import_utils7.productsApi.updateProduct(product.id, updateData);
      if (response.success) {
        fetchProducts();
      } else {
        throw new Error(response.error || "Failed to update product status");
      }
    } catch (error) {
      console.error("Error updating product status:", error);
    }
  }, [fetchProducts]);
  const handleProductUpdated = (0, import_react12.useCallback)((updatedProduct) => {
    setShowEditDialog(false);
    setShowProductDetail(false);
    fetchProducts();
  }, [fetchProducts]);
  const handleProductError = (0, import_react12.useCallback)((error) => {
    console.error("Product operation error:", error);
  }, []);
  const handleProductRowAction = (0, import_react12.useCallback)((action, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    switch (action) {
      case "view":
        handleViewProduct(product);
        break;
      case "view-orders":
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const merchantMatch = currentPath.match(/\/merchants\/(\d+)/);
          if (merchantMatch) {
            const merchantId2 = merchantMatch[1];
            window.location.href = `/merchants/${merchantId2}/products/${productId}/orders`;
          } else {
            window.location.href = `/products/${productId}/orders`;
          }
        }
        break;
      case "edit":
        handleEditProduct(product);
        break;
      case "activate":
      case "deactivate":
        handleToggleStatus(product);
        break;
      case "delete":
        setSelectedProduct(product);
        setShowDeleteDialog(true);
        break;
      default:
        console.log("Unknown action:", action);
    }
  }, [products, handleViewProduct, handleEditProduct, handleToggleStatus]);
  const handleAddProduct = (0, import_react12.useCallback)(() => {
    setShowCreateForm(true);
  }, []);
  const handleExportProducts = (0, import_react12.useCallback)(() => {
    console.log("Export functionality coming soon!");
  }, []);
  const handleFiltersChange = (0, import_react12.useCallback)((newFilters) => {
    setCategoryFilter(newFilters.categoryId?.toString() || "all");
    setOutletFilter(newFilters.outletId?.toString() || "all");
    setAvailabilityFilter(
      newFilters.available === true ? "in-stock" : newFilters.available === false ? "out-of-stock" : "all"
    );
    setStatusFilter(newFilters.status || "all");
    handlePageChange(1);
  }, [handlePageChange]);
  const handleSearchChange = (0, import_react12.useCallback)((searchValue) => {
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);
  const handleClearFilters = (0, import_react12.useCallback)(() => {
    throttledSearchChange("");
    setCategoryFilter("all");
    setOutletFilter("all");
    setAvailabilityFilter("all");
    setStatusFilter("all");
    handlePageChange(1);
  }, [throttledSearchChange, handlePageChange]);
  const handlePageChangeWithFetch = (0, import_react12.useCallback)((page) => {
    handlePageChange(page);
    fetchProducts(page, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter);
  }, [handlePageChange, fetchProducts, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter]);
  const handleProductCreated = (0, import_react12.useCallback)(async (productData) => {
    try {
      const response = await import_utils7.productsApi.createProduct(productData);
      if (response.success) {
        setShowCreateForm(false);
        fetchProducts();
      } else {
        throw new Error(response.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }, [fetchProducts]);
  const handleProductUpdatedAsync = (0, import_react12.useCallback)(async (productData) => {
    if (!selectedProduct) return;
    try {
      const response = await import_utils7.productsApi.updateProduct(selectedProduct.id, productData);
      if (response.success) {
        setShowEditDialog(false);
        fetchProducts();
      } else {
        throw new Error(response.error || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }, [selectedProduct, fetchProducts]);
  const handleDeleteProduct = (0, import_react12.useCallback)(async (productId) => {
    try {
      setLoading(true);
      const response = await import_utils7.productsApi.deleteProduct(productId);
      if (response.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setShowDeleteDialog(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        throw new Error(response.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, handleError]);
  return {
    // State
    products,
    loading,
    searchTerm,
    categoryFilter,
    outletFilter,
    availabilityFilter,
    statusFilter,
    selectedProduct,
    showProductDetail,
    showCreateForm,
    showEditDialog,
    showOrdersDialog,
    showDeleteDialog,
    pagination,
    // Actions
    setSearchTerm: throttledSearchChange,
    // Use throttled search for better performance
    setCategoryFilter,
    setOutletFilter,
    setAvailabilityFilter,
    setStatusFilter,
    setSelectedProduct,
    setShowProductDetail,
    setShowCreateForm,
    setShowEditDialog,
    setShowOrdersDialog,
    setShowDeleteDialog,
    // Handlers
    fetchProducts,
    handleViewProduct,
    handleEditProduct,
    handleToggleStatus,
    handleProductUpdated,
    handleProductError,
    handleProductRowAction,
    handleAddProduct,
    handleExportProducts,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleProductCreated,
    handleProductUpdatedAsync,
    handleDeleteProduct,
    // Computed values
    filteredProducts,
    filters,
    stats
  };
};

// src/hooks/useSubscriptionError.ts
var import_react13 = require("react");
var import_ui2 = require("@rentalshop/ui");
function useSubscriptionError() {
  const [error, setError] = (0, import_react13.useState)(null);
  const { addToast } = (0, import_ui2.useToasts)();
  const handleSubscriptionError = (0, import_react13.useCallback)((error2) => {
    console.error("Subscription error:", error2);
    if (error2?.error === "SUBSCRIPTION_ERROR" || error2?.code === "SUBSCRIPTION_REQUIRED") {
      const subscriptionError = {
        message: error2.message || "Subscription error occurred",
        subscriptionStatus: error2.subscriptionStatus,
        merchantStatus: error2.merchantStatus,
        code: error2.code
      };
      setError(subscriptionError);
      showSubscriptionError(subscriptionError);
    } else {
      addToast("error", "Error", error2?.message || "An error occurred");
    }
  }, [addToast]);
  const showSubscriptionError = (0, import_react13.useCallback)((error2) => {
    const { subscriptionStatus, merchantStatus } = error2;
    let message = error2.message;
    let action = "";
    if (subscriptionStatus === "paused") {
      message = "Your subscription is paused. Some features may be limited.";
      action = "Resume your subscription to access all features.";
    } else if (subscriptionStatus === "expired") {
      message = "Your subscription has expired. Please renew to continue.";
      action = "Choose a new plan to continue using the service.";
    } else if (subscriptionStatus === "cancelled") {
      message = "Your subscription has been cancelled.";
      action = "Choose a new plan to reactivate your account.";
    } else if (subscriptionStatus === "past_due") {
      message = "Payment is past due. Please update your payment method.";
      action = "Update your payment information to avoid service interruption.";
    } else if (merchantStatus && !["active"].includes(merchantStatus)) {
      message = `Your merchant account is ${merchantStatus}. Please contact support.`;
      action = "Contact support to resolve account issues.";
    }
    addToast("error", "Subscription Error", action ? `${message}

${action}` : message, 8e3);
  }, [addToast]);
  const clearError = (0, import_react13.useCallback)(() => {
    setError(null);
  }, []);
  return {
    handleSubscriptionError,
    showSubscriptionError,
    clearError,
    error
  };
}

// src/hooks/useUserManagement.ts
var import_react14 = require("react");
var import_utils8 = require("@rentalshop/utils");
var import_constants5 = require("@rentalshop/constants");
var useUserManagement = (options = {}) => {
  console.log("\u{1F50D} useUserManagement: Hook called with options:", options);
  const {
    initialLimit = import_constants5.PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchUsers = false,
    enableStats = false
  } = options;
  const { handleError } = useSimpleErrorHandler();
  const [users, setUsers] = (0, import_react14.useState)([]);
  const [loading, setLoading] = (0, import_react14.useState)(true);
  const [roleFilter, setRoleFilter] = (0, import_react14.useState)("all");
  const [statusFilter, setStatusFilter] = (0, import_react14.useState)("all");
  const [selectedUser, setSelectedUser] = (0, import_react14.useState)(null);
  const [showUserDetail, setShowUserDetail] = (0, import_react14.useState)(false);
  const [showCreateForm, setShowCreateForm] = (0, import_react14.useState)(false);
  const [showEditDialog, setShowEditDialog] = (0, import_react14.useState)(false);
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });
  const { query: searchTerm, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 300,
    minLength: 0,
    onSearch: (query) => {
      console.log("\u{1F50D} useUserManagement: onSearch called with query:", query);
      console.log("\u{1F50D} useUserManagement: current filters:", { roleFilter, statusFilter });
      console.log("\u{1F50D} useUserManagement: useSearchUsers flag:", useSearchUsers);
      fetchUsers(1, query, roleFilter, statusFilter);
    }
  });
  console.log("\u{1F50D} useUserManagement: Current state:", {
    usersCount: users.length,
    loading,
    roleFilter,
    statusFilter,
    searchTerm
  });
  const fetchUsers = (0, import_react14.useCallback)(async (page = 1, searchQuery = "", role = "all", status = "all") => {
    console.log("\u{1F50D} useUserManagement: fetchUsers called with params:", { page, searchQuery, role, status });
    console.log("\u{1F50D} useUserManagement: current pagination:", pagination);
    console.log("\u{1F50D} useUserManagement: useSearchUsers flag in fetchUsers:", useSearchUsers);
    try {
      setLoading(true);
      console.log("\u{1F50D} useUserManagement: setLoading(true) called");
      let response;
      if (useSearchUsers) {
        const filters2 = {
          search: searchQuery || void 0,
          role: role !== "all" ? role : void 0,
          status: status !== "all" ? status : void 0,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit
        };
        console.log("\u{1F50D} useUserManagement: Calling searchUsers with filters:", filters2);
        console.log("\u{1F50D} useUserManagement: searchQuery value:", searchQuery);
        console.log("\u{1F50D} useUserManagement: searchQuery type:", typeof searchQuery);
        console.log("\u{1F50D} useUserManagement: searchQuery length:", searchQuery?.length);
        response = await import_utils8.usersApi.searchUsers(filters2);
      } else {
        response = await import_utils8.usersApi.getUsersPaginated(page, pagination.limit);
      }
      if (response.success && response.data) {
        console.log("\u{1F50D} useUserManagement: API response success, data:", response.data);
        let usersData, total, totalPagesCount;
        if (Array.isArray(response.data)) {
          usersData = response.data;
          total = response.pagination?.total || usersData.length;
          totalPagesCount = response.pagination?.totalPages || Math.ceil(total / pagination.limit);
        } else {
          usersData = response.data.users || [];
          total = response.data.total || 0;
          totalPagesCount = response.data.totalPages || 1;
        }
        console.log("\u{1F50D} useUserManagement: setting users data:", {
          usersCount: usersData.length,
          total,
          totalPagesCount,
          responseStructure: Array.isArray(response.data) ? "direct-array" : "nested-object"
        });
        setUsers(usersData);
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      } else {
        console.error("API Error:", response.error);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      console.log("\u{1F50D} useUserManagement: fetchUsers completed, setLoading(false)");
      setLoading(false);
    }
  }, [pagination.limit, useSearchUsers, updatePaginationFromResponse]);
  (0, import_react14.useEffect)(() => {
    console.log("\u{1F50D} useUserManagement: useEffect triggered with dependencies:", { searchTerm, roleFilter, statusFilter });
    const timeoutId = setTimeout(() => {
      console.log("\u{1F50D} useUserManagement: useEffect timeout executing fetchUsers");
      fetchUsers(1, searchTerm, roleFilter, statusFilter);
    }, 300);
    return () => {
      console.log("\u{1F50D} useUserManagement: useEffect cleanup - clearing timeout");
      clearTimeout(timeoutId);
    };
  }, [searchTerm, roleFilter, statusFilter]);
  const filteredUsers = (0, import_react14.useMemo)(() => {
    if (useSearchUsers) {
      return users;
    } else {
      return (users || []).filter((user) => {
        if (!user || typeof user !== "object") {
          return false;
        }
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || user.merchant?.name && user.merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.outlet?.name && user.outlet.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesStatus = statusFilter === "all" || statusFilter === "ACTIVE" && user.isActive || statusFilter === "INACTIVE" && !user.isActive;
        return matchesSearch && matchesRole && matchesStatus;
      });
    }
  }, [users, searchTerm, roleFilter, statusFilter, useSearchUsers]);
  const stats = (0, import_react14.useMemo)(() => {
    if (!enableStats) return void 0;
    const usersArray = users || [];
    const totalUsers = usersArray.length;
    const activeUsers = usersArray.filter((u) => u.isActive).length;
    const inactiveUsers = usersArray.filter((u) => !u.isActive).length;
    const verifiedUsers = usersArray.filter((u) => u.emailVerified).length;
    const unverifiedUsers = usersArray.filter((u) => !u.emailVerified).length;
    return { totalUsers, activeUsers, inactiveUsers, verifiedUsers, unverifiedUsers };
  }, [users, enableStats]);
  const filters = (0, import_react14.useMemo)(() => ({
    search: searchTerm,
    role: roleFilter === "all" ? void 0 : roleFilter,
    status: statusFilter === "all" ? void 0 : statusFilter
  }), [searchTerm, roleFilter, statusFilter]);
  const handleViewUser = (0, import_react14.useCallback)((user) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  }, []);
  const handleEditUser = (0, import_react14.useCallback)((user) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  }, []);
  const handleToggleStatus = (0, import_react14.useCallback)(async (user) => {
    try {
      const response = user.isActive ? await import_utils8.usersApi.deactivateUserByPublicId(user.id) : await import_utils8.usersApi.activateUserByPublicId(user.id);
      if (response.success) {
        fetchUsers();
      } else {
        throw new Error(response.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  }, [fetchUsers]);
  const handleUserUpdated = (0, import_react14.useCallback)((updatedUser) => {
    setShowEditDialog(false);
    setShowUserDetail(false);
    fetchUsers();
  }, [fetchUsers]);
  const handleUserError = (0, import_react14.useCallback)((error) => {
    console.error("User operation error:", error);
  }, []);
  const handleUserRowAction = (0, import_react14.useCallback)((action, userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    switch (action) {
      case "view":
        handleViewUser(user);
        break;
      case "edit":
        handleEditUser(user);
        break;
      case "activate":
      case "deactivate":
        handleToggleStatus(user);
        break;
      default:
        console.log("Unknown action:", action);
    }
  }, [users, handleViewUser, handleEditUser, handleToggleStatus]);
  const handleAddUser = (0, import_react14.useCallback)(() => {
    setShowCreateForm(true);
  }, []);
  const handleExportUsers = (0, import_react14.useCallback)(() => {
    console.log("Export functionality coming soon!");
  }, []);
  const handleFiltersChange = (0, import_react14.useCallback)((newFilters) => {
    setRoleFilter(newFilters.role || "all");
    setStatusFilter(newFilters.status || "all");
    handlePageChange(1);
  }, [handlePageChange]);
  const handleSearchChange = (0, import_react14.useCallback)((searchValue) => {
    console.log("\u{1F50D} useUserManagement: handleSearchChange called with:", searchValue);
    console.log("\u{1F50D} useUserManagement: throttledSearchChange function:", typeof throttledSearchChange);
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);
  const handleClearFilters = (0, import_react14.useCallback)(() => {
    throttledSearchChange("");
    setRoleFilter("all");
    setStatusFilter("all");
    handlePageChange(1);
  }, [throttledSearchChange, handlePageChange]);
  const handlePageChangeWithFetch = (0, import_react14.useCallback)((page) => {
    handlePageChange(page);
    fetchUsers(page, searchTerm, roleFilter, statusFilter);
  }, [handlePageChange, fetchUsers, searchTerm, roleFilter, statusFilter]);
  const handleUserCreated = (0, import_react14.useCallback)(async (userData) => {
    try {
      const response = await import_utils8.usersApi.createUser(userData);
      if (response.success) {
        setShowCreateForm(false);
        fetchUsers();
      } else {
        throw new Error(response.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }, [fetchUsers]);
  const handleUserUpdatedAsync = (0, import_react14.useCallback)(async (userData) => {
    if (!selectedUser) return;
    try {
      const response = await import_utils8.usersApi.updateUserByPublicId(selectedUser.id, userData);
      if (response.success) {
        setShowEditDialog(false);
        fetchUsers();
      } else {
        throw new Error(response.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }, [selectedUser, fetchUsers]);
  return {
    // State
    users,
    loading,
    searchTerm,
    roleFilter,
    statusFilter,
    selectedUser,
    showUserDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    // Actions
    setSearchTerm: throttledSearchChange,
    // Use throttled search for better performance
    setRoleFilter,
    setStatusFilter,
    setSelectedUser,
    setShowUserDetail,
    setShowCreateForm,
    setShowEditDialog,
    // Handlers
    fetchUsers,
    handleViewUser,
    handleEditUser,
    handleToggleStatus,
    handleUserUpdated,
    handleUserError,
    handleUserRowAction,
    handleAddUser,
    handleExportUsers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleUserCreated,
    handleUserUpdatedAsync,
    // Computed values
    filteredUsers,
    filters,
    stats
  };
};

// src/hooks/useUserRole.ts
function useUserRole() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isAdmin: role === "ADMIN",
    isMerchant: role === "MERCHANT",
    isOutletAdmin: role === "OUTLET_ADMIN",
    isOutletStaff: role === "OUTLET_STAFF",
    // Permission checks
    canManageUsers: role === "ADMIN" || role === "MERCHANT" || role === "OUTLET_ADMIN",
    canManageProducts: role === "ADMIN" || role === "MERCHANT" || role === "OUTLET_ADMIN",
    canManageCategories: role === "ADMIN" || role === "MERCHANT",
    canManageOutlets: role === "ADMIN" || role === "MERCHANT",
    canManageSubscriptions: role === "ADMIN" || role === "MERCHANT",
    canViewBilling: role === "ADMIN" || role === "MERCHANT",
    canExportData: role === "ADMIN" || role === "MERCHANT"
  };
}
function useCanManageProducts() {
  const { canManageProducts } = useUserRole();
  return canManageProducts;
}
function useCanManageCategories() {
  const { canManageCategories } = useUserRole();
  return canManageCategories;
}
function useCanManageUsers() {
  const { canManageUsers } = useUserRole();
  return canManageUsers;
}
function useCanManageOutlets() {
  const { canManageOutlets } = useUserRole();
  return canManageOutlets;
}
function useCanManageSubscriptions() {
  const { canManageSubscriptions } = useUserRole();
  return canManageSubscriptions;
}
function useCanViewBilling() {
  const { canViewBilling } = useUserRole();
  return canViewBilling;
}
function useCanExportData() {
  const { canExportData } = useUserRole();
  return canExportData;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CurrencyProvider,
  useAuth,
  useAuthErrorHandler,
  useCanExportData,
  useCanManageCategories,
  useCanManageOutlets,
  useCanManageProducts,
  useCanManageSubscriptions,
  useCanManageUsers,
  useCanPerform,
  useCanViewBilling,
  useCurrency,
  useCustomerManagement,
  useErrorHandler,
  useOrderManagement,
  usePagination,
  useProductAvailability,
  useProductManagement,
  useSimpleErrorHandler,
  useSubscriptionError,
  useSubscriptionStatusInfo,
  useThrottledSearch,
  useToastHandler,
  useUserManagement,
  useUserRole
});
//# sourceMappingURL=index.js.map