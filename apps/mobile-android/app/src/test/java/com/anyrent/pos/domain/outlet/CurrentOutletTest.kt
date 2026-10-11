package com.anyrent.pos.domain.outlet

import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewLogic
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.YearMonth

/** #828 — merchant branch picker: which branches, which one is in use, what the header shows, what the API gets */
class CurrentOutletTest {
    private fun outlet(id: Int, name: String, isDefault: Boolean = false, isActive: Boolean = true) =
        OutletChoice(id, name, address = "Addr $id", phone = "090$id", isDefault = isDefault, isActive = isActive)

    private class MemoryStore : OutletChoiceStore {
        val choices = mutableMapOf<Int, Int>()
        val lists = mutableMapOf<Int, String>()
        override fun remembered(userId: Int) = choices[userId]
        override fun remember(userId: Int, outletId: Int) { choices[userId] = outletId }
        override fun forgetChoice(userId: Int) { choices.remove(userId) }
        override fun cachedOutlets(userId: Int) = lists[userId]
        override fun cacheOutlets(userId: Int, raw: String) { lists[userId] = raw }
        override fun forgetOutlets(userId: Int) { lists.remove(userId) }
    }

    private val merchant = OutletSession(userId = 7, role = "MERCHANT", outletId = null)
    private val branches = listOf(outlet(3, "Quận 3"), outlet(1, "Chính", isDefault = true))

    // ---- pure rules (iOS CurrentOutletLogicTests) ----

    @Test fun onlyActiveBranchesDefaultFirst() {
        val list = listOf(outlet(3, "Quận 3"), outlet(1, "Chính", isDefault = true), outlet(4, "Đóng", isActive = false), outlet(5, "Thủ Đức"))
        assertEquals(listOf(1, 3, 5), CurrentOutletLogic.activeOutlets(list).map { it.id })
    }

    @Test fun rememberedBranchWinsWhileActive() {
        val result = CurrentOutletLogic.resolve(3, CurrentOutletLogic.activeOutlets(branches))
        assertEquals(3, result.outlet?.id)
        assertFalse(result.fellBack)
    }

    @Test fun noChoiceUsesTheDefaultWithoutNotice() {
        val result = CurrentOutletLogic.resolve(null, branches)
        assertEquals(1, result.outlet?.id)
        assertFalse(result.fellBack)
    }

    @Test fun turnedOffBranchFallsBackToDefaultAndTells() {
        val result = CurrentOutletLogic.resolve(3, listOf(outlet(1, "Chính", isDefault = true)))
        assertEquals(1, result.outlet?.id)
        assertTrue(result.fellBack)
        assertFalse("nothing loaded is not a fallback", CurrentOutletLogic.resolve(3, emptyList()).fellBack)
    }

