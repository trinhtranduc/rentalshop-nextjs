// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData } from "@rentalshop/utils";
function useAuth() {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null
  });
  const login = useCallback(async (email, password) => {
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
        storeAuthData(data.data.token, data.data.user);
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
  const logout = useCallback(() => {
    clearAuthData();
    setState({
      user: null,
      loading: false,
      error: null
    });
  }, []);
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const token = getAuthToken();
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
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
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
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = getAuthToken();
      if (!token)
        return;
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
import { useCallback as useCallback2 } from "react";
import { clearAuthData as clearAuthData2 } from "@rentalshop/utils";
var useAuthErrorHandler = () => {
  const handleAuthError = useCallback2((error) => {
    console.error("Authentication error detected:", error);
    if (error?.message?.includes("Authentication required") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid token") || error?.message?.includes("Token expired") || error?.status === 401) {
      console.log("\u{1F504} Authentication error detected, logging out user");
      clearAuthData2();
      if (typeof window !== "undefined") {
      }
    }
  }, []);
  return { handleAuthError };
};

// src/hooks/useCanPerform.ts
import { useCallback as useCallback4 } from "react";

// src/hooks/useSubscriptionStatusInfo.ts
import { useState as useState2, useEffect as useEffect2, useCallback as useCallback3 } from "react";
function useSubscriptionStatusInfo(options = {}) {
  const { checkInterval = 5 * 60 * 1e3 } = options;
  const { user } = useAuth();
  const [loading, setLoading] = useState2(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState2(false);
  const [isExpired, setIsExpired] = useState2(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState2(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState2(null);
  const [subscriptionType, setSubscriptionType] = useState2(null);
  const [hasSubscription, setHasSubscription] = useState2(false);
  const [subscription, setSubscription] = useState2(null);
  const [status, setStatus] = useState2("");
  const [isTrial, setIsTrial] = useState2(false);
  const [isActive, setIsActive] = useState2(false);
  const [planName, setPlanName] = useState2("");
  const [error, setError] = useState2(null);
  const fetchSubscriptionStatus = useCallback3(async () => {
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
  const canAccessFeature = useCallback3((feature) => {
    if (!hasActiveSubscription || isExpired) {
      return false;
    }
    return true;
  }, [hasActiveSubscription, isExpired]);
  const refreshStatus = useCallback3(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  useEffect2(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  useEffect2(() => {
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
  const checkPermission = useCallback4((action2) => {
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
import { createContext, useContext, useState as useState3, useCallback as useCallback5, useEffect as useEffect3 } from "react";
import {
  DEFAULT_CURRENCY_SETTINGS,
  getCurrency,
  getCurrentCurrency
} from "@rentalshop/utils";
var CurrencyContext = createContext(void 0);
function CurrencyProvider({
  children,
  initialSettings = {}
}) {
  const [settings, setSettings] = useState3({
    ...DEFAULT_CURRENCY_SETTINGS,
    ...initialSettings
  });
  const currentCurrency = getCurrentCurrency(settings);
  const setCurrency = useCallback5((currencyCode) => {
    setSettings((prev) => ({
      ...prev,
      currentCurrency: currencyCode
    }));
    localStorage.setItem("rentalshop-currency", currencyCode);
  }, []);
  const toggleSymbol = useCallback5(() => {
    setSettings((prev) => ({
      ...prev,
      showSymbol: !prev.showSymbol
    }));
    localStorage.setItem("rentalshop-show-symbol", (!settings.showSymbol).toString());
  }, [settings.showSymbol]);
  const toggleCode = useCallback5(() => {
    setSettings((prev) => ({
      ...prev,
      showCode: !prev.showCode
    }));
    localStorage.setItem("rentalshop-show-code", (!settings.showCode).toString());
  }, [settings.showCode]);
  const getCurrencyByCode = useCallback5((code) => {
    return getCurrency(code);
  }, []);
  const convertAmount = useCallback5((amount, from, to) => {
    if (from === to)
      return amount;
    const fromCurrency = getCurrency(from);
    const toCurrency = getCurrency(to);
    if (!fromCurrency || !toCurrency) {
      throw new Error(`Invalid currency code: ${from} or ${to}`);
    }
    const amountInUSD = amount / fromCurrency.exchangeRate;
    return amountInUSD * toCurrency.exchangeRate;
  }, []);
  useEffect3(() => {
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
  const context = useContext(CurrencyContext);
  if (context === void 0) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
function isValidCurrencyCode(code) {
  return ["USD", "VND"].includes(code);
}

// src/hooks/useCustomersData.ts
import { useState as useState4, useEffect as useEffect4, useRef } from "react";
import { customersApi } from "@rentalshop/utils";
function useCustomersData(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const [data, setData] = useState4(null);
  const [loading, setLoading] = useState4(true);
  const [error, setError] = useState4(null);
  const abortControllerRef = useRef(null);
  const refetchTriggerRef = useRef(0);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect4(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useCustomersData: Fetching with filters:", filters);
        const response = await customersApi.searchCustomers(filters);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const apiData = response.data;
          const customersData = apiData.customers || [];
          const total = apiData.total || 0;
          const limit = apiData.limit || filters.limit || 25;
          const currentPage = apiData.page || filters.page || 1;
          const totalPages = apiData.totalPages || Math.ceil(total / limit);
          const hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : currentPage < totalPages;
          setData({
            customers: customersData,
            total,
            totalPages,
            currentPage,
            limit,
            hasMore
          });
        } else {
          throw new Error("Failed to fetch customers");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("\u{1F50D} useCustomersData: Error fetching customers:", err);
          setError(err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    if (debounceSearch && (filters.search || filters.q)) {
      console.log("\u{1F50D} useCustomersData: Debouncing search query");
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
    // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);
  return {
    data,
    loading,
    error,
    refetch
  };
}

// src/hooks/useOrdersData.ts
import { useState as useState5, useEffect as useEffect5, useRef as useRef2 } from "react";
import { ordersApi } from "@rentalshop/utils";
function useOrdersData(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const [data, setData] = useState5(null);
  const [loading, setLoading] = useState5(true);
  const [error, setError] = useState5(null);
  const abortControllerRef = useRef2(null);
  const refetchTriggerRef = useRef2(0);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect5(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useOrdersData: Fetching with filters:", filters);
        const response = await ordersApi.searchOrders(filters);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const ordersData = response.data.orders || [];
          const total = response.data.total || 0;
          const limit = filters.limit || 25;
          const currentPage = filters.page || 1;
          const totalPages = Math.ceil(total / limit);
          setData({
            orders: ordersData,
            total,
            totalPages,
            currentPage,
            limit,
            hasMore: currentPage < totalPages
          });
        } else {
          throw new Error("Failed to fetch orders");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("\u{1F50D} useOrdersData: Error fetching orders:", err);
          setError(err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    if (debounceSearch && filters.search) {
      console.log("\u{1F50D} useOrdersData: Debouncing search query");
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
    // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);
  return {
    data,
    loading,
    error,
    refetch
  };
}

// src/hooks/useOutletsData.ts
import { useState as useState6, useEffect as useEffect6, useRef as useRef3 } from "react";
import { outletsApi } from "@rentalshop/utils";
function useOutletsData(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const [data, setData] = useState6(null);
  const [loading, setLoading] = useState6(true);
  const [error, setError] = useState6(null);
  const abortControllerRef = useRef3(null);
  const refetchTriggerRef = useRef3(0);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect6(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useOutletsData: Fetching with filters:", filters);
        const response = await outletsApi.searchOutlets(filters);
        console.log("\u{1F4E6} useOutletsData: API Response:", response);
        console.log("\u{1F4CA} useOutletsData: Response data:", response.data);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const apiData = response.data;
          if (Array.isArray(apiData)) {
            const pagination = response.pagination || {};
            const outletsData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== void 0 ? pagination.hasMore : currentPage < totalPages;
            setData({
              outlets: outletsData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            const outletsData = apiData.outlets || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : currentPage < totalPages;
            setData({
              outlets: outletsData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error("Failed to fetch outlets");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("\u{1F50D} useOutletsData: Error fetching outlets:", err);
          setError(err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    if (debounceSearch && (filters.search || filters.q)) {
      console.log("\u{1F50D} useOutletsData: Debouncing search query");
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);
  return {
    data,
    loading,
    error,
    refetch
  };
}

// src/hooks/useCategoriesData.ts
import { useState as useState7, useEffect as useEffect7, useRef as useRef4 } from "react";
import { categoriesApi } from "@rentalshop/utils";
function useCategoriesData(options) {
  const { filters, enabled = true, debounceSearch = false, debounceMs = 300 } = options;
  const [data, setData] = useState7(null);
  const [loading, setLoading] = useState7(false);
  const [error, setError] = useState7(null);
  const abortControllerRef = useRef4(null);
  const refetchTriggerRef = useRef4(0);
  const searchDebounceRef = useRef4(null);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect7(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useCategoriesData: Fetching with filters:", filters);
        const response = await categoriesApi.searchCategories(filters);
        console.log("\u{1F4E6} useCategoriesData: API Response:", response);
        console.log("\u{1F4CA} useCategoriesData: Response data:", response.data);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const apiData = response.data;
          if (Array.isArray(apiData)) {
            const pagination = response.pagination || {};
            const categoriesData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== void 0 ? pagination.hasMore : currentPage < totalPages;
            setData({
              categories: categoriesData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            const categoriesData = apiData.categories || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : currentPage < totalPages;
            setData({
              categories: categoriesData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error(response.message || "Failed to fetch categories");
        }
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        console.error("useCategoriesData: Error fetching categories:", err);
        setError(err.message || "Failed to fetch categories");
        setData(null);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    const shouldDebounce = debounceSearch && (filters.q || filters.search);
    if (shouldDebounce) {
      console.log("\u{1F50D} useCategoriesData: Debouncing search query");
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        fetchData();
      }, debounceMs);
    } else {
      fetchData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [filters, enabled, debounceSearch, debounceMs, refetchTriggerRef.current]);
  return { data, loading, error, refetch };
}

// src/hooks/usePagination.ts
import { useState as useState8, useCallback as useCallback6 } from "react";
import { PAGINATION } from "@rentalshop/constants";
function usePagination(config = {}) {
  const { initialLimit = PAGINATION.DEFAULT_PAGE_SIZE, initialOffset = 0 } = config;
  const [pagination, setPaginationState] = useState8({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });
  const setPagination = useCallback6((newPagination) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
      currentPage: Math.floor((newPagination.offset ?? prev.offset) / (newPagination.limit ?? prev.limit)) + 1,
      totalPages: Math.ceil((newPagination.total ?? prev.total) / (newPagination.limit ?? prev.limit))
    }));
  }, []);
  const handlePageChange = useCallback6((page) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({
      offset: newOffset,
      currentPage: page
    });
  }, [pagination.limit, setPagination]);
  const resetPagination = useCallback6(() => {
    setPagination({
      total: 0,
      offset: initialOffset,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    });
  }, [initialOffset, setPagination]);
  const updatePaginationFromResponse = useCallback6((response) => {
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

// src/hooks/useProductAvailability.ts
import { useCallback as useCallback7 } from "react";
function useProductAvailability() {
  const calculateAvailability = useCallback7((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
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
  const isProductAvailable = useCallback7((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const status = calculateAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders);
    return status.available;
  }, [calculateAvailability]);
  const getAvailabilityForDateRange = useCallback7((product, startDate, endDate, existingOrders = []) => {
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
import { useState as useState9, useEffect as useEffect8, useRef as useRef5 } from "react";
import { productsApi } from "@rentalshop/utils";
function useProductsData(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const [data, setData] = useState9(null);
  const [loading, setLoading] = useState9(true);
  const [error, setError] = useState9(null);
  const abortControllerRef = useRef5(null);
  const refetchTriggerRef = useRef5(0);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect8(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useProductsData: Fetching with filters:", filters);
        const response = await productsApi.searchProducts(filters);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const apiData = response.data;
          const productsData = apiData.products || [];
          const total = apiData.total || 0;
          const limit = apiData.limit || filters.limit || 25;
          const currentPage = apiData.page || filters.page || 1;
          const totalPages = apiData.totalPages || Math.ceil(total / limit);
          const hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : currentPage < totalPages;
          setData({
            products: productsData,
            total,
            totalPages,
            currentPage,
            limit,
            hasMore
          });
        } else {
          throw new Error("Failed to fetch products");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("\u{1F50D} useProductsData: Error fetching products:", err);
          setError(err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    if (debounceSearch && (filters.search || filters.q)) {
      console.log("\u{1F50D} useProductsData: Debouncing search query");
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
    // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);
  return {
    data,
    loading,
    error,
    refetch
  };
}

// src/hooks/useSubscriptionError.ts
import { useState as useState10, useCallback as useCallback8 } from "react";
import { useToasts } from "@rentalshop/ui";
function useSubscriptionError() {
  const [error, setError] = useState10(null);
  const { addToast } = useToasts();
  const handleSubscriptionError = useCallback8((error2) => {
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
  const showSubscriptionError = useCallback8((error2) => {
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
  const clearError = useCallback8(() => {
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
import { useState as useState11, useEffect as useEffect9, useCallback as useCallback9, useRef as useRef6 } from "react";
function useThrottledSearch(options) {
  const { delay, minLength, onSearch } = options;
  const [query, setQuery] = useState11("");
  const [isSearching, setIsSearching] = useState11(false);
  const timeoutRef = useRef6(null);
  const isSearchingRef = useRef6(false);
  const isInitialRender = useRef6(true);
  const onSearchRef = useRef6(onSearch);
  useEffect9(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  const handleSearchChange = useCallback9((value) => {
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
  const clearSearch = useCallback9(() => {
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
  const cleanup = useCallback9(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  useEffect9(() => {
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
import { useState as useState12, useCallback as useCallback10 } from "react";
import {
  analyzeError,
  withErrorHandlingForUI,
  getToastType
} from "@rentalshop/utils";
import { useToasts as useToasts2 } from "@rentalshop/ui";
var useErrorHandler = (options = {}) => {
  const {
    onLogin,
    onRetry,
    onDismiss,
    autoHandleAuth = true
  } = options;
  const [isLoading, setIsLoading] = useState12(false);
  const { addToast } = useToasts2();
  const handleError = useCallback10((error) => {
    const errorInfo = analyzeError(error);
    return errorInfo;
  }, []);
  const showErrorToast = useCallback10((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
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
  const handleApiCall = useCallback10(async (apiCall) => {
    setIsLoading(true);
    try {
      const result = await withErrorHandlingForUI(apiCall);
      if (result.error) {
        showErrorToast(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);
  const retry = useCallback10(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);
  const login = useCallback10(() => {
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
  const { addToast } = useToasts2();
  const handleError = useCallback10((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
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
  const { addToast } = useToasts2();
  const showError = useCallback10((title, message) => {
    addToast("error", title, message, 0);
  }, [addToast]);
  const showSuccess = useCallback10((title, message) => {
    addToast("success", title, message, 5e3);
  }, [addToast]);
  const showWarning = useCallback10((title, message) => {
    addToast("warning", title, message, 5e3);
  }, [addToast]);
  const showInfo = useCallback10((title, message) => {
    addToast("info", title, message, 5e3);
  }, [addToast]);
  const handleError = useCallback10((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
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
import { useState as useState13, useEffect as useEffect10, useRef as useRef7 } from "react";
import { usersApi } from "@rentalshop/utils";
function useUsersData(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const [data, setData] = useState13(null);
  const [loading, setLoading] = useState13(true);
  const [error, setError] = useState13(null);
  const abortControllerRef = useRef7(null);
  const refetchTriggerRef = useRef7(0);
  const refetch = () => {
    refetchTriggerRef.current += 1;
  };
  useEffect10(() => {
    if (!enabled)
      return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("\u{1F50D} useUsersData: Fetching with filters:", filters);
        const response = await usersApi.searchUsers(filters);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (response.success && response.data) {
          const apiData = response.data;
          if (Array.isArray(apiData)) {
            const pagination = response.pagination || {};
            const usersData = apiData;
            const total = pagination.total || apiData.length;
            const limit = pagination.limit || filters.limit || 25;
            const currentPage = pagination.page || filters.page || 1;
            const totalPages = Math.ceil(total / limit);
            const hasMore = pagination.hasMore !== void 0 ? pagination.hasMore : currentPage < totalPages;
            setData({
              users: usersData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          } else {
            const usersData = apiData.users || [];
            const total = apiData.total || 0;
            const limit = apiData.limit || filters.limit || 25;
            const currentPage = apiData.page || filters.page || 1;
            const totalPages = apiData.totalPages || Math.ceil(total / limit);
            const hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : currentPage < totalPages;
            setData({
              users: usersData,
              total,
              totalPages,
              currentPage,
              limit,
              hasMore
            });
          }
        } else {
          throw new Error("Failed to fetch users");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("\u{1F50D} useUsersData: Error fetching users:", err);
          setError(err);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };
    if (debounceSearch && (filters.search || filters.q)) {
      console.log("\u{1F50D} useUsersData: Debouncing search query");
      const timer = setTimeout(fetchData, debounceMs);
      return () => {
        clearTimeout(timer);
        abortControllerRef.current?.abort();
      };
    } else {
      fetchData();
      return () => {
        abortControllerRef.current?.abort();
      };
    }
  }, [
    filters,
    // This is now stable from parent's memoization
    enabled,
    debounceSearch,
    debounceMs,
    refetchTriggerRef.current
  ]);
  return {
    data,
    loading,
    error,
    refetch
  };
}

// src/hooks/useOptimisticNavigation.ts
import { useRouter } from "next/navigation";
import { useState as useState14, useCallback as useCallback11, useRef as useRef8, useEffect as useEffect11 } from "react";
function useOptimisticNavigation(options = {}) {
  const router = useRouter();
  const [navigatingTo, setNavigatingTo] = useState14(null);
  const rafRef = useRef8(null);
  const timeoutRef = useRef8(null);
  useEffect11(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  const navigate = useCallback11((path) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNavigatingTo(path);
    options.onNavigateStart?.(path);
    rafRef.current = requestAnimationFrame(() => {
      router.push(path);
      timeoutRef.current = setTimeout(() => {
        setNavigatingTo(null);
        options.onNavigateEnd?.(path);
      }, 500);
    });
  }, [router, options]);
  return {
    navigate,
    navigatingTo,
    isNavigating: navigatingTo !== null
  };
}
export {
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
  useCategoriesData,
  useCurrency,
  useCustomersData,
  useErrorHandler,
  useOptimisticNavigation,
  useOrdersData,
  useOutletsData,
  usePagination,
  useProductAvailability,
  useProductsData,
  useSimpleErrorHandler,
  useSubscriptionError,
  useSubscriptionStatusInfo,
  useThrottledSearch,
  useToastHandler,
  useUserRole,
  useUsersData
};
//# sourceMappingURL=index.mjs.map