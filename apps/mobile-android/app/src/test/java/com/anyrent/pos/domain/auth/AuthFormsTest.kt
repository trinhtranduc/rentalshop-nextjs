package com.anyrent.pos.domain.auth

import com.anyrent.pos.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #386 — validation, register payload, error mapping and resend cooldown of the new auth screens */
class AuthFormsTest {

    // Login

    @Test
    fun loginRequiresEmailAndPassword() {
        val errors = AuthValidation.login("", "")
        assertEquals(AuthProblem.EMAIL_REQUIRED, errors[AuthField.EMAIL])
        assertEquals(AuthProblem.PASSWORD_REQUIRED, errors[AuthField.PASSWORD])
    }

    @Test
    fun loginRejectsBadEmailAndShortPassword() {
        val errors = AuthValidation.login("lan@", "12345")
        assertEquals(AuthProblem.EMAIL_INVALID, errors[AuthField.EMAIL])
        assertEquals(AuthProblem.PASSWORD_TOO_SHORT, errors[AuthField.PASSWORD])
    }

    @Test
    fun loginAcceptsValidInputWithSurroundingSpaces() {
        assertTrue(AuthValidation.login(" lan@aodaiminhchau.vn ", "matkhau123").isEmpty())
    }

    // Forgot

    @Test
    fun forgotValidatesEmailOnly() {
        assertEquals(AuthProblem.EMAIL_REQUIRED, AuthValidation.forgot("  ")[AuthField.EMAIL])
        assertEquals(AuthProblem.EMAIL_INVALID, AuthValidation.forgot("abc")[AuthField.EMAIL])
        assertTrue(AuthValidation.forgot("a@b.vn").isEmpty())
    }

    // Step 1

    @Test
    fun storeStepRequiresEveryField() {
        val errors = AuthValidation.storeStep(" ", "", "")
        assertEquals(AuthProblem.STORE_NAME_REQUIRED, errors[AuthField.STORE_NAME])
        assertEquals(AuthProblem.PHONE_REQUIRED, errors[AuthField.PHONE])
        assertEquals(AuthProblem.ADDRESS_REQUIRED, errors[AuthField.ADDRESS])
    }

    @Test
    fun storeStepMinimumsAndPhoneFormat() {
        val errors = AuthValidation.storeStep("AB", "09012", "Q1")
        assertEquals(AuthProblem.STORE_NAME_TOO_SHORT, errors[AuthField.STORE_NAME])
        assertEquals(AuthProblem.PHONE_INVALID, errors[AuthField.PHONE])
        assertEquals(AuthProblem.ADDRESS_TOO_SHORT, errors[AuthField.ADDRESS])
    }

    @Test
    fun storeStepAcceptsSpacedPhone() {
        assertTrue(AuthValidation.storeStep("Áo dài Minh Châu", "0901 234 567", "12 Lê Lợi, Q1").isEmpty())
        assertEquals("0901234567", AuthValidation.normalizedPhone("0901 234 567"))
        assertEquals("+84901234567", AuthValidation.normalizedPhone("+84.901-234-567"))
    }

    // Step 2

    @Test
    fun ownerStepRequiredFieldsAndTerms() {
        val errors = AuthValidation.ownerStep("", "", "", "", termsAccepted = false)
        assertEquals(AuthProblem.NAME_REQUIRED, errors[AuthField.FULL_NAME])
        assertEquals(AuthProblem.EMAIL_REQUIRED, errors[AuthField.EMAIL])
        assertEquals(AuthProblem.PASSWORD_REQUIRED, errors[AuthField.PASSWORD])
        assertEquals(AuthProblem.CONFIRM_REQUIRED, errors[AuthField.CONFIRM_PASSWORD])
        assertEquals(AuthProblem.TERMS_REQUIRED, errors[AuthField.TERMS])
    }

    @Test
    fun ownerStepPasswordLengthAndMismatch() {
        val mismatch = AuthValidation.ownerStep("Lan", "lan@a.vn", "matkhau123", "matkhau12", termsAccepted = true)
        assertEquals(mapOf(AuthField.CONFIRM_PASSWORD to AuthProblem.PASSWORDS_MISMATCH), mismatch)

        val short = AuthValidation.ownerStep("L", "lan@a.vn", "12345", "12345", termsAccepted = true)
        assertEquals(AuthProblem.NAME_TOO_SHORT, short[AuthField.FULL_NAME])
        assertEquals(AuthProblem.PASSWORD_TOO_SHORT, short[AuthField.PASSWORD])
        assertNull(short[AuthField.CONFIRM_PASSWORD])
    }

    @Test
    fun ownerStepValid() {
        assertTrue(AuthValidation.ownerStep("Nguyễn Thị Lan", "lan@a.vn", "123456", "123456", termsAccepted = true).isEmpty())
    }

    // Chips

    @Test
    fun tagRulesMatchCurrentSignUp() {
        var tags = BusinessTagRules.initial
        assertEquals(setOf("OTHER"), tags)
        tags = BusinessTagRules.toggle("AO_DAI", tags)
        assertEquals("a niche replaces OTHER", setOf("AO_DAI"), tags)
        tags = BusinessTagRules.toggle("WEDDING_DRESS", tags)
        assertEquals(setOf("AO_DAI", "WEDDING_DRESS"), tags)
        tags = BusinessTagRules.toggle("AO_DAI", tags)
        tags = BusinessTagRules.toggle("WEDDING_DRESS", tags)
        assertEquals("the last chip stays on", setOf("WEDDING_DRESS"), tags)
        tags = BusinessTagRules.toggle("OTHER", tags)
        assertEquals(setOf("WEDDING_DRESS", "OTHER"), tags)
    }

    @Test
    fun chipsSendValuesTheApiAccepts() {
        // registerSchema.businessTags enum in packages/utils/src/core/validation-schemas.ts
        val api = setOf("AO_DAI", "COSTUME", "WEDDING_DRESS", "EQUIPMENT", "VEHICLE", "FILM_EQUIPMENT", "OTHER")
        assertEquals(api, BusinessTagRules.options.map { it.apiValue }.toSet())
        assertEquals(api, BusinessTagRules.catalog.toSet())
    }

    // Payload

    @Test
    fun registerRequestFromBothSteps() {
        val draft = RegisterDraft(
            storeName = " Áo dài Minh Châu ",
            phone = "0901 234 567",
            address = "12 Lê Lợi, Q1 ",
            tags = setOf("WEDDING_DRESS", "AO_DAI"),
            fullName = "Nguyễn Thị Lan",
            email = " lan@aodaiminhchau.vn",
            password = "matkhau123",
            confirmPassword = "matkhau123",
            termsAccepted = true,
        )
        assertTrue(draft.storeErrors.isEmpty())
        assertTrue(draft.ownerErrors.isEmpty())
        assertEquals(
            RegisterRequest(
                email = "lan@aodaiminhchau.vn",
                password = "matkhau123",
                fullName = "Nguyễn Thị Lan",
                phone = "0901234567",
                storeName = "Áo dài Minh Châu",
                address = "12 Lê Lợi, Q1",
                businessTags = listOf("AO_DAI", "WEDDING_DRESS"),
            ),
            draft.request(),
        )
    }

    @Test
    fun defaultDraftSendsOther() {
        assertEquals(listOf("OTHER"), RegisterDraft().request().businessTags)
        assertEquals(listOf("OTHER"), BusinessTagRules.payload(emptySet()))
    }

    // Errors

    @Test
    fun errorCodesMapToFieldsAndMessages() {
        assertEquals(AuthErrorMapping.Placement.Field(AuthField.PASSWORD), AuthErrorMapping.login("INVALID_CREDENTIALS"))
        assertEquals(AuthErrorMapping.Placement.General, AuthErrorMapping.login("ACCOUNT_DEACTIVATED"))
        assertEquals(AuthErrorMapping.Placement.General, AuthErrorMapping.login(null))
        assertEquals(AuthErrorMapping.Placement.Field(AuthField.EMAIL), AuthErrorMapping.register("EMAIL_EXISTS"))
        assertEquals(AuthErrorMapping.Placement.Field(AuthField.EMAIL), AuthErrorMapping.register("merchant_duplicate"))
        assertEquals(AuthErrorMapping.Placement.General, AuthErrorMapping.register("VALIDATION_ERROR"))

        assertEquals(R.string.api_error_invalid_credentials, AuthErrorMapping.messageRes("INVALID_CREDENTIALS"))
        assertEquals(R.string.api_error_email_exists, AuthErrorMapping.messageRes("EMAIL_EXISTS"))
        assertEquals(R.string.authv2_error_merchant_duplicate, AuthErrorMapping.messageRes("MERCHANT_DUPLICATE"))
        assertEquals(R.string.authv2_error_account_deactivated, AuthErrorMapping.messageRes("ACCOUNT_DEACTIVATED"))
        assertEquals(R.string.authv2_error_rate_limited, AuthErrorMapping.messageRes(null, status = 429))
        assertNull(AuthErrorMapping.messageRes("SOMETHING_ELSE", status = 500))
    }

    // Cooldown

    @Test
    fun resendCooldown() {
        val t0 = 1_000_000L
        val idle = ResendCooldown(seconds = 60)
        assertTrue(idle.canResend(t0))
        assertEquals(0, idle.remaining(t0))

        val running = idle.start(t0)
        assertFalse(running.canResend(t0))
        assertEquals(60, running.remaining(t0))
        assertEquals(60, running.remaining(t0 + 400))
        assertEquals(1, running.remaining(t0 + 59_500))
        assertTrue(running.canResend(t0 + 60_000))
    }
}
