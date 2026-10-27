package com.anyrent.pos.domain.overview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1273: Thế chân in two sections, "Đang giữ" (state) and "Phát sinh hôm nay" (flow); same rules as iOS and web */
class CollateralSectionsTest {
    private fun row(id: Int, amount: Double, held: Boolean) =
        RelatedRow(id, "$id", "", if (held) RelatedNote.HELD else if (amount > 0) RelatedNote.COLLATERAL_IN else RelatedNote.COLLATERAL_OUT, "", amount = amount)

    /** The mockup example: 16 held (16.200.000), 8 received (+6.400.000), 2 returned (−4.000.000); order 103 is in both */
    private val heldRows = listOf(
        2_000_000.0, 1_000_000.0, 1_000_000.0, 500_000.0, 500_000.0, 800_000.0, 500_000.0, 500_000.0,
        500_000.0, 400_000.0, 1_500_000.0, 2_500_000.0, 1_000_000.0, 1_500_000.0, 1_500_000.0, 500_000.0,
    ).mapIndexed { i, a -> row(100 + i, a, held = true) }
    private val flowRows = listOf(
        row(111, 2_500_000.0, false), row(103, 500_000.0, false), row(121, -3_000_000.0, false), row(122, 500_000.0, false),
        row(123, 500_000.0, false), row(124, 500_000.0, false), row(125, 500_000.0, false), row(126, 1_000_000.0, false),
        row(127, 400_000.0, false), row(128, -1_000_000.0, false),
    )

    @Test
    fun splitsAndTotalsTheMockupExample() {
        val s = OverviewRelated.sections(heldRows, 16, heldRows + flowRows)
        assertEquals(16, s.held.size)
        assertEquals(16_200_000.0, s.heldTotal, 0.0)
        assertEquals(16, s.heldOrders)
        assertTrue(s.heldTotalKnown)
        assertEquals(8, s.received.size)
        assertEquals(2, s.returned.size)
        assertEquals(6_400_000.0, s.receivedTotal, 0.0)
        assertEquals(8, s.receivedOrders)
        assertEquals(4_000_000.0, s.returnedTotal, 0.0)
        assertEquals(2, s.returnedOrders)
        assertEquals(2_400_000.0, s.net, 0.0)
        assertTrue((s.received + s.returned).none { it.note == RelatedNote.HELD })
        assertTrue(s.received.all { it.amount > 0 } && s.returned.all { it.amount < 0 })
    }

    @Test
    fun anOrderInBothSectionsIsCountedOncePerSectionAndNeverAddedAcross() {
        val s = OverviewRelated.sections(heldRows, 16, heldRows + flowRows)
        assertTrue(s.held.any { it.id == 103 })
        assertTrue(s.received.any { it.id == 103 })
        assertEquals(16_200_000.0, s.heldTotal, 0.0)
        assertEquals(s.receivedTotal - s.returnedTotal, s.net, 0.0)
    }

    @Test
    fun countsDistinctOrdersWhenAnOrderMovesOnTwoDays() {
        val s = OverviewRelated.sections(emptyList(), 0, listOf(row(1, 300.0, false), row(1, 200.0, false), row(2, -100.0, false)))
        assertEquals(500.0, s.receivedTotal, 0.0)
        assertEquals(1, s.receivedOrders)
        assertEquals(1, s.returnedOrders)
        assertEquals(400.0, s.net, 0.0)
    }

    @Test
    fun heldTotalIsHiddenWhenTheListIsCutByTheApiLimit() {
        assertFalse(OverviewRelated.sections(heldRows, 600, heldRows).heldTotalKnown)
        assertEquals(600, OverviewRelated.sections(heldRows, 600, heldRows).heldOrders)
        assertTrue(OverviewRelated.sections(heldRows, null, heldRows).heldTotalKnown)
    }

    @Test
    fun heldCountComesFromTheOutletOperationsGroup() {
        val json = org.json.JSONObject("""{"collateralHeld":{"count":3,"orders":[{"id":7,"securityDeposit":5}]}}""")
        assertEquals(3, OverviewRelated.heldCount(json))
        assertEquals(null, OverviewRelated.heldCount(org.json.JSONObject("{}")))
    }

    @Test
    fun flowIsTodayOnlyForTheOneDayRangeOfToday() {
        assertTrue(OverviewRelated.flowIsToday("2026-10-27", "2026-10-27", "2026-10-27"))
        assertFalse(OverviewRelated.flowIsToday("2026-10-27", "2026-10-27", "2026-10-28"))
        assertFalse(OverviewRelated.flowIsToday("2026-10-21", "2026-10-27", "2026-10-27"))
        assertEquals("27/10", OverviewRelated.dayMonth("2026-10-27"))
    }

    private val keys = listOf(
        "overview_v2_related_collateral_note", "overview_v2_related_collateral_note_period",
        "overview_v2_related_collateral_held_title", "overview_v2_related_collateral_held_hint", "overview_v2_related_collateral_held_total",
        "overview_v2_related_collateral_flow_title", "overview_v2_related_collateral_flow_title_period",
        "overview_v2_related_collateral_flow_hint", "overview_v2_related_collateral_flow_hint_period",
        "overview_v2_related_collateral_flow_in", "overview_v2_related_collateral_flow_out",
        "overview_v2_related_collateral_flow_net", "overview_v2_related_collateral_flow_net_period",
    )

    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.associate { it.getAttribute("name") to it.textContent }
    }

    @Test
    fun stringsExistInEnglishAndVietnamese() {
        for (folder in listOf("values", "values-vi")) {
            val map = strings(folder)
            for (key in keys) assertNotNull("$folder $key", map[key])
        }
    }
}
