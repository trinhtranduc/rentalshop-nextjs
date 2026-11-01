package com.anyrent.pos.domain.notifications

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1413: the notification question on Home only, after onboarding, and once. */
class NotificationPromptRuleTest {
    private fun asks(
        sdkInt: Int = 33,
        granted: Boolean = false,
        onboardingDone: Boolean = true,
        homeInFront: Boolean = true,
        alreadyAsked: Boolean = false,
        declinedBefore: Boolean = false,
    ) = NotificationPromptRule.shouldAsk(sdkInt, granted, onboardingDone, homeInFront, alreadyAsked, declinedBefore)

    @Test fun asksOnHomeForSomeoneWhoNeverAnswered() = assertTrue(asks())

    @Test fun neverDuringOnboarding() = assertFalse(asks(onboardingDone = false))

    @Test fun neverAwayFromHome() = assertFalse(asks(homeInFront = false))

    @Test fun androidBelow13HasNoQuestion() = assertFalse(asks(sdkInt = 32))

    @Test fun aGrantedUserIsNotAsked() = assertFalse(asks(granted = true))

    @Test fun askedOnceOnThisInstall() = assertFalse(asks(alreadyAsked = true))

    /** Older versions asked at launch: a user who declined there has the rationale flag and no "asked" mark yet */
    @Test fun aUserWhoDeclinedOnAnOlderVersionIsNotAskedAgain() = assertFalse(asks(declinedBefore = true))
}
