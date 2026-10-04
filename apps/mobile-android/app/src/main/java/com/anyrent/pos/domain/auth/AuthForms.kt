package com.anyrent.pos.domain.auth

import com.anyrent.pos.R

/**
 * #386 — pure rules behind the new login, create-store and forgot-password screens (flag `newAuth`).
 * Rules and the register payload match the current sign-up and `POST /api/auth/register`.
 */
enum class AuthField { EMAIL, PASSWORD, STORE_NAME, PHONE, ADDRESS, FULL_NAME, CONFIRM_PASSWORD, TERMS }

enum class AuthProblem(val messageRes: Int) {
    EMAIL_REQUIRED(R.string.authv2_email_required),
    EMAIL_INVALID(R.string.authv2_email_invalid),
    PASSWORD_REQUIRED(R.string.authv2_password_required),
    PASSWORD_TOO_SHORT(R.string.authv2_password_too_short),
    STORE_NAME_REQUIRED(R.string.authv2_store_name_required),
    STORE_NAME_TOO_SHORT(R.string.authv2_store_name_too_short),
    PHONE_REQUIRED(R.string.authv2_phone_required),
    PHONE_INVALID(R.string.authv2_phone_invalid),
    ADDRESS_REQUIRED(R.string.authv2_address_required),
    ADDRESS_TOO_SHORT(R.string.authv2_address_too_short),
    NAME_REQUIRED(R.string.authv2_name_required),
    NAME_TOO_SHORT(R.string.authv2_name_too_short),
    CONFIRM_REQUIRED(R.string.authv2_confirm_required),
    PASSWORDS_MISMATCH(R.string.authv2_passwords_mismatch),
    TERMS_REQUIRED(R.string.authv2_terms_required),
}

typealias AuthErrors = Map<AuthField, AuthProblem>

object AuthValidation {
    const val MIN_PASSWORD = 6
    const val MIN_STORE_NAME = 3
    const val MIN_ADDRESS = 3
    const val MIN_FULL_NAME = 2

    private val EMAIL = Regex("^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$")
    private val PHONE = Regex("^[0-9+]{10,13}$")
    private val PHONE_SEPARATORS = Regex("[\\s.\\-\\u00A0]")

    fun login(email: String, password: String): AuthErrors = buildMap {
        emailProblem(email)?.let { put(AuthField.EMAIL, it) }
        passwordProblem(password)?.let { put(AuthField.PASSWORD, it) }
    }

    fun forgot(email: String): AuthErrors = buildMap {
        emailProblem(email)?.let { put(AuthField.EMAIL, it) }
    }

    fun storeStep(storeName: String, phone: String, address: String): AuthErrors = buildMap {
        val name = storeName.trim()
        when {
            name.isEmpty() -> put(AuthField.STORE_NAME, AuthProblem.STORE_NAME_REQUIRED)
            name.length < MIN_STORE_NAME -> put(AuthField.STORE_NAME, AuthProblem.STORE_NAME_TOO_SHORT)
        }
        val digits = normalizedPhone(phone)
        when {
            digits.isEmpty() -> put(AuthField.PHONE, AuthProblem.PHONE_REQUIRED)
            !PHONE.matches(digits) -> put(AuthField.PHONE, AuthProblem.PHONE_INVALID)
        }
        val place = address.trim()
        when {
            place.isEmpty() -> put(AuthField.ADDRESS, AuthProblem.ADDRESS_REQUIRED)
            place.length < MIN_ADDRESS -> put(AuthField.ADDRESS, AuthProblem.ADDRESS_TOO_SHORT)
        }
    }

    fun ownerStep(fullName: String, email: String, password: String, confirm: String, termsAccepted: Boolean): AuthErrors =
        buildMap {
            val name = fullName.trim()
            when {
                name.isEmpty() -> put(AuthField.FULL_NAME, AuthProblem.NAME_REQUIRED)
                name.length < MIN_FULL_NAME -> put(AuthField.FULL_NAME, AuthProblem.NAME_TOO_SHORT)
            }
            emailProblem(email)?.let { put(AuthField.EMAIL, it) }
            passwordProblem(password)?.let { put(AuthField.PASSWORD, it) }
            when {
                confirm.isEmpty() -> put(AuthField.CONFIRM_PASSWORD, AuthProblem.CONFIRM_REQUIRED)
                confirm != password -> put(AuthField.CONFIRM_PASSWORD, AuthProblem.PASSWORDS_MISMATCH)
            }
            if (!termsAccepted) put(AuthField.TERMS, AuthProblem.TERMS_REQUIRED)
        }

    /** "0901 234 567" → "0901234567" */
    fun normalizedPhone(phone: String): String = phone.replace(PHONE_SEPARATORS, "")

    private fun emailProblem(email: String): AuthProblem? {
        val value = email.trim()
        return when {
            value.isEmpty() -> AuthProblem.EMAIL_REQUIRED
            !EMAIL.matches(value) -> AuthProblem.EMAIL_INVALID
            else -> null
        }
    }

    private fun passwordProblem(password: String): AuthProblem? = when {
        password.isEmpty() -> AuthProblem.PASSWORD_REQUIRED
        password.length < MIN_PASSWORD -> AuthProblem.PASSWORD_TOO_SHORT
        else -> null
    }
}

