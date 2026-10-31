package com.anyrent.pos.domain.guide

import com.anyrent.pos.domain.settings.SettingsGroup
import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsRows
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1393: same rules as iOS `FirstRunGuideTests`: who sees the card, what ticks a row, when it ends, a failed read shows nothing */
class FirstRunGuideTest {
    private class FakeSource : FirstRunGuideSource {
        var orders: Int? = 0
        var customers: Int? = 0
        var orderCalls = 0
        var customerCalls = 0
        /** Runs in the middle of the order read, to change the shop while the answer is on its way */
        var duringOrders: (() -> Unit)? = null

        override suspend fun orderTotal(): Int? {
            orderCalls++
            duringOrders?.invoke()
            return orders
        }

        override suspend fun customerTotal(): Int? {
            customerCalls++
            return customers
        }
    }

    private class MapStorage : FirstRunGuideStorage {
        val values = mutableMapOf<String, Boolean>()
        override fun get(key: String): Boolean = values[key] == true
        override fun set(key: String, value: Boolean) { values[key] = value }
    }

    private val source = FakeSource()
    private val storage = MapStorage()
    private var role: String? = "MERCHANT"
    private var merchantId: Int? = 1
    private var flagsOn = true

    private fun tracker() = FirstRunGuideTracker(source, storage) {
        FirstRunGuideContext(role, merchantId, newProducts = flagsOn, newCustomers = flagsOn)
    }

    // Audience

    @Test
    fun `only the owner is the audience`() {
        assertTrue(FirstRunGuide.isAudience("MERCHANT", 1, newProducts = true, newCustomers = true))
        listOf("ADMIN", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", null).forEach {
            assertFalse("$it", FirstRunGuide.isAudience(it, 1, newProducts = true, newCustomers = true))
        }
    }

    @Test
    fun `old screens and a missing shop are not the audience`() {
        assertFalse(FirstRunGuide.isAudience("MERCHANT", 1, newProducts = false, newCustomers = true))
        assertFalse(FirstRunGuide.isAudience("MERCHANT", 1, newProducts = true, newCustomers = false))
        assertFalse(FirstRunGuide.isAudience("MERCHANT", null, newProducts = true, newCustomers = true))
    }

    @Test
    fun `another role makes no call and gets no card`() = runBlocking {
        role = "OUTLET_ADMIN"
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(0, source.orderCalls)
        assertEquals(0, source.customerCalls)
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
    }

    // Steps

