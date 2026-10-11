package com.anyrent.pos.domain.error

import android.content.Context
import com.anyrent.pos.R

/**
 * Maps API `code` values to user-facing copy.
 *
 * Why: the backend sends English `message` plus a machine `code` like
 * `PLAN_LIMIT_EXCEEDED`. iOS translates via Localizable.strings keyed by that
 * code. Android used to show both strings at once (and often as red text under
 * the save bar instead of a dialog).
 */
object ApiErrorMessages {
    fun resolve(context: Context?, code: String?, fallback: String): String {
        val id = stringId(code)
        if (context != null && id != 0) return context.getString(id)

        val cleaned = fallback.trim()
        if (cleaned.matches(SNAKE_CODE)) {
            return context?.getString(R.string.request_failed) ?: "Request failed"
        }
        return cleaned.ifBlank {
            context?.getString(R.string.request_failed) ?: "Request failed"
        }
    }

    internal fun stringId(code: String?): Int = when (code?.uppercase()) {
        "PLAN_LIMIT_EXCEEDED" -> R.string.api_error_plan_limit_exceeded
        "PRODUCT_NAME_EXISTS" -> R.string.api_error_product_name_exists
        "PRODUCT_HAS_OPEN_ORDERS" -> R.string.api_error_product_has_open_orders
        "STOCK_BELOW_RENTED" -> R.string.api_error_stock_below_rented
        "CUSTOMER_DUPLICATE" -> R.string.api_error_customer_duplicate
        "EMAIL_EXISTS" -> R.string.api_error_email_exists
        "PHONE_EXISTS" -> R.string.api_error_phone_exists
        "VALIDATION_ERROR" -> R.string.api_error_validation
        "INSUFFICIENT_PERMISSIONS" -> R.string.api_error_insufficient_permissions
        "SUBSCRIPTION_EXPIRED" -> R.string.api_error_subscription_expired
        "TRIAL_EXPIRED" -> R.string.api_error_trial_expired
        // #758: every subscription / plan code a shop user can hit (wording of locales/*/errors.json)
        "SUBSCRIPTION_PAUSED" -> R.string.api_error_subscription_paused
        "SUBSCRIPTION_CANCELLED" -> R.string.api_error_subscription_cancelled
        "SUBSCRIPTION_PAST_DUE" -> R.string.api_error_subscription_past_due
        "SUBSCRIPTION_PERIOD_ENDED" -> R.string.api_error_subscription_period_ended
        "NO_SUBSCRIPTION" -> R.string.api_error_no_subscription
        "PLAN_UPGRADE_REQUIRED" -> R.string.api_error_plan_upgrade_required
        "PLATFORM_ACCESS_DENIED" -> R.string.api_error_platform_access_denied
        "CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET" -> R.string.api_error_order_other_outlet
        "NO_OUTLET_ACCESS" -> R.string.api_error_no_outlet_access
        "ORDER_NOT_FOUND" -> R.string.api_error_order_not_found
        "PRODUCT_OUT_OF_STOCK" -> R.string.api_error_product_out_of_stock
        "PRODUCT_HAS_NO_IMAGES" -> R.string.api_error_product_has_no_images
        "INVALID_CREDENTIALS" -> R.string.api_error_invalid_credentials
        "UNAUTHORIZED", "SESSION_EXPIRED", "TOKEN_EXPIRED", "INVALID_TOKEN" ->
            R.string.api_error_session_expired
        "SESSION_REPLACED" -> R.string.api_error_session_replaced
        "INVALID_ORDER_STATUS" -> R.string.api_error_invalid_order_status
        "OUTLET_REQUIRED" -> R.string.api_error_outlet_required
        "CURRENT_PASSWORD_INCORRECT" -> R.string.api_error_current_password_incorrect
        "PASSWORD_MIN_LENGTH" -> R.string.api_error_password_min_length
        "RATE_LIMIT_EXCEEDED" -> R.string.api_error_rate_limit_exceeded
        // #518: 409 when the shop turned "Cho tạo đơn khi trùng lịch" off and the rental is double-booked
        "ORDER_SCHEDULE_CONFLICT" -> R.string.api_error_order_schedule_conflict
        // #567: 400 when a shop time zone is not a known IANA id (PUT /api/settings/merchant)
        "INVALID_TIMEZONE" -> R.string.api_error_invalid_timezone
        // #632: categories from the product form
        "CATEGORY_NAME_EXISTS" -> R.string.api_error_category_name_exists
        "CATEGORY_NAME_REQUIRED" -> R.string.api_error_category_name_required
        "CANNOT_DELETE_DEFAULT_CATEGORY" -> R.string.api_error_cannot_delete_default_category
        // #654: image search (NO_PRODUCTS_FOUND is the empty state, not an error: see ImageSearchQuery)
        "SEARCH_FAILED" -> R.string.api_error_search_failed
        "SEARCH_TIMEOUT" -> R.string.api_error_search_timeout
        "INVALID_LIMIT" -> R.string.api_error_invalid_limit
        "INVALID_MIN_SIMILARITY" -> R.string.api_error_invalid_min_similarity
        "NO_PRODUCTS_FOUND" -> R.string.image_search_empty
        // A subscription / plan code with no string of its own: a generic localized sentence,
        // never the API's English text (#758).
        else -> if (isSubscriptionFamily(code)) R.string.api_error_subscription_generic else 0
    }

    internal fun isSubscriptionFamily(code: String?): Boolean {
        val c = code?.uppercase() ?: return false
        return c.startsWith("SUBSCRIPTION_") || c.startsWith("PLAN_") || c.startsWith("TRIAL_")
    }

    private val SNAKE_CODE = Regex("^[A-Z][A-Z0-9_]{3,}$")
}
