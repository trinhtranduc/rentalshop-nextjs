package com.anyrent.pos.domain.appstart

/** #1455: which screen comes first, and where the pages and a login lead. iOS: `AppStartRoute.swift`. */
enum class AppStartRoute {
    ONBOARDING, LOGIN, MAIN;

    enum class Moment { LAUNCH, ONBOARDING_FINISHED, LOGGED_IN }

    companion object {
        /**
         * - LAUNCH (also the update screen lifting): the pages once per install, before login. Someone signed in who never
         *   saw them (an update in the middle) gets them before Home.
         * - ONBOARDING_FINISHED: `signedIn` is read at that moment, a session can end while a page is up.
         * - LOGGED_IN: always Home. A login never leads to the pages.
         */
        fun next(after: Moment, signedIn: Boolean, onboardingDone: Boolean): AppStartRoute = when (after) {
            Moment.LAUNCH -> when {
                !onboardingDone -> ONBOARDING
                signedIn -> MAIN
                else -> LOGIN
            }
            Moment.ONBOARDING_FINISHED -> if (signedIn) MAIN else LOGIN
            Moment.LOGGED_IN -> MAIN
        }

        /** After these the pages are over for this install. A login counts: Login can come with the pages unfinished (the session ended on a page). */
        fun endsOnboarding(moment: Moment): Boolean = moment == Moment.ONBOARDING_FINISHED || moment == Moment.LOGGED_IN
    }
}