    @Test
    fun `new shop shows all three open`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Steps(emptySet()), guide.card(searching = false))
        assertEquals(FirstRunGuideStep.PRODUCT, FirstRunGuide.current(emptySet()))
        assertEquals(0, guide.settingsDoneCount())
    }

    @Test
    fun `product then customer tick`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Steps(setOf(FirstRunGuideStep.PRODUCT)), guide.card(searching = false))
        assertEquals(FirstRunGuideStep.CUSTOMER, FirstRunGuide.current(setOf(FirstRunGuideStep.PRODUCT)))
        source.customers = 1
        guide.refresh()
        val two = setOf(FirstRunGuideStep.PRODUCT, FirstRunGuideStep.CUSTOMER)
        assertEquals(FirstRunGuideCard.Steps(two), guide.card(searching = false))
        assertEquals(FirstRunGuideStep.ORDER, FirstRunGuide.current(two))
        assertEquals(2, guide.settingsDoneCount())
    }

    @Test
    fun `a customer added before a product ticks only the customer`() = runBlocking {
        source.customers = 3
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Steps(setOf(FirstRunGuideStep.CUSTOMER)), guide.card(searching = false))
        assertEquals(FirstRunGuideStep.PRODUCT, FirstRunGuide.current(setOf(FirstRunGuideStep.CUSTOMER)))
    }

    @Test
    fun `search hides the card`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = true))
    }

    @Test
    fun `no card before the product list answered`() = runBlocking {
        val guide = tracker()
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
    }

    // Done

    @Test
    fun `a shop with orders on a new phone never sees a card`() = runBlocking {
        source.orders = 1
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
        assertEquals(0, source.customerCalls)
    }

    @Test
    fun `an order ends it even with no customer and no product`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 2
        guide.refresh()
        assertEquals(FirstRunGuideCard.Finished, guide.card(searching = false))
    }

    @Test
    fun `finish shows once and close ends it`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 1
        guide.refresh()
        assertEquals(FirstRunGuideCard.Finished, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
        guide.closeFinish()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertEquals(FirstRunGuideCard.Hidden, tracker().card(searching = false))
    }

    @Test
    fun `finish survives a relaunch until closed`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 1
        guide.refresh()
        assertEquals(FirstRunGuideCard.Finished, tracker().card(searching = false))
    }

    @Test
    fun `done flag stops every further call`() = runBlocking {
        source.orders = 1
        val guide = tracker()
        guide.refresh()
        assertEquals(1, source.orderCalls)
        guide.refresh()
        tracker().refresh()
        assertEquals(1, source.orderCalls)
        assertEquals(0, source.customerCalls)
    }

    // Network error

    @Test
    fun `order read failure shows nothing`() = runBlocking {
        source.orders = null
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
    }

    @Test
    fun `customer read failure shows nothing`() = runBlocking {
        source.customers = null
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
    }

    @Test
    fun `product list failure shows nothing`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(null)
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
    }

    @Test
    fun `a failure does not end the guide`() = runBlocking {
        source.orders = null
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        source.orders = 0
        guide.refresh()
        assertEquals(FirstRunGuideCard.Steps(emptySet()), guide.card(searching = false))
    }

    @Test
    fun `a card on screen goes when a refresh fails`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        source.customers = null
        guide.refresh()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
    }

    // Skip

    @Test
    fun `skip is per shop`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))

        merchantId = 2
        val other = tracker()
        other.noteProducts(false)
        other.refresh()
        assertEquals(FirstRunGuideCard.Steps(emptySet()), other.card(searching = false))

        merchantId = 1
        assertEquals(FirstRunGuideCard.Hidden, tracker().card(searching = false))
    }

    @Test
    fun `store keys carry the shop`() {
        assertEquals("firstRunGuide.skipped.42", FirstRunGuideStore.key("skipped", 42))
    }

    @Test
    fun `skipped guide makes no call from home but settings still reads`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        val calls = source.orderCalls
        guide.refresh()
        assertEquals(calls, source.orderCalls)
        guide.refresh(forSettings = true)
        assertEquals(calls + 1, source.orderCalls)
        assertEquals(0, guide.settingsDoneCount())
    }

    @Test
    fun `reopening clears the skip`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        guide.clearSkip()
        assertEquals(FirstRunGuideCard.Steps(emptySet()), guide.card(searching = false))
    }

    @Test
    fun `a skipped guide gets no finish card`() = runBlocking {
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        guide.skip()
        source.orders = 1
        guide.refresh(forSettings = true)
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
    }

    // Shop change

    @Test
    fun `another shop does not inherit facts`() = runBlocking {
        source.customers = 5
        val guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        merchantId = 2
        assertEquals(FirstRunGuideCard.Hidden, guide.card(searching = false))
        assertNull(guide.settingsDoneCount())
    }

    @Test
    fun `an answer for the old shop is dropped`() = runBlocking {
        source.orders = 9
        source.duringOrders = { merchantId = 2 }
        tracker().refresh()
        assertFalse(FirstRunGuideStore(storage).marks(1).done)
        assertFalse(FirstRunGuideStore(storage).marks(2).done)
    }

    // Row actions

    @Test
    fun `row actions`() {
        assertEquals(FirstRunGuideAction.OpenProductForm, FirstRunGuide.action(FirstRunGuideStep.PRODUCT, hasProduct = true, cartIsEmpty = true))
        assertEquals(FirstRunGuideAction.OpenCart(addFirstProduct = true), FirstRunGuide.action(FirstRunGuideStep.CUSTOMER, hasProduct = true, cartIsEmpty = true))
        assertEquals(FirstRunGuideAction.OpenCart(addFirstProduct = false), FirstRunGuide.action(FirstRunGuideStep.ORDER, hasProduct = true, cartIsEmpty = false))
        assertEquals(FirstRunGuideAction.OpenProductForm, FirstRunGuide.action(FirstRunGuideStep.CUSTOMER, hasProduct = false, cartIsEmpty = true))
    }

    // Settings row

    @Test
    fun `settings row sits under widget only when asked`() {
        val items = SettingsRows.sections("MERCHANT", hasPlan = false, showsGuide = true).first { it.group == SettingsGroup.ACCOUNT }.items
        assertEquals(listOf(SettingsItem.LANGUAGE, SettingsItem.WIDGET, SettingsItem.FIRST_RUN_GUIDE, SettingsItem.ADVANCED), items)
        val without = SettingsRows.sections("MERCHANT", hasPlan = false).first { it.group == SettingsGroup.ACCOUNT }.items
        assertEquals(listOf(SettingsItem.LANGUAGE, SettingsItem.WIDGET, SettingsItem.ADVANCED), without)
    }
}