/** "Bạn cho thuê gì?" chips: OTHER at start, at least one stays on, picking a niche drops OTHER (iOS rules) */
object BusinessTagRules {
    data class Option(val apiValue: String, val labelRes: Int)

    /** Board order (Dang-ky) */
    val options = listOf(
        Option("AO_DAI", R.string.authv2_tag_ao_dai),
        Option("WEDDING_DRESS", R.string.authv2_tag_wedding_dress),
        Option("COSTUME", R.string.authv2_tag_costume),
        Option("FILM_EQUIPMENT", R.string.authv2_tag_film_equipment),
        Option("VEHICLE", R.string.authv2_tag_vehicle),
        Option("EQUIPMENT", R.string.authv2_tag_equipment),
        Option("OTHER", R.string.authv2_tag_other),
    )

    /** Values accepted by `registerSchema.businessTags`, in API catalog order */
    val catalog = listOf("AO_DAI", "COSTUME", "WEDDING_DRESS", "EQUIPMENT", "VEHICLE", "FILM_EQUIPMENT", "OTHER")

    val initial: Set<String> = setOf("OTHER")

    fun toggle(tag: String, selected: Set<String>): Set<String> = when {
        tag in selected -> if (selected.size > 1) selected - tag else selected
        tag != "OTHER" -> selected + tag - "OTHER"
        else -> selected + tag
    }

    fun payload(selected: Set<String>): List<String> =
        catalog.filter { it in selected }.ifEmpty { listOf("OTHER") }
}

/** Values of both create-store steps, kept while moving between them */
data class RegisterDraft(
    val storeName: String = "",
    val phone: String = "",
    val address: String = "",
    val tags: Set<String> = BusinessTagRules.initial,
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val termsAccepted: Boolean = false,
) {
    val storeErrors: AuthErrors get() = AuthValidation.storeStep(storeName, phone, address)
    val ownerErrors: AuthErrors
        get() = AuthValidation.ownerStep(fullName, email, password, confirmPassword, termsAccepted)

    /** Arguments of `ApiParity.registerMerchant` */
    fun request(): RegisterRequest = RegisterRequest(
        email = email.trim(),
        password = password,
        fullName = fullName.trim(),
        phone = AuthValidation.normalizedPhone(phone),
        storeName = storeName.trim(),
        address = address.trim(),
        businessTags = BusinessTagRules.payload(tags),
    )
}

data class RegisterRequest(
    val email: String,
    val password: String,
    val fullName: String,
    val phone: String,
    val storeName: String,
    val address: String,
    val businessTags: List<String>,
)

/** Where a failed call is shown, and with which text, from the API error `code` */
object AuthErrorMapping {
    sealed interface Placement {
        data class Field(val field: AuthField) : Placement
        data object General : Placement
    }

    fun login(code: String?): Placement = when (code?.uppercase()) {
        "INVALID_CREDENTIALS" -> Placement.Field(AuthField.PASSWORD)
        else -> Placement.General
    }

    fun register(code: String?): Placement = when (code?.uppercase()) {
        "EMAIL_EXISTS", "MERCHANT_DUPLICATE" -> Placement.Field(AuthField.EMAIL)
        else -> Placement.General
    }

    /** Text for the codes these screens meet; null keeps the message `ApiClient` already resolved */
    fun messageRes(code: String?, status: Int? = null): Int? = when (code?.uppercase()) {
        "INVALID_CREDENTIALS" -> R.string.api_error_invalid_credentials
        "ACCOUNT_DEACTIVATED" -> R.string.authv2_error_account_deactivated
        "EMAIL_EXISTS" -> R.string.api_error_email_exists
        "MERCHANT_DUPLICATE" -> R.string.authv2_error_merchant_duplicate
        "RATE_LIMIT_EXCEEDED" -> R.string.authv2_error_rate_limited
        // forgot-password's rate limiter answers 429 without a code
        else -> if (status == 429) R.string.authv2_error_rate_limited else null
    }
}

/** "Gửi lại email" is disabled for a short while after a tap */
data class ResendCooldown(val seconds: Int = DEFAULT_SECONDS, val endsAtMillis: Long? = null) {
    fun start(nowMillis: Long): ResendCooldown = copy(endsAtMillis = nowMillis + seconds * 1000L)

    fun remaining(nowMillis: Long): Int {
        val end = endsAtMillis ?: return 0
        val left = end - nowMillis
        return if (left <= 0) 0 else ((left + 999) / 1000).toInt()
    }

    fun canResend(nowMillis: Long): Boolean = remaining(nowMillis) == 0

    companion object {
        const val DEFAULT_SECONDS = 60
    }
}

/** Which email the "Kiểm tra email" screen talks about, and which call its "Gửi lại email" makes */
enum class EmailSentKind(val key: String) {
    /** Forgot password: reset link, resend = forgot-password */
    RESET("reset"),

    /** After sign-up: activation email, resend = resend-verification */
    ACTIVATION("activation");

    companion object {
        /** Unknown or missing keeps the forgot-password meaning */
        fun parse(key: String?): EmailSentKind = entries.firstOrNull { it.key == key } ?: RESET
    }
}