    @Test fun onlyMerchantWithTwoActiveBranchesSwitches() {
        assertTrue(CurrentOutletLogic.canSwitch("MERCHANT", 2))
        assertFalse(CurrentOutletLogic.canSwitch("MERCHANT", 1))
        listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", "ADMIN", null).forEach {
            assertFalse(it.toString(), CurrentOutletLogic.canSwitch(it, 3))
        }
    }

    @Test fun headerModes() {
        assertEquals(OutletHeaderMode.Button("Chính", false), CurrentOutletLogic.headerMode("MERCHANT", 2, "Chính", true))
        assertEquals(OutletHeaderMode.Button("Quận 3", true), CurrentOutletLogic.headerMode("MERCHANT", 2, "Quận 3", false))
        assertEquals(OutletHeaderMode.Plain("Chính"), CurrentOutletLogic.headerMode("MERCHANT", 1, "Chính", true))
        assertEquals(OutletHeaderMode.Plain("Quận 3"), CurrentOutletLogic.headerMode("OUTLET_STAFF", 0, "Quận 3", true))
        assertEquals(OutletHeaderMode.Hidden, CurrentOutletLogic.headerMode("MERCHANT", 2, null, true))
    }

    @Test fun cartConfirmOnlyWithLines() {
        assertFalse(CurrentOutletLogic.needsCartConfirm(0))
        assertTrue(CurrentOutletLogic.needsCartConfirm(3))
    }

    @Test fun parsesOutletsAndRoundTripsTheCache() {
        val json = JSONObject(
            """{"success":true,"data":{"outlets":[
              {"id":1,"name":"Chính","address":"123 Main","phone":"0901","isDefault":true,"isActive":true},
              {"id":2,"name":"Đóng","isActive":false},
              {"id":3,"name":"Quận 3","address":null},
              {"id":0,"name":"broken"},{"id":4,"name":"  "}]}}""",
        )
        val parsed = CurrentOutletLogic.parseOutlets(json)
        assertEquals(listOf(1, 2, 3), parsed.map { it.id })
        assertFalse(parsed[1].isActive)
        assertNull(parsed[2].address)
        assertTrue(parsed[2].isActive)
        assertEquals(parsed, CurrentOutletLogic.decode(CurrentOutletLogic.encode(parsed)))
        assertEquals(emptyList<OutletChoice>(), CurrentOutletLogic.decode("not json"))
    }

    // ---- state: one source for every screen ----

    @Test fun merchantWorksInTheDefaultUntilItPicks() {
        val state = CurrentOutletState(MemoryStore()) { merchant }
        assertNull("before the first load the API picks the default", state.id)
        state.applyLoaded(branches, forUserId = 7)
        assertEquals(1, state.id)
        assertEquals(1, state.merchantFilterId)
        assertEquals(OutletHeaderMode.Button("Chính", false), state.headerMode)

        val before = state.version.value
        state.select(3)
        assertEquals(3, state.id)
        assertEquals("Quận 3", state.name)
        assertEquals("0903", state.outlet?.phone)
        assertEquals(OutletHeaderMode.Button("Quận 3", true), state.headerMode)
        assertTrue("screens reload", state.version.value > before)
    }

    @Test fun choiceIsRememberedPerAccountAndSurvivesARestart() {
        val store = MemoryStore()
        CurrentOutletState(store) { merchant }.apply {
            applyLoaded(branches, 7)
            select(3)
        }
        // A new process reads the cached list and the choice before any load
        val restarted = CurrentOutletState(store) { merchant }
        assertEquals(3, restarted.id)
        assertEquals(2, restarted.outlets.size)
        // Another merchant on the same phone has its own choice
        val other = CurrentOutletState(store) { OutletSession(userId = 8, role = "MERCHANT", outletId = null) }
        assertNull(other.id)
    }

    @Test fun logoutForgetsTheChoice() {
        val store = MemoryStore()
        val state = CurrentOutletState(store) { merchant }
        state.applyLoaded(branches, 7)
        state.select(3)
        state.forget(7)
        assertTrue(store.choices.isEmpty())
        assertTrue(store.lists.isEmpty())
        state.applyLoaded(branches, 7)
        assertEquals(1, state.id)
    }

    @Test fun turnedOffChoiceFallsBackOnceWithNotice() {
        val store = MemoryStore()
        val state = CurrentOutletState(store) { merchant }
        state.applyLoaded(branches, 7)
        state.select(3)
        state.applyLoaded(listOf(outlet(1, "Chính", isDefault = true), outlet(3, "Quận 3", isActive = false), outlet(5, "Thủ Đức")), 7)
        assertEquals(1, state.id)
        assertEquals("Chính", state.fallbackNotice.value)
        assertNull("the choice is dropped, so the notice is not repeated", store.choices[7])
        state.fallbackShown()
        state.applyLoaded(listOf(outlet(1, "Chính", isDefault = true), outlet(5, "Thủ Đức")), 7)
        assertNull(state.fallbackNotice.value)
    }

    @Test fun outletUsersAlwaysUseTheirOwnOutlet() {
        val staff = OutletSession(userId = 9, role = "OUTLET_STAFF", outletId = 3, outletName = "Quận 3", outletPhone = "0903")
        val store = MemoryStore()
        val state = CurrentOutletState(store) { staff }
        state.applyLoaded(branches, 9)
        state.select(1)
        assertEquals(3, state.id)
        assertNull("the API already scopes outlet users", state.merchantFilterId)
        assertEquals(OutletHeaderMode.Plain("Quận 3"), state.headerMode)
        assertFalse(state.canSwitch)
        assertEquals("0903", state.outlet?.phone)
        assertTrue(store.choices.isEmpty())
    }

    @Test fun oneBranchShopShowsTheNameOnly() {
        val state = CurrentOutletState(MemoryStore()) { merchant }
        state.applyLoaded(listOf(outlet(1, "Chính", isDefault = true), outlet(2, "Đóng", isActive = false)), 7)
        assertEquals(OutletHeaderMode.Plain("Chính"), state.headerMode)
        assertFalse(state.canSwitch)
    }

    @Test fun signedOutAnswersNothing() {
        val state = CurrentOutletState(MemoryStore()) { null }
        assertNull(state.id)
        assertEquals(OutletHeaderMode.Hidden, state.headerMode)
    }

    @Test fun aListLoadedForAnotherAccountIsIgnored() {
        val state = CurrentOutletState(MemoryStore()) { merchant }
        state.applyLoaded(branches, forUserId = 8)
        assertNull(state.id)
    }

    // ---- requests carry the chosen branch ----

    @Test fun requestsCarryTheChosenBranch() {
        val month = YearMonth.of(2026, 10)
        val range = DayRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 11))
        assertTrue(CalendarLogic.monthCountPath(month, 3).endsWith("&outletId=3"))
        assertTrue(CalendarLogic.dayPath("2026-10-11", 3).endsWith("&outletId=3"))
        assertTrue(OverviewLogic.periodPath(range, outletId = 3).endsWith("&outletIds=3"))
        assertTrue(OverviewLogic.outletOperationsPath(3).endsWith("&outletIds=3"))
        assertFalse(CalendarLogic.monthCountPath(month).contains("outletId"))
        assertFalse(CalendarLogic.dayPath("2026-10-11").contains("outletId"))
        assertFalse(OverviewLogic.periodPath(range).contains("outletIds"))
        assertFalse(OverviewLogic.outletOperationsPath().contains("outletIds"))
    }
}
