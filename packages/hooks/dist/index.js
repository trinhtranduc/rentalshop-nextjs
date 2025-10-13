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
var src_exports = {};
__export(src_exports, {
  CurrencyProvider: () => CurrencyProvider,
  clearApiCache: () => clearApiCache,
  getApiCacheStats: () => getApiCacheStats,
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
  useCategoriesData: () => useCategoriesData,
  useCategoriesWithFilters: () => useCategoriesWithFilters,
  useCurrency: () => useCurrency,
  useCustomersData: () => useCustomersData,
  useDedupedApi: () => useDedupedApi,
  useErrorHandler: () => useErrorHandler,
  useMerchantsData: () => useMerchantsData,
  useOptimisticNavigation: () => useOptimisticNavigation,
  useOrdersData: () => useOrdersData,
  useOutletsData: () => useOutletsData,
  useOutletsWithFilters: () => useOutletsWithFilters,
  usePagination: () => usePagination,
  usePaymentsData: () => usePaymentsData,
  usePlansData: () => usePlansData,
  useProductAvailability: () => useProductAvailability,
  useProductsData: () => useProductsData,
  useSimpleErrorHandler: () => useSimpleErrorHandler,
  useSubscriptionError: () => useSubscriptionError,
  useSubscriptionStatusInfo: () => useSubscriptionStatusInfo,
  useSubscriptionsData: () => useSubscriptionsData,
  useThrottledSearch: () => useThrottledSearch,
  useToastHandler: () => useToastHandler,
  useUserRole: () => useUserRole,
  useUsersData: () => useUsersData
});
module.exports = __toCommonJS(src_exports);

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
      if (!token) {
        setState((prev) => ({ ...prev, user: null, loading: false }));
        return;
      }
      const { apiUrls, authenticatedFetch } = await import("@rentalshop/utils");
      const response = await authenticatedFetch(apiUrls.settings.user);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          localStorage.setItem("user", JSON.stringify(data.data));
          setState((prev) => ({
            ...prev,
            user: data.data,
            loading: false
          }));
        }
      } else if (response.status === 401) {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [logout]);
  (0, import_react.useEffect)(() => {
    const token = (0, import_utils.getAuthToken)();
    const storedUser = (0, import_utils.getStoredUser)();
    if (token && storedUser) {
      setState((prev) => ({
        ...prev,
        user: storedUser,
        loading: false
      }));
    } else {
      setState((prev) => ({ ...prev, user: null, loading: false }));
    }
  }, []);
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
      const { subscriptionsApi: subscriptionsApi2 } = await import("@rentalshop/utils");
      const response = await subscriptionsApi2.getCurrentUserSubscriptionStatus();
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
    if (!user)
      return;
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
    if (from === to)
      return amount;
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

