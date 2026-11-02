package com.anyrent.pos.domain.appstart

import com.anyrent.pos.domain.appstart.AppStartRoute.LOGIN
import com.anyrent.pos.domain.appstart.AppStartRoute.MAIN
import com.anyrent.pos.domain.appstart.AppStartRoute.Moment
import com.anyrent.pos.domain.appstart.AppStartRoute.ONBOARDING
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1455: same cases as iOS `AppStartRouteTests`. */
class AppStartRouteTest {
    /** What one install keeps, walked moment by moment. A logout or an ended session is `signedIn = false`: they show Login directly. */
    private class Install(var signedIn: Boolean = false, var onboardingDone: Boolean = false) {
        fun reach(moment: Moment): AppStartRoute {
            if (AppStartRoute.endsOnboarding(moment)) onboardingDone = true
            if (moment == Moment.LOGGED_IN) signedIn = true
            return AppStartRoute.next(moment, signedIn, onboardingDone)
        }
    }

    @Test
    fun aFreshInstallStartsOnThePagesThenLoginThenHome() {
        val install = Install()
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
        assertEquals(LOGIN, install.reach(Moment.ONBOARDING_FINISHED))
        assertEquals(MAIN, install.reach(Moment.LOGGED_IN))
        assertEquals("shown once", MAIN, install.reach(Moment.LAUNCH))
    }

    @Test
    fun quittingOnAPageShowsThePagesAgain() {
        val install = Install()
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
    }

    @Test
    fun finishedPagesBeforeLoginStayFinished() {
        val install = Install()
        install.reach(Moment.ONBOARDING_FINISHED)
        assertEquals("quit on the login screen", LOGIN, install.reach(Moment.LAUNCH))
    }

    @Test
    fun someoneSignedInWithThePagesToDoSeesThemOnceThenHome() {
        val install = Install(signedIn = true)
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
        assertEquals(MAIN, install.reach(Moment.ONBOARDING_FINISHED))
        assertEquals("not twice", MAIN, install.reach(Moment.LAUNCH))
    }

    @Test
    fun aFlagAlreadySetNeverShowsThePages() {
        assertEquals(MAIN, Install(signedIn = true, onboardingDone = true).reach(Moment.LAUNCH))
        assertEquals(LOGIN, Install(signedIn = false, onboardingDone = true).reach(Moment.LAUNCH))
    }

    @Test
    fun aLogoutLeavesThePagesOver() {
        val install = Install(signedIn = true, onboardingDone = true)
        install.signedIn = false
        assertEquals(LOGIN, install.reach(Moment.LAUNCH))
        assertEquals(MAIN, install.reach(Moment.LOGGED_IN))
    }

    @Test
    fun aSessionEndingWhileThePagesAreUpGoesToLoginOnFinish() {
        val install = Install(signedIn = true)
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
        install.signedIn = false
        assertEquals(LOGIN, install.reach(Moment.ONBOARDING_FINISHED))
    }

    /** The session ended on a page and Login took over: Home after it, and no pages at the next launch either */
    @Test
    fun aLoginNeverLeadsToThePages() {
        val install = Install(signedIn = false, onboardingDone = false)
        assertEquals(MAIN, install.reach(Moment.LOGGED_IN))
        assertTrue(install.onboardingDone)
        assertEquals(MAIN, install.reach(Moment.LAUNCH))
    }

    /** The same login screen, quit before signing in: signed out with the pages to do is a first launch, and it cannot get stuck */
    @Test
    fun quittingOnThatLoginScreenShowsThePagesOnceMoreThenLogin() {
        val install = Install(signedIn = false, onboardingDone = false)
        assertEquals(ONBOARDING, install.reach(Moment.LAUNCH))
        assertEquals(LOGIN, install.reach(Moment.ONBOARDING_FINISHED))
    }

    @Test
    fun onlyFinishingAndLoggingInEndThePages() {
        assertFalse(AppStartRoute.endsOnboarding(Moment.LAUNCH))
        assertTrue(AppStartRoute.endsOnboarding(Moment.ONBOARDING_FINISHED))
        assertTrue(AppStartRoute.endsOnboarding(Moment.LOGGED_IN))
    }
}
