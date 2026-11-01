package com.anyrent.pos.domain.notifications

/** #1413: when the system asks for the notification permission. iOS: `PromptTiming.swift`. */
object NotificationPromptRule {
    /** STUB (red): today's behaviour */
    fun shouldAsk(
        sdkInt: Int,
        granted: Boolean,
        onboardingDone: Boolean,
        homeInFront: Boolean,
        alreadyAsked: Boolean,
        declinedBefore: Boolean,
    ): Boolean = sdkInt >= 33 && !granted
}
