package com.anyrent.pos.domain.error

import com.anyrent.pos.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** #758: every subscription / plan code a shop user can hit has an app string. */
class ApiErrorMessagesTest {
    @Test
    fun subscriptionCodesHaveOwnStrings() {
        val codes = listOf(
            "SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PAUSED", "SUBSCRIPTION_CANCELLED",
            "SUBSCRIPTION_PAST_DUE", "SUBSCRIPTION_PERIOD_ENDED", "NO_SUBSCRIPTION",
            "PLAN_LIMIT_EXCEEDED", "PLAN_UPGRADE_REQUIRED", "PLATFORM_ACCESS_DENIED",
            "CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET", "NO_OUTLET_ACCESS", "ORDER_NOT_FOUND",
        )
        for (c in codes) {
            assertNotEquals(c, 0, ApiErrorMessages.stringId(c))
            assertNotEquals(c, R.string.api_error_subscription_generic, ApiErrorMessages.stringId(c))
        }
        assertEquals(R.string.api_error_subscription_paused, ApiErrorMessages.stringId("subscription_paused"))
    }

    @Test
    fun unknownSubscriptionCodeFallsBackToGenericSentence() {
        assertEquals(R.string.api_error_subscription_generic, ApiErrorMessages.stringId("SUBSCRIPTION_SOMETHING_NEW"))
        assertEquals(R.string.api_error_subscription_generic, ApiErrorMessages.stringId("PLAN_FOO"))
        assertTrue(ApiErrorMessages.isSubscriptionFamily("TRIAL_X"))
    }

    @Test
    fun unrelatedUnknownCodeKeepsServerText() {
        assertEquals(0, ApiErrorMessages.stringId("SOMETHING_ELSE"))
        assertFalse(ApiErrorMessages.isSubscriptionFamily(null))
    }
}
