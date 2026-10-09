package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #722: the rows behind an Overview figure add up to it (same rules as iOS and web) */
class OverviewRelatedTest {
    private fun row(
        id: Int,
        type: String = "RENT",
        status: String,
        total: Double = 0.0,
        deposit: Double = 0.0,
        revenue: Double = 0.0,
        collateral: Double? = null,
    ) = IncomeRow(id, "10000$id", type, status, revenue, "event $id", "Khách $id", total, deposit, collateral)

    @Test
    fun orderValueListsCancelledOrdersWithZero() {
        val rows = OverviewRelated.rows(
            OverviewRelatedKind.ORDER_VALUE,
            listOf(row(1, status = "RESERVED", total = 500.0), row(2, type = "SALE", status = "COMPLETED", total = 250.0), row(3, status = "CANCELLED", total = 700.0)),
        )
        assertEquals(listOf(500.0, 250.0, 0.0), rows.map { it.amount })
        assertEquals(RelatedNote.CANCELLED, rows[2].note)
        assertEquals(750.0, OverviewRelated.total(rows), 0.0)
    }

    /** "6 đơn chờ lấy" on the tile and 3 in the old list: the list now has the tile's orders */
    @Test
    fun outstandingListsWhatTheTileCounts() {
        val rows = OverviewRelated.rows(
            OverviewRelatedKind.OUTSTANDING,
            listOf(
                row(1, status = "RESERVED", total = 500.0, deposit = 200.0),
                row(2, status = "RESERVED", total = 300.0, deposit = 300.0),
                row(3, status = "PICKUPED", total = 900.0),
                row(4, type = "SALE", status = "RESERVED", total = 250.0),
                row(5, type = "SALE", status = "COMPLETED", total = 400.0),
                row(6, status = "CANCELLED", total = 700.0),
            ),
        )
        assertEquals(listOf(1, 4), rows.map { it.id })
        assertEquals(550.0, OverviewRelated.total(rows), 0.0)
    }

    /** #721: each event's collateral; a same-day hand-over then cancel moves none and is not listed */
    @Test
    fun collateralReadsTheRowCollateral() {
        val rows = OverviewRelated.rows(
            OverviewRelatedKind.COLLATERAL,
            listOf(
                row(1, status = "PICKUPED", revenue = 500.0, collateral = 300.0),
                row(2, status = "CANCELLED", collateral = 0.0),
                row(3, status = "RETURNED", revenue = -100.0, collateral = -100.0),
                row(4, status = "RESERVED", revenue = 50.0),
            ),
        )
        assertEquals(listOf(300.0, -100.0), rows.map { it.amount })
        assertEquals(listOf(RelatedNote.COLLATERAL_IN, RelatedNote.COLLATERAL_OUT), rows.map { it.note })
        assertEquals(200.0, OverviewRelated.total(rows), 0.0)
    }

    @Test
    fun collectedIsEachEventRevenue() {
        val rows = OverviewRelated.rows(OverviewRelatedKind.COLLECTED, listOf(row(1, status = "PICKUPED", revenue = 800.0), row(2, status = "CANCELLED", revenue = -300.0)))
        assertEquals(500.0, OverviewRelated.total(rows), 0.0)
        assertEquals("event 1", rows[0].description)
    }

    @Test
    fun pageKeepsAnOrderOnEachOfItsDays() {
        val (rows, hasMore) = OverviewRelated.pageFromJson(
            JSONObject(
                """{"days":[{"orders":[{"id":7,"orderNumber":"123456","orderType":"RENT","status":"PICKUPED","revenue":100,"collateral":50,"customerName":"An"}]},
                {"orders":[{"id":7,"orderNumber":"123456","orderType":"RENT","status":"PICKUPED","revenue":-50,"collateral":-50},{"id":0}]}],
                "pagination":{"hasMore":true}}""",
            ),
        )
        assertEquals(listOf(7, 7), rows.map { it.id })
        assertEquals(listOf(50.0, -50.0), rows.map { it.collateral })
        assertTrue(hasMore)
        val (older, more) = OverviewRelated.pageFromJson(JSONObject("""{"days":[{"orders":[{"id":1,"revenue":5}]}]}"""))
        assertNull(older.single().collateral)
        assertFalse(more)
    }

    /** Thực thu = cashCollected; an older API adds the collateral net to collected, or keeps collected */
    @Test
    fun heldCashPrefersCashCollected() {
        val report = OverviewLogic.reportFromJson(
            JSONObject("""{"revenue":{"collected":1000,"cashCollected":1600,"collateralFlow":{"received":900,"returned":300}}}"""),
        )
        assertEquals(1600.0, report.heldCash, 0.0)
        val older = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":1000,"collateralFlow":{"received":900,"returned":300}}}"""))
        assertEquals(1600.0, older.heldCash, 0.0)
        assertEquals(1000.0, OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":1000}}""")).heldCash, 0.0)
    }
}
