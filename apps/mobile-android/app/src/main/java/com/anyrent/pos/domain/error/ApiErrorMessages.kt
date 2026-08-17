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

    private fun stringId(code: String?): Int = when (code?.uppercase()) {
        "PLAN_LIMIT_EXCEEDED" -> R.string.api_error_plan_limit_exceeded
        "PRODUCT_NAME_EXISTS" -> R.string.api_error_product_name_exists
        "CUSTOMER_DUPLICATE" -> R.string.api_error_customer_duplicate
        "EMAIL_EXISTS" -> R.string.api_error_email_exists
        "PHONE_EXISTS" -> R.string.api_error_phone_exists
        "VALIDATION_ERROR" -> R.string.api_error_validation
        "INSUFFICIENT_PERMISSIONS" -> R.string.api_error_insufficient_permissions
        "SUBSCRIPTION_EXPIRED" -> R.string.api_error_subscription_expired
        "TRIAL_EXPIRED" -> R.string.api_error_trial_expired
        "PRODUCT_OUT_OF_STOCK" -> R.string.api_error_product_out_of_stock
        "PRODUCT_HAS_NO_IMAGES" -> R.string.api_error_product_has_no_images
        "INVALID_CREDENTIALS" -> R.string.api_error_invalid_credentials
        "UNAUTHORIZED", "SESSION_EXPIRED", "TOKEN_EXPIRED", "INVALID_TOKEN" ->
            R.string.api_error_session_expired
        else -> 0
    }

    private val SNAKE_CODE = Regex("^[A-Z][A-Z0-9_]{3,}$")
}