// src/utils/useDedupedApi.ts
var import_react6 = require("react");
var requestCache = /* @__PURE__ */ new Map();
var dataCache = /* @__PURE__ */ new Map();
function useDedupedApi(options) {
  const {
    filters,
    fetchFn,
    enabled = true,
    staleTime = 3e4,
    // 30 seconds
    cacheTime = 3e5,
    // 5 minutes
    refetchOnWindowFocus = false
  } = options;
  const [data, setData] = (0, import_react6.useState)(null);
  const [loading, setLoading] = (0, import_react6.useState)(true);
  const [error, setError] = (0, import_react6.useState)(null);
  const [isStale, setIsStale] = (0, import_react6.useState)(false);
  const fetchIdRef = (0, import_react6.useRef)(0);
  const filtersRef = (0, import_react6.useRef)("");
  const cacheKey = JSON.stringify(filters);
  (0, import_react6.useEffect)(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (cacheKey === filtersRef.current && data !== null) {
      console.log("\u{1F50D} useDedupedApi: Filters unchanged, skipping fetch");
      return;
    }
    filtersRef.current = cacheKey;
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    console.log(`\u{1F50D} Fetch #${currentFetchId}: Starting...`);
    const cached = dataCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      const isCacheStale = now - cached.timestamp > cached.staleTime;
      if (!isCacheStale) {
        console.log(`\u2705 Fetch #${currentFetchId}: Cache HIT (fresh)`);
        setData(cached.data);
        setLoading(false);
        setError(null);
        setIsStale(false);
        return;
      } else {
        console.log(`\u23F0 Fetch #${currentFetchId}: Cache HIT (stale) - showing stale data`);
        setData(cached.data);
        setIsStale(true);
      }
    }
    const existingRequest = requestCache.get(cacheKey);
    if (existingRequest) {
      console.log(`\u{1F504} Fetch #${currentFetchId}: DEDUPLICATION - waiting for existing request`);
      existingRequest.then((result) => {
        if (currentFetchId === fetchIdRef.current) {
          setData(result);
          setLoading(false);
          setError(null);
          setIsStale(false);
          console.log(`\u2705 Fetch #${currentFetchId}: Got deduplicated result`);
        } else {
          console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring`);
        }
      }).catch((err) => {
        if (currentFetchId === fetchIdRef.current) {
          const error2 = err instanceof Error ? err : new Error("Unknown error");
          setError(error2);
          setLoading(false);
          console.error(`\u274C Fetch #${currentFetchId}: Dedup ERROR:`, error2);
        }
      });
      return;
    }
    setLoading(true);
    setError(null);
    const requestPromise = fetchFn(filters);
    requestCache.set(cacheKey, requestPromise);
    requestPromise.then((result) => {
      if (currentFetchId !== fetchIdRef.current) {
        console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring result`);
        return;
      }
      console.log(`\u2705 Fetch #${currentFetchId}: SUCCESS - caching data`);
      dataCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        staleTime
      });
      const now = Date.now();
      for (const [key, cached2] of dataCache.entries()) {
        if (now - cached2.timestamp > cacheTime) {
          dataCache.delete(key);
          console.log(`\u{1F9F9} Cleaned up old cache entry: ${key}`);
        }
      }
      setData(result);
      setError(null);
      setIsStale(false);
      setLoading(false);
    }).catch((err) => {
      if (currentFetchId !== fetchIdRef.current) {
        console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring error`);
        return;
      }
      const error2 = err instanceof Error ? err : new Error("Unknown error");
      setError(error2);
      setLoading(false);
      console.error(`\u274C Fetch #${currentFetchId}: ERROR:`, error2);
    }).finally(() => {
      requestCache.delete(cacheKey);
    });
  }, [cacheKey, enabled, fetchFn, staleTime, cacheTime]);
  (0, import_react6.useEffect)(() => {
    if (!refetchOnWindowFocus || !enabled)
      return;
    const handleFocus = () => {
      const cached = dataCache.get(cacheKey);
      if (!cached)
        return;
      const now = Date.now();
      const isCacheStale = now - cached.timestamp > cached.staleTime;
      if (isCacheStale) {
        console.log("\u{1F504} Window focus: Refetching stale data");
        filtersRef.current = "";
        fetchIdRef.current += 1;
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchOnWindowFocus, enabled, cacheKey, staleTime]);
  const refetch = (0, import_react6.useCallback)(async () => {
    if (!enabled)
      return;
    console.log("\u{1F504} Manual refetch triggered");
    dataCache.delete(cacheKey);
    filtersRef.current = "";
    fetchIdRef.current += 1;
  }, [enabled, cacheKey]);
  return {
    data,
    loading,
    error,
    refetch,
    isStale
  };
}
function clearApiCache() {
  requestCache.clear();
  dataCache.clear();
  console.log("\u{1F9F9} API Cache cleared");
}
function getApiCacheStats() {
  return {
    requestCacheSize: requestCache.size,
    dataCacheSize: dataCache.size,
    cacheKeys: Array.from(dataCache.keys())
  };
}

// src/hooks/useCustomersData.ts
var import_utils4 = require("@rentalshop/utils");
function useCustomersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F465} useCustomersData: Fetching with filters:", filters2);
      const response = await import_utils4.customersApi.searchCustomers(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch customers");
      }
      const apiData = response.data;
      const transformed = {
        customers: apiData.customers || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useCustomersData: Success:", {
        customersCount: transformed.customers.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useMerchantsData.ts
var import_utils5 = require("@rentalshop/utils");
function useMerchantsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F3E2} useMerchantsData: Fetching with filters:", filters2);
      const response = await import_utils5.merchantsApi.getMerchants();
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch merchants");
      }
      const apiData = response.data;
      const merchantsArray = apiData.merchants || [];
      console.log("\u{1F3E2} useMerchantsData - API Response:", {
        hasData: !!apiData,
        hasMerchantsArray: !!merchantsArray,
        merchantsCount: merchantsArray.length,
        firstMerchant: merchantsArray[0]
      });
      let filteredMerchants = merchantsArray;
      if (filters2.search) {
        const searchLower = filters2.search.toLowerCase();
        filteredMerchants = filteredMerchants.filter(
          (m) => m.name?.toLowerCase().includes(searchLower) || m.email?.toLowerCase().includes(searchLower)
        );
      }
      if (filters2.status && filters2.status !== "all") {
        filteredMerchants = filteredMerchants.filter(
          (m) => filters2.status === "active" ? m.isActive : !m.isActive
        );
      }
      if (filters2.plan && filters2.plan !== "all") {
        filteredMerchants = filteredMerchants.filter(
          (m) => String(m.planId) === filters2.plan
        );
      }
      if (filters2.sortBy) {
        filteredMerchants.sort((a, b) => {
          const aVal = a[filters2.sortBy];
          const bVal = b[filters2.sortBy];
          const order = filters2.sortOrder === "desc" ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      const page = filters2.page || 1;
      const limit = filters2.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);
      const total = filteredMerchants.length;
      const totalPages = Math.ceil(total / limit);
      const transformed = {
        merchants: paginatedMerchants,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
        totalPages
      };
      console.log("\u2705 useMerchantsData: Success:", {
        merchantsCount: transformed.merchants.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useOrdersData.ts
var import_utils6 = require("@rentalshop/utils");
function useOrdersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4E6} useOrdersData: Fetching with filters:", filters2);
      const response = await import_utils6.ordersApi.searchOrders(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch orders");
      }
      const apiData = response.data;
      const transformed = {
        orders: apiData.orders || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useOrdersData: Success:", {
        ordersCount: transformed.orders.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/usePagination.ts
var import_react7 = require("react");
var import_constants = require("@rentalshop/constants");
function usePagination(config = {}) {
  const { initialLimit = import_constants.PAGINATION.DEFAULT_PAGE_SIZE, initialOffset = 0 } = config;
  const [pagination, setPaginationState] = (0, import_react7.useState)({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });
  const setPagination = (0, import_react7.useCallback)((newPagination) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
      currentPage: Math.floor((newPagination.offset ?? prev.offset) / (newPagination.limit ?? prev.limit)) + 1,
      totalPages: Math.ceil((newPagination.total ?? prev.total) / (newPagination.limit ?? prev.limit))
    }));
  }, []);
  const handlePageChange = (0, import_react7.useCallback)((page) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({
      offset: newOffset,
      currentPage: page
    });
  }, [pagination.limit, setPagination]);
  const resetPagination = (0, import_react7.useCallback)(() => {
    setPagination({
      total: 0,
      offset: initialOffset,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    });
  }, [initialOffset, setPagination]);
  const updatePaginationFromResponse = (0, import_react7.useCallback)((response) => {
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

// src/hooks/usePaymentsData.ts
var import_utils7 = require("@rentalshop/utils");
function usePaymentsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4B0} usePaymentsData: Fetching with filters:", filters2);
      const response = await import_utils7.paymentsApi.getPayments();
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch payments");
      }
      const apiData = response.data;
      const paymentsArray = Array.isArray(apiData) ? apiData : apiData.payments || [];
      console.log("\u{1F4B0} usePaymentsData - API Response:", {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        paymentsCount: paymentsArray.length,
        firstPayment: paymentsArray[0]
      });
      let filteredPayments = paymentsArray;
      if (filters2.search) {
        const searchLower = filters2.search.toLowerCase();
        filteredPayments = filteredPayments.filter(
          (p) => p.subscription?.merchant?.name?.toLowerCase().includes(searchLower) || p.invoiceNumber?.toLowerCase().includes(searchLower) || p.transactionId?.toLowerCase().includes(searchLower)
        );
      }
      if (filters2.status && filters2.status !== "all") {
        filteredPayments = filteredPayments.filter(
          (p) => p.status?.toLowerCase() === filters2.status?.toLowerCase()
        );
      }
      if (filters2.dateFilter && filters2.dateFilter !== "all") {
        const now = /* @__PURE__ */ new Date();
        filteredPayments = filteredPayments.filter((p) => {
          const paymentDate = new Date(p.createdAt);
          if (filters2.dateFilter === "today") {
            return now.toDateString() === paymentDate.toDateString();
          } else if (filters2.dateFilter === "this_month") {
            return now.getMonth() === paymentDate.getMonth() && now.getFullYear() === paymentDate.getFullYear();
          } else if (filters2.dateFilter === "this_year") {
            return now.getFullYear() === paymentDate.getFullYear();
          }
          return true;
        });
      }
      if (filters2.sortBy) {
        filteredPayments.sort((a, b) => {
          const aVal = a[filters2.sortBy];
          const bVal = b[filters2.sortBy];
          const order = filters2.sortOrder === "desc" ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      const page = filters2.page || 1;
      const limit = filters2.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
      const total = filteredPayments.length;
      const totalPages = Math.ceil(total / limit);
      const transformed = {
        payments: paginatedPayments,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
        totalPages
      };
      console.log("\u2705 usePaymentsData: Success:", {
        paymentsCount: transformed.payments.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/usePlansData.ts
var import_utils8 = require("@rentalshop/utils");
function usePlansData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4CB} usePlansData: Fetching with filters:", filters2);
      const response = await import_utils8.plansApi.getPlans();
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch plans");
      }
      const apiData = response.data;
      const plansArray = Array.isArray(apiData) ? apiData : apiData.plans || [];
      console.log("\u{1F4CB} usePlansData - API Response:", {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        plansCount: plansArray.length,
        firstPlan: plansArray[0]
      });
      let filteredPlans = plansArray;
      if (filters2.search) {
        const searchLower = filters2.search.toLowerCase();
        filteredPlans = filteredPlans.filter(
          (p) => p.name?.toLowerCase().includes(searchLower) || p.description?.toLowerCase().includes(searchLower)
        );
      }
      if (filters2.status && filters2.status !== "all") {
        filteredPlans = filteredPlans.filter(
          (p) => filters2.status === "active" ? p.isActive : !p.isActive
        );
      }
      if (filters2.sortBy) {
        filteredPlans.sort((a, b) => {
          const aVal = a[filters2.sortBy];
          const bVal = b[filters2.sortBy];
          const order = filters2.sortOrder === "desc" ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      const page = filters2.page || 1;
      const limit = filters2.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPlans = filteredPlans.slice(startIndex, endIndex);
      const total = filteredPlans.length;
      const totalPages = Math.ceil(total / limit);
      const transformed = {
        plans: paginatedPlans,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
        totalPages
      };
      console.log("\u2705 usePlansData: Success:", {
        plansCount: transformed.plans.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useProductAvailability.ts
var import_react8 = require("react");
function useProductAvailability() {
  const calculateAvailability = (0, import_react8.useCallback)((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
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
      if (order.orderType !== "RENT")
        return false;
      const activeStatuses = ["RESERVED", "PICKUPED"];
      if (!activeStatuses.includes(order.status))
        return false;
      const hasProduct = order.orderItems.some((item) => item.productId === product.id);
      if (!hasProduct)
        return false;
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
  const isProductAvailable = (0, import_react8.useCallback)((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const status = calculateAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders);
    return status.available;
  }, [calculateAvailability]);
  const getAvailabilityForDateRange = (0, import_react8.useCallback)((product, startDate, endDate, existingOrders = []) => {
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

// src/hooks/useProductsData.ts
var import_utils9 = require("@rentalshop/utils");
function useProductsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4E6} useProductsData: Fetching with filters:", filters2);
      const response = await import_utils9.productsApi.searchProducts(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch products");
      }
      const apiData = response.data;
      const transformed = {
        products: apiData.products || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useProductsData: Success:", {
        productsCount: transformed.products.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useSubscriptionsData.ts
var import_utils10 = require("@rentalshop/utils");
function useSubscriptionsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4B3} useSubscriptionsData: Fetching with filters:", filters2);
      const response = await import_utils10.subscriptionsApi.search({
        limit: filters2.limit || 20,
        offset: filters2.offset || (filters2.page ? (filters2.page - 1) * (filters2.limit || 20) : 0)
      });
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch subscriptions");
      }
      const apiData = response.data;
      let subscriptionsArray = [];
      let total = 0;
      console.log("\u{1F4B3} useSubscriptionsData - API Response:", {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        hasDataProperty: apiData && Array.isArray(apiData.data)
      });
      if (Array.isArray(apiData)) {
        subscriptionsArray = apiData;
        total = apiData.length;
      } else if (apiData && Array.isArray(apiData.data)) {
        subscriptionsArray = apiData.data;
        total = apiData.pagination?.total || apiData.data.length;
      } else {
        console.error("Invalid subscriptions data structure:", apiData);
      }
      const page = filters2.page || 1;
      const limit = filters2.limit || 20;
      const totalPages = Math.ceil(total / limit);
      const transformed = {
        subscriptions: subscriptionsArray,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: page < totalPages,
        totalPages
      };
      console.log("\u2705 useSubscriptionsData: Success:", {
        subscriptionsCount: transformed.subscriptions.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useSubscriptionError.ts
var import_react9 = require("react");
var import_ui = require("@rentalshop/ui");
function useSubscriptionError() {
  const [error, setError] = (0, import_react9.useState)(null);
  const { addToast } = (0, import_ui.useToasts)();
  const handleSubscriptionError = (0, import_react9.useCallback)((error2) => {
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
  const showSubscriptionError = (0, import_react9.useCallback)((error2) => {
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
  const clearError = (0, import_react9.useCallback)(() => {
    setError(null);
  }, []);
  return {
    handleSubscriptionError,
    showSubscriptionError,
    clearError,
    error
  };
}

// src/hooks/useThrottledSearch.ts
var import_react10 = require("react");
function useThrottledSearch(options) {
  const { delay, minLength, onSearch } = options;
  const [query, setQuery] = (0, import_react10.useState)("");
  const [isSearching, setIsSearching] = (0, import_react10.useState)(false);
  const timeoutRef = (0, import_react10.useRef)(null);
  const isSearchingRef = (0, import_react10.useRef)(false);
  const isInitialRender = (0, import_react10.useRef)(true);
  const onSearchRef = (0, import_react10.useRef)(onSearch);
  (0, import_react10.useEffect)(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  const handleSearchChange = (0, import_react10.useCallback)((value) => {
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
        onSearchRef.current(value);
        setIsSearching(false);
        isSearchingRef.current = false;
      }, delay);
    } else if (value.length === 0) {
      console.log("\u{1F50D} useThrottledSearch: Query is empty, clearing search");
      setIsSearching(false);
      isSearchingRef.current = false;
      if (!isInitialRender.current) {
        onSearchRef.current("");
      }
    } else {
      console.log("\u{1F50D} useThrottledSearch: Query too short, not searching");
      setIsSearching(false);
      isSearchingRef.current = false;
    }
  }, [delay, minLength]);
  const clearSearch = (0, import_react10.useCallback)(() => {
    setQuery("");
    setIsSearching(false);
    isSearchingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isInitialRender.current) {
      onSearchRef.current("");
    }
  }, []);
  const cleanup = (0, import_react10.useCallback)(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  (0, import_react10.useEffect)(() => {
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

// src/hooks/useToast.ts
var import_react11 = require("react");
var import_utils11 = require("@rentalshop/utils");
var import_ui2 = require("@rentalshop/ui");
var useErrorHandler = (options = {}) => {
  const {
    onLogin,
    onRetry,
    onDismiss,
    autoHandleAuth = true
  } = options;
  const [isLoading, setIsLoading] = (0, import_react11.useState)(false);
  const { addToast } = (0, import_ui2.useToasts)();
  const handleError = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils11.analyzeError)(error);
    return errorInfo;
  }, []);
  const showErrorToast = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils11.analyzeError)(error);
    const toastType = (0, import_utils11.getToastType)(errorInfo.type);
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
      const result = await (0, import_utils11.withErrorHandlingForUI)(apiCall);
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
  const { addToast } = (0, import_ui2.useToasts)();
  const handleError = (0, import_react11.useCallback)((error) => {
    const errorInfo = (0, import_utils11.analyzeError)(error);
    const toastType = (0, import_utils11.getToastType)(errorInfo.type);
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
  const { addToast } = (0, import_ui2.useToasts)();
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
    const errorInfo = (0, import_utils11.analyzeError)(error);
    const toastType = (0, import_utils11.getToastType)(errorInfo.type);
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

// src/hooks/useUsersData.ts
var import_utils12 = require("@rentalshop/utils");
function useUsersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F464} useUsersData: Fetching with filters:", filters2);
      const response = await import_utils12.usersApi.searchUsers(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch users");
      }
      const apiData = response.data;
      let usersData;
      let total;
      let page;
      let limit;
      let hasMore;
      let totalPages;
      if (Array.isArray(apiData)) {
        const pagination = response.pagination || {};
        usersData = apiData;
        total = pagination.total || apiData.length;
        page = pagination.page || 1;
        limit = pagination.limit || 25;
        totalPages = Math.ceil(total / limit);
        hasMore = pagination.hasMore !== void 0 ? pagination.hasMore : page < totalPages;
      } else {
        usersData = apiData.users || [];
        total = apiData.total || 0;
        page = apiData.page || 1;
        limit = apiData.limit || 25;
        totalPages = apiData.totalPages || Math.ceil(total / limit);
        hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : page < totalPages;
      }
      const transformed = {
        users: usersData,
        total,
        page,
        currentPage: page,
        // Alias for compatibility
        limit,
        hasMore,
        totalPages
      };
      console.log("\u2705 useUsersData: Success:", {
        usersCount: transformed.users.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useOptimisticNavigation.ts
var import_navigation = require("next/navigation");
var import_react12 = require("react");
function useOptimisticNavigation(options = {}) {
  const router = (0, import_navigation.useRouter)();
  const [navigatingTo, setNavigatingTo] = (0, import_react12.useState)(null);
  const rafRef = (0, import_react12.useRef)(null);
  const timeoutRef = (0, import_react12.useRef)(null);
  (0, import_react12.useEffect)(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  const navigate = (0, import_react12.useCallback)((path) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    options.onNavigateStart?.(path);
    router.push(path);
    timeoutRef.current = setTimeout(() => {
      setNavigatingTo(null);
      options.onNavigateEnd?.(path);
    }, 100);
  }, [router, options]);
  return {
    navigate,
    navigatingTo,
    isNavigating: navigatingTo !== null
  };
}

// src/hooks/useFiltersData.ts
var import_utils13 = require("@rentalshop/utils");
function useOutletsData() {
  const { data, loading, error } = useDedupedApi({
    filters: {},
    // No filters needed for outlets
    fetchFn: async () => {
      console.log("\u{1F50D} useOutletsData: Fetching outlets...");
      const response = await import_utils13.outletsApi.getOutlets();
      if (response.success && response.data) {
        const outletsData = response.data.outlets || [];
        console.log("\u2705 useOutletsData: Transformed data:", {
          isArray: Array.isArray(outletsData),
          count: outletsData.length
        });
        return { outlets: outletsData };
      }
      throw new Error("Failed to fetch outlets");
    },
    enabled: true,
    staleTime: 3e5,
    // 5 minutes - outlets don't change often
    cacheTime: 6e5,
    // 10 minutes
    refetchOnMount: false,
    // Don't refetch on every mount
    refetchOnWindowFocus: false
  });
  return {
    outlets: data?.outlets || [],
    loading,
    error
  };
}
function useCategoriesData() {
  const { data, loading, error } = useDedupedApi({
    filters: {},
    // No filters needed for categories
    fetchFn: async () => {
      console.log("\u{1F50D} useCategoriesData: Fetching categories...");
      const response = await import_utils13.categoriesApi.getCategories();
      if (response.success && response.data) {
        const categoriesData = Array.isArray(response.data) ? response.data : response.data.categories || [];
        console.log("\u2705 useCategoriesData: Transformed data:", {
          isArray: Array.isArray(categoriesData),
          count: categoriesData.length
        });
        return categoriesData;
      }
      throw new Error("Failed to fetch categories");
    },
    enabled: true,
    staleTime: 3e5,
    // 5 minutes - categories don't change often
    cacheTime: 6e5,
    // 10 minutes
    refetchOnMount: false,
    // Don't refetch on every mount
    refetchOnWindowFocus: false
  });
  return {
    categories: Array.isArray(data) ? data : [],
    loading,
    error
  };
}
function useOutletsWithFilters(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F50D} useOutletsWithFilters: Fetching with filters:", filters2);
      const response = await import_utils13.outletsApi.getOutlets(filters2);
      if (response.success && response.data) {
        const apiData = response.data;
        return {
          outlets: apiData.outlets || [],
          total: apiData.total || 0,
          totalPages: apiData.totalPages || 1,
          currentPage: apiData.page || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      throw new Error("Failed to fetch outlets");
    },
    enabled,
    staleTime: debounceSearch ? 5e3 : 3e4,
    cacheTime: 3e5,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });
  return {
    data,
    loading,
    error,
    refetch
  };
}
function useCategoriesWithFilters(options) {
  const { filters, enabled = true, debounceSearch = false, debounceMs = 0 } = options;
  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F50D} useCategoriesWithFilters: Fetching with filters:", filters2);
      const response = await import_utils13.categoriesApi.searchCategories(filters2);
      if (response.success && response.data) {
        const apiData = response.data;
        return {
          categories: apiData.categories || [],
          total: apiData.total || 0,
          currentPage: apiData.page || 1,
          totalPages: apiData.totalPages || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      throw new Error("Failed to fetch categories");
    },
    enabled,
    staleTime: debounceSearch ? 5e3 : 3e4,
    cacheTime: 3e5,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });
  return {
    data,
    loading,
    error,
    refetch
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CurrencyProvider,
  clearApiCache,
  getApiCacheStats,
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
  useCategoriesData,
  useCategoriesWithFilters,
  useCurrency,
  useCustomersData,
  useDedupedApi,
  useErrorHandler,
  useMerchantsData,
  useOptimisticNavigation,
  useOrdersData,
  useOutletsData,
  useOutletsWithFilters,
  usePagination,
  usePaymentsData,
  usePlansData,
  useProductAvailability,
  useProductsData,
  useSimpleErrorHandler,
  useSubscriptionError,
  useSubscriptionStatusInfo,
  useSubscriptionsData,
  useThrottledSearch,
  useToastHandler,
  useUserRole,
  useUsersData
});
//# sourceMappingURL=index.js.map