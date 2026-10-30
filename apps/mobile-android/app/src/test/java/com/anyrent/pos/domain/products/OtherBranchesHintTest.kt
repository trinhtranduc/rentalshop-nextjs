package com.anyrent.pos.domain.products

import com.anyrent.pos.data.UserRole
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * #1353 (#1335 PR 2m), iOS `OtherBranchesHintTests`: "Chi nhánh khác còn N" in the cart: who asks, which lines, the body
 * (shop days), the text and the decoding.
 */
class OtherBranchesHintTest {
    private fun stock(id: Int, name: String, available: Int) = OtherBranchStock(id, name, available)

    private val oct30 = LocalDate.of(2026, 10, 30)
    private val oct31 = LocalDate.of(2026, 10, 31)

    // Who asks

    @Test
    fun onlyTheOwnerAndTheBranchManagersAndStockKeepersCanAsk() {
        assertTrue(OtherBranchesHint.canAsk(UserRole.MERCHANT))
        assertTrue(OtherBranchesHint.canAsk(UserRole.OUTLET_ADMIN))
        assertTrue(OtherBranchesHint.canAsk(UserRole.OUTLET_INVENTORY))
        assertFalse(OtherBranchesHint.canAsk(UserRole.OUTLET_STAFF))
        assertFalse(OtherBranchesHint.canAsk(UserRole.UNKNOWN))
        assertFalse(OtherBranchesHint.canAsk(null))
    }

    @Test
    fun theOwnerAsksOnlyWithTwoOrMoreActiveBranches() {
        assertFalse(OtherBranchesHint.asks(UserRole.MERCHANT, 0))
        assertFalse(OtherBranchesHint.asks(UserRole.MERCHANT, 1))
        assertTrue(OtherBranchesHint.asks(UserRole.MERCHANT, 2))
        assertTrue(OtherBranchesHint.asks(UserRole.MERCHANT, 3))
    }

    @Test
    fun aBranchRoleAsksUnlessTheShopIsKnownToHaveOneBranch() {
        // A branch role cannot count the shop's branches (count 0); the API answers [] for a one-branch shop
        assertTrue(OtherBranchesHint.asks(UserRole.OUTLET_ADMIN, 0))
        assertTrue(OtherBranchesHint.asks(UserRole.OUTLET_INVENTORY, 0))
        assertTrue(OtherBranchesHint.asks(UserRole.OUTLET_ADMIN, 3))
        assertFalse(OtherBranchesHint.asks(UserRole.OUTLET_ADMIN, 1))
    }

    @Test
    fun staffNeverAsksWhateverTheBranchCount() {
        for (count in listOf(0, 1, 2, 5)) assertFalse(OtherBranchesHint.asks(UserRole.OUTLET_STAFF, count))
        assertFalse(OtherBranchesHint.asks(null, 3))
        assertFalse(OtherBranchesHint.asks(UserRole.UNKNOWN, 3))
    }

    // Which lines

    @Test
    fun onlyLinesShortOfStockAreAsked() {
        val quantities = mapOf(5 to 1, 3 to 1, 9 to 2, 7 to 1)
        val available = mapOf(5 to 0, 3 to 4, 9 to 1) // 7 not loaded yet
        assertEquals(listOf(5, 9), OtherBranchesHint.shortProductIds(quantities, available, emptySet()))
    }

    @Test
    fun aProductOnSeveralLinesIsAskedOnceWithItsSummedUnits() {
        // 1 free, two lines of 1 each: together they ask for 2 (the caller sums the lines, as the cart does)
        val quantities = mapOf(8 to 2, 2 to 1)
        val available = mapOf(8 to 1, 2 to 0)
        assertEquals(listOf(2, 8), OtherBranchesHint.shortProductIds(quantities, available, emptySet()))
    }

    @Test
    fun aScheduleConflictCountsAsShortAndNothingIsAskedWhenAllFit() {
        val quantities = mapOf(4 to 1, 6 to 1)
        val available = mapOf(4 to 3, 6 to 3)
        assertEquals(listOf(6), OtherBranchesHint.shortProductIds(quantities, available, setOf(6)))
        assertEquals(emptyList<Int>(), OtherBranchesHint.shortProductIds(quantities, available, emptySet()))
        assertEquals(emptyList<Int>(), OtherBranchesHint.shortProductIds(emptyMap(), available, setOf(6)))
    }

    // Body (shop days)

    @Test
    fun aOneDayRentalSendsTheShopDay() {
        val body = OtherBranchesHint.requestBody(listOf(5, 9), false, oct30, oct30, 7)!!
        assertEquals("RENT", body.getString("orderType"))
        assertEquals("2026-10-30", body.getString("date"))
        assertFalse(body.has("startDate"))
        assertFalse(body.has("endDate"))
        assertEquals(7, body.getInt("outletId"))
        val products = body.getJSONArray("products")
        assertEquals(listOf(5, 9), (0 until products.length()).map { products.getJSONObject(it).getInt("productId") })
        assertEquals(listOf(1, 1), (0 until products.length()).map { products.getJSONObject(it).getInt("quantity") })
    }

    @Test
    fun aManyDayRentalSendsTheShopDayBounds() {
        // 30/10 00:00 Vietnam = 29/10 17:00Z; the last second of 31/10 Vietnam = 31/10 16:59:59Z
        val body = OtherBranchesHint.requestBody(listOf(5), false, oct30, oct31, null)!!
        assertFalse(body.has("date"))
        assertEquals("2026-10-29T17:00:00.000Z", body.getString("startDate"))
        assertEquals("2026-10-31T16:59:59.000Z", body.getString("endDate"))
        assertFalse(body.has("outletId"))
    }

    @Test
    fun aSaleSendsNoDay() {
        val body = OtherBranchesHint.requestBody(listOf(5), true, null, null, 3)!!
        assertEquals("SALE", body.getString("orderType"))
        assertFalse(body.has("date"))
        assertFalse(body.has("startDate"))
        assertEquals(3, body.getInt("outletId"))
    }

    @Test
    fun nothingToAskGivesNoBody() {
        assertNull(OtherBranchesHint.requestBody(emptyList(), false, oct30, oct30, 1))
        assertNull(OtherBranchesHint.requestBody(listOf(5), false, null, oct30, 1))
        assertNull(OtherBranchesHint.requestBody(listOf(5), false, oct30, null, 1))
        assertEquals("/api/products/other-outlets-availability", OtherBranchesHint.PATH)
    }

    // Key (an answer for another question no longer applies)

    @Test
    fun theKeyFollowsTheShopDaysTheBranchAndTheProducts() {
        val a = OtherBranchesHint.key(listOf(5, 9), false, oct30, oct30, 1, oct30)
        assertTrue(a.isNotEmpty())
        assertEquals(a, OtherBranchesHint.key(listOf(5, 9), false, oct30, oct30, 1, oct31))
        assertNotEquals(a, OtherBranchesHint.key(listOf(5, 9), false, oct31, oct31, 1, oct30))
        assertNotEquals(a, OtherBranchesHint.key(listOf(5, 9), false, oct30, oct30, 7, oct30))
        assertNotEquals(a, OtherBranchesHint.key(listOf(5), false, oct30, oct30, 1, oct30))
        assertNotEquals(a, OtherBranchesHint.key(listOf(5, 9), true, null, null, 1, oct30))
        assertEquals("", OtherBranchesHint.key(emptyList(), false, null, null, 1, oct30))
        assertEquals("", OtherBranchesHint.key(listOf(5), false, null, oct30, 1, oct30))
    }

    // Text

    @Test
    fun theListIsTheNamesAndCountsInTheOrderTheApiSends() {
        assertEquals("Quận 7 (3), Thủ Đức (1)", OtherBranchesHint.list(listOf(stock(7, "Quận 7", 3), stock(9, "Thủ Đức", 1))))
        assertEquals("Quận 7 (3)", OtherBranchesHint.list(listOf(stock(7, "Quận 7", 3))))
        assertEquals("", OtherBranchesHint.list(emptyList()))
    }

    @Test
    fun aManyBranchListShowsTheFirstThreeAndTheRest() {
        val many = listOf(stock(2, "A", 5), stock(3, "B", 4), stock(4, "C", 3), stock(5, "D", 2), stock(6, "E", 1))
        assertEquals("A (5), B (4), C (3), +2", OtherBranchesHint.list(many))
        assertEquals("A (5), B (4), C (3)", OtherBranchesHint.list(many.take(3)))
        assertEquals("A (5), B (4), C (3), +1", OtherBranchesHint.list(many.take(4)))
    }

    // Decoding (an older or newer API never breaks the cart)

    @Test
    fun theAnswerIsReadByProduct() {
        val json = JSONObject(
            """{"results":[{"productId":5,"outlets":[{"outletId":7,"outletName":"Quận 7","available":3},{"outletId":9,"outletName":"Thủ Đức","available":1}]},{"productId":9,"outlets":[]}],"extra":1}""",
        )
        val hints = OtherBranchesHint.parse(json)
        assertEquals(listOf("Quận 7", "Thủ Đức"), hints[5]?.map { it.outletName })
        assertEquals(listOf(3, 1), hints[5]?.map { it.available })
        assertNull(hints[9])
    }

    @Test
    fun missingKeysAndEmptyAnswersGiveNoHints() {
        for (raw in listOf("{}", """{"results":[]}""", """{"results":[{"productId":5}]}""", """{"results":[{"productId":5,"outlets":null}]}""")) {
            assertTrue(raw, OtherBranchesHint.parse(JSONObject(raw)).isEmpty())
        }
        assertTrue(OtherBranchesHint.parse(null).isEmpty())
    }

    @Test
    fun aBranchWithoutANameOrWithNoUnitsIsDropped() {
        val json = JSONObject(
            """{"results":[{"productId":5,"outlets":[{"outletId":7,"available":3},{"outletId":8,"outletName":"Quận 8","available":0},{"outletId":9,"outletName":"Thủ Đức","available":2}]}]}""",
        )
        assertEquals(listOf(9), OtherBranchesHint.parse(json)[5]?.map { it.outletId })
    }
}
