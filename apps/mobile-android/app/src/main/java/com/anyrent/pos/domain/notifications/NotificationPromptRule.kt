package com.anyrent.pos.domain.notifications

/** #1413: when the system asks for the notification permission. iOS: `PromptTiming.swift`. */
object NotificationPromptRule {
    private const val ANDROID_13 = 33

    /**
     * Only someone who never answered, with onboarding over and Home in front.
     * - alreadyAsked: this version asked on this install
     * - declinedBefore: the system's rationale flag; an older version asked at launch and got a no
     */
    fun shouldAsk(
        sdkInt: Int,
        granted: Boolean,
        onboardingDone: Boolean,
        homeInFront: Boolean,
        alreadyAsked: Boolean,
        declinedBefore: Boolean,
    ): Boolean = sdkInt >= ANDROID_13 && !granted && onboardingDone && homeInFront && !alreadyAsked && !declinedBefore
}
