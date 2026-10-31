package com.anyrent.pos.domain.widget

import com.anyrent.pos.ui.navigation.Routes
import com.anyrent.pos.ui.navigation.isSignInRoute
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1381: links, the one-time hint, the "Thêm widget" sheet and the size rules */
class TodayWidgetRulesTest {
    @Test
    fun links() {
        assertEquals(TodayWidgetLink.Order(490268), TodayWidgetLink.parse("anyrent://order/490268"))
        assertEquals(TodayWidgetLink.Order(12), TodayWidgetLink.parse("ANYRENT://ORDER/12"))
        assertEquals(TodayWidgetLink.Todo, TodayWidgetLink.parse("anyrent://todo"))
        assertEquals(TodayWidgetLink.orderUrl(5), "anyrent://order/5")
    }

    @Test
    fun badLinksOpenNothing() {
        for (bad in listOf("anyrent://order/abc", "anyrent://order/0", "anyrent://order/-1", "anyrent://order", "anyrent://order/1/2",
            "anyrent://other/1", "anyrent://", "https://order/1", "not a link", "", null)) {
            assertNull(bad, TodayWidgetLink.parse(bad))
        }
    }

    @Test
    fun aRequestedLinkIsHandedOutOnce() {
        TodayWidgetLinks.request(TodayWidgetLink.Order(9))
        assertEquals(TodayWidgetLink.Order(9), TodayWidgetLinks.pending.value)
        assertEquals(TodayWidgetLink.Order(9), TodayWidgetLinks.consume())
        assertNull(TodayWidgetLinks.consume())
        assertNull(TodayWidgetLinks.pending.value)
    }

    @Test
    fun theHintNeedsWorkNoWidgetAndNoNeverAsk() {
        assertTrue(TodayWidgetHint.shouldShow(todayAvailable = true, hasWork = true, hasWidget = false, dismissed = false))
        assertFalse(TodayWidgetHint.shouldShow(todayAvailable = false, hasWork = true, hasWidget = false, dismissed = false))
        assertFalse(TodayWidgetHint.shouldShow(todayAvailable = true, hasWork = false, hasWidget = false, dismissed = false))
        assertFalse(TodayWidgetHint.shouldShow(todayAvailable = true, hasWork = true, hasWidget = true, dismissed = false))
        assertFalse(TodayWidgetHint.shouldShow(todayAvailable = true, hasWork = true, hasWidget = false, dismissed = true))
    }

    @Test
    fun hasWorkIsLateHandOverOrReturn() {
        assertFalse(TodayWidgetHint.hasWork(null))
        assertFalse(TodayWidgetHint.hasWork(TodayWidgetCounts(0, 0, 0, tomorrowPickup = 3)))
        assertTrue(TodayWidgetHint.hasWork(TodayWidgetCounts(1, 0, 0)))
    }

    @Test
    fun theSheetOffersTheButtonOnlyWhenTheLauncherCanPin() {
        val offer = TodayWidgetGuide.of(pinSupported = true, pinRequested = false)
        assertTrue(offer.showsPinButton)
        assertFalse(offer.showsSteps)

        val unsupported = TodayWidgetGuide.of(pinSupported = false, pinRequested = false)
        assertFalse(unsupported.showsPinButton)
        assertTrue(unsupported.showsSteps)
        assertFalse(unsupported.showsNotAskedNote)
    }

    /** The app is not told when pinning fails: after the call there is no success state, only the steps as a way out */
    @Test
    fun afterTheCallThereIsNoSuccessOnlyTheStepsAsAWayOut() {
        val asked = TodayWidgetGuide.of(pinSupported = true, pinRequested = true)
        assertFalse(asked.showsPinButton)
        assertTrue(asked.showsSteps)
        assertTrue(asked.showsNotAskedNote)
    }

    /** A session the worker found gone: the recreated app goes to sign-in, unless it is already on a sign-in screen */
    @Test
    fun signInRoutes() {
        for (route in listOf(Routes.Login, Routes.Forgot, Routes.ForgotV2, Routes.Register, Routes.EmailSentV2, "check-email/a@b.c")) {
            assertTrue(route, isSignInRoute(route))
        }
        for (route in listOf(Routes.Main, Routes.Onboarding, Routes.Cart, Routes.orderDetail(5))) {
            assertFalse(route, isSignInRoute(route))
        }
    }

    @Test
    fun sizes() {
        assertTrue(TodayWidgetLayout.isSmall(widthDp = 110f))
        assertTrue(TodayWidgetLayout.isSmall(widthDp = 179f))
        assertFalse(TodayWidgetLayout.isSmall(widthDp = 180f))
        assertEquals(0, TodayWidgetLayout.rowLimit(widthDp = 150f, heightDp = 400f))
        assertEquals(TodayWidgetLayout.MAX_ROWS, TodayWidgetLayout.rowLimit(widthDp = 320f, heightDp = 400f))
        assertEquals(3, TodayWidgetLayout.MAX_ROWS)
        assertTrue(TodayWidgetLayout.rowLimit(320f, 110f) < TodayWidgetLayout.rowLimit(320f, 200f))
    }
}
