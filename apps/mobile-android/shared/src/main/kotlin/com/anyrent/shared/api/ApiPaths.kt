package com.anyrent.shared.api

/**
 * Shared API path constants.
 * Phase 7: this Android library is the extraction point for a future KMP `commonMain` module
 * consumed by both iOS (via framework) and Android — UI stays platform-native.
 */
object ApiPaths {
    const val LOGIN = "/api/auth/login"
    const val LOGOUT = "/api/auth/logout"
    const val FORGOT_PASSWORD = "/api/auth/forgot-password"
    const val REGISTER_DEVICE = "/api/mobile/notifications/register-device"
    const val NOTIFICATIONS = "/api/notifications"
    const val NOTIFICATIONS_UNREAD = "/api/notifications/unread-count"
    const val ORDERS = "/api/orders"
    const val PRODUCTS = "/api/products"
    const val CUSTOMERS = "/api/customers"
    const val USERS = "/api/users"
    const val CALENDAR_ORDERS = "/api/calendar/orders"
    const val ANALYTICS_TODAY = "/api/analytics/today-metrics"
    const val ANALYTICS_OVERVIEW = "/api/analytics/overview"
    const val HEALTH = "/api/health"

    const val PLATFORM_ANDROID = "android"
    const val PLATFORM_IOS = "ios"
}
