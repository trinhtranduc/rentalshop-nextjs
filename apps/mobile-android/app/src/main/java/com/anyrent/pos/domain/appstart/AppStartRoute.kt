package com.anyrent.pos.domain.appstart

/** #1455: which screen comes first, and where the pages and a login lead. iOS: `AppStartRoute.swift`. */
enum class AppStartRoute {
    ONBOARDING, LOGIN, MAIN;

    enum class Moment { LAUNCH, ONBOARDING_FINISHED, LOGGED_IN }

    companion object {
        fun next(after: Moment, signedIn: Boolean, onboardingDone: Boolean): AppStartRoute = when (after) {
            Moment.LAUNCH -> when {
                signedIn && !onboardingDone -> ONBOARDING
                signedIn -> MAIN
                else -> LOGIN
            }
            Moment.ONBOARDING_FINISHED -> MAIN
            Moment.LOGGED_IN -> if (onboardingDone) MAIN else ONBOARDING
        }

        fun endsOnboarding(moment: Moment): Boolean = moment == Moment.ONBOARDING_FINISHED
    }
}
