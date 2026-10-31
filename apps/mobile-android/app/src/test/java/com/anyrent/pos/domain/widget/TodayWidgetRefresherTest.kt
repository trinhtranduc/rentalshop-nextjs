package com.anyrent.pos.domain.widget

import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.orders.TodayWorkRow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #1381: the refresh the worker and the app share; no Android here (the worker is a thin wrapper) */
class TodayWidgetRefresherTest {
    private class FakeStore(var file: TodayWidgetSnapshot? = null) : TodayWidgetFile {
        override fun read() = file
        override fun write(snapshot: TodayWidgetSnapshot) { file = snapshot }
        override fun clear() { file = null }
    }

    private val store = FakeStore()
    private var user: Int? = 7
    private var hide = false
    private var calls = 0
    private var answer: suspend () -> Result<TodayWork> = { Result.success(work) }
    private val work = TodayWork(
        date = "2026-10-31",
        pickupsToday = listOf(TodayWorkRow(id = 1, orderNumber = "1", customerName = "Chị Diệu", firstItemName = "Áo", itemCount = 1)),
        pickupsCount = 1,
    )

    private val refresher = TodayWidgetRefresher(
        load = { calls++; answer() },
        file = store,
        userId = { user },
        outletId = { 5 },
        hideNames = { hide },
        now = { Instant.parse("2026-10-31T02:00:00Z") },
    )

    @Test
    fun aListIsWritten() = runTest {
        assertEquals(TodayWidgetRefresher.Outcome.WRITTEN, refresher.refresh())
        assertEquals(TodayWidgetSnapshot.State.OK, store.file?.state)
        assertEquals(7, store.file?.userId)
        assertEquals(5, store.file?.outletId)
    }

    @Test
    fun signedOutCallsNoNetworkAndClears() = runTest {
        store.file = snapshot()
        user = null
        assertEquals(TodayWidgetRefresher.Outcome.SIGNED_OUT, refresher.refresh())
        assertEquals(0, calls)
        assertNull(store.file)
    }

    @Test
    fun forbiddenMeansNoAccess() = runTest {
        answer = { Result.failure(AppError.Http(403, "no")) }
        assertEquals(TodayWidgetRefresher.Outcome.NO_ACCESS, refresher.refresh())
        assertEquals(TodayWidgetSnapshot.State.NO_ACCESS, store.file?.state)
        assertEquals("2026-10-31", store.file?.date)
        assertTrue(store.file?.rows.orEmpty().isEmpty())
    }

    @Test
    fun aNetworkOrServerErrorKeepsTheLastFile() = runTest {
        val last = snapshot(date = "2026-10-30")
        store.file = last
        answer = { Result.failure(AppError.Network("down")) }
        assertEquals(TodayWidgetRefresher.Outcome.KEPT, refresher.refresh())
        answer = { Result.failure(AppError.Http(500, "boom")) }
        assertEquals(TodayWidgetRefresher.Outcome.KEPT, refresher.refresh())
        assertEquals(last, store.file)
    }

    @Test
    fun anAnswerFromBeforeSignOutIsDropped() = runTest {
        answer = {
            refresher.signedOut()
            user = null
            Result.success(work)
        }
        assertEquals(TodayWidgetRefresher.Outcome.DROPPED, refresher.refresh())
        assertNull(store.file)
    }

    @Test
    fun anAnswerForTheOldAccountIsDropped() = runTest {
        answer = {
            user = 8
            Result.success(work)
        }
        assertEquals(TodayWidgetRefresher.Outcome.DROPPED, refresher.refresh())
        assertNull(store.file)
    }

    @Test
    fun signOutClearsTheFile() {
        store.file = snapshot()
        refresher.signedOut()
        assertNull(store.file)
    }

    @Test
    fun theNameSwitchRewritesFromTheLastAnswerWithNoNetwork() = runTest {
        refresher.refresh()
        assertEquals(1, calls)
        hide = true
        assertTrue(refresher.hideNamesChanged())
        assertEquals("", store.file?.rows?.single()?.name)
        hide = false
        assertTrue(refresher.hideNamesChanged())
        assertEquals("Chị Diệu", store.file?.rows?.single()?.name)
        assertEquals(1, calls)
    }

    @Test
    fun theNameSwitchWithNoLastAnswerStripsTheFileAndAsksForARefresh() {
        store.file = snapshot(rows = listOf(row(name = "Chị Diệu")))
        hide = true
        assertFalse(refresher.hideNamesChanged())
        assertEquals("", store.file?.rows?.single()?.name)
    }

    @Test
    fun theLastAnswerOfAnotherAccountIsNotReused() = runTest {
        refresher.refresh()
        user = 8
        assertFalse(refresher.hideNamesChanged())
    }
}
