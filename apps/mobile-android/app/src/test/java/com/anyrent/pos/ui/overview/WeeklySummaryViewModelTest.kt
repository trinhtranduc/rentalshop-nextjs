package com.anyrent.pos.ui.overview

import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.overview.WeeklySummaryLogic
import com.anyrent.pos.domain.overview.WeeklySummaryStatus
import com.anyrent.pos.ui.overview.v2.WeeklySheetPhase
import com.anyrent.pos.ui.overview.v2.WeeklySummaryViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** #1612 "✦ Tóm tắt tuần": GET shows the button and the dot, the sheet POSTs, errors retry */
@OptIn(ExperimentalCoroutinesApi::class)
class WeeklySummaryViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    private fun answer(status: String, available: Boolean = true): JSONObject {
        val summary = when (status) {
            "READY" -> """{"generatedAt":"2026-11-16T01:12:00.000Z","numbers":{},"content":{"summary":"S","actions":["A"]}}"""
            "NO_ORDERS" -> """{"generatedAt":"2026-11-16T01:12:00.000Z","numbers":{},"content":null}"""
            else -> "null"
        }
        return JSONObject(
            """{"success":true,"data":{"available":$available,"week":{"start":"2026-11-09","end":"2026-11-15"},
               "nextWeekStart":"2026-11-23","status":"$status","branchName":null,"summary":$summary}}""",
        )
    }

    @Test fun `staff never asks and never sees the button`() = runTest(dispatcher) {
        var gets = 0
        val vm = WeeklySummaryViewModel(get = { gets++; answer("NONE") }, post = { error("no") }, role = "OUTLET_STAFF", io = dispatcher)
        advanceUntilIdle()
        vm.load(); advanceUntilIdle()
        assertEquals(0, gets)
        assertFalse(WeeklySummaryLogic.showsButton(vm.state.value.summary))
    }

    @Test fun `first open of the week writes it and the dot goes`() = runTest(dispatcher) {
        var posts = 0
        val vm = WeeklySummaryViewModel(get = { answer("NONE") }, post = { posts++; answer("READY") }, role = "MERCHANT", io = dispatcher)
        advanceUntilIdle()
        assertTrue(WeeklySummaryLogic.showsButton(vm.state.value.summary))
        assertTrue(WeeklySummaryLogic.showsDot(vm.state.value.summary))

        vm.open()
        assertTrue(vm.state.value.sheetOpen)
        assertEquals(WeeklySheetPhase.Loading, vm.state.value.phase)
        advanceUntilIdle()
        assertEquals(1, posts)
        val shown = vm.state.value.phase as WeeklySheetPhase.Shown
        assertEquals(WeeklySummaryStatus.READY, shown.summary.status)
        assertFalse("opened: no dot", WeeklySummaryLogic.showsDot(vm.state.value.summary))
        assertTrue(WeeklySummaryLogic.showsButton(vm.state.value.summary))

        vm.close()
        assertFalse(vm.state.value.sheetOpen)
    }

    @Test fun `a stored summary shows at once`() = runTest(dispatcher) {
        val vm = WeeklySummaryViewModel(get = { answer("READY") }, post = { answer("READY") }, role = "OUTLET_ADMIN", io = dispatcher)
        advanceUntilIdle()
        assertFalse(WeeklySummaryLogic.showsDot(vm.state.value.summary))
        vm.open()
        assertTrue("no spinner for a stored summary", vm.state.value.phase is WeeklySheetPhase.Shown)
        advanceUntilIdle()
        assertTrue(vm.state.value.phase is WeeklySheetPhase.Shown)
    }

    @Test fun `no orders shows the empty state`() = runTest(dispatcher) {
        val vm = WeeklySummaryViewModel(get = { answer("NONE") }, post = { answer("NO_ORDERS") }, role = "MERCHANT", io = dispatcher)
        advanceUntilIdle()
        vm.open(); advanceUntilIdle()
        val shown = vm.state.value.phase as WeeklySheetPhase.Shown
        assertEquals(WeeklySummaryStatus.NO_ORDERS, shown.summary.status)
        assertNull(shown.summary.content)
        assertFalse(WeeklySummaryLogic.showsDot(vm.state.value.summary))
    }

    @Test fun `an AI error shows retry, and retry posts again`() = runTest(dispatcher) {
        var fail = true
        var posts = 0
        val vm = WeeklySummaryViewModel(
            get = { answer("NONE") },
            post = { posts++; if (fail) throw AppError.Http(502, "AI failed", "AI_SUMMARY_FAILED") else answer("READY") },
            role = "MERCHANT", io = dispatcher,
        )
        advanceUntilIdle()
        vm.open(); advanceUntilIdle()
        assertEquals(WeeklySheetPhase.Failed, vm.state.value.phase)
        assertTrue("nothing stored: still new", WeeklySummaryLogic.showsDot(vm.state.value.summary))

        fail = false
        vm.retry()
        assertEquals(WeeklySheetPhase.Loading, vm.state.value.phase)
        advanceUntilIdle()
        assertEquals(2, posts)
        assertTrue(vm.state.value.phase is WeeklySheetPhase.Shown)
        assertFalse(WeeklySummaryLogic.showsDot(vm.state.value.summary))
    }

    @Test fun `GET errors, 403 and no AI key hide the button`() = runTest(dispatcher) {
        var get: () -> JSONObject = { throw AppError.Http(403, "Forbidden", "FORBIDDEN") }
        val vm = WeeklySummaryViewModel(get = { get() }, post = { error("no") }, role = "ADMIN", io = dispatcher)
        advanceUntilIdle()
        assertNull(vm.state.value.summary)

        get = { answer("NONE", available = false) }
        vm.load(); advanceUntilIdle()
        assertFalse(WeeklySummaryLogic.showsButton(vm.state.value.summary))

        get = { answer("NONE") }
        vm.load(); advanceUntilIdle()
        assertTrue("pull to refresh brings it back", WeeklySummaryLogic.showsButton(vm.state.value.summary))

        get = { throw AppError.Network("offline") }
        vm.load(); advanceUntilIdle()
        assertFalse(WeeklySummaryLogic.showsButton(vm.state.value.summary))
    }
}
