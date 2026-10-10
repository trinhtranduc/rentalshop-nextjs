package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #757: the reason under a Collected row comes from `revenueType`, not from the Vietnamese API text */
class EventReasonTest {
    private fun reasons(type: String, text: String, revenue: Double) =
        EventReason.parts(type, text, revenue).map { it.reason }

    @Test
    fun singleEventsMapFromTheType() {
        assertEquals(listOf(EventReason.DEPOSIT), reasons("RENT_DEPOSIT", "Thu tiền cọc", 100.0))
        assertEquals(listOf(EventReason.PICKUP), reasons("RENT_PICKUP", "", 100.0))
        assertEquals(listOf(EventReason.SALE_CREATED), reasons("SALE", "Đơn bán được tạo", 100.0))
        assertEquals(listOf(EventReason.SALE_CANCELLED), reasons("SALE_CANCELLED", "", -100.0))
        assertEquals(listOf(EventReason.RENT_CANCELLED), reasons("RENT_CANCELLED", "Đơn hủy (hoàn lại)", -100.0))
        assertEquals(listOf(EventReason.FUTURE_PICKUP), reasons("RENT_FUTURE_PICKUP", "", 10.0))
        assertEquals(listOf(EventReason.FUTURE_REFUND), reasons("RENT_FUTURE_RETURN", "", -10.0))
    }

    @Test
    fun returnUsesTheApiSentenceThenTheSign() {
        assertEquals(listOf(EventReason.SAME_DAY), reasons("RENT_RETURN", "Thuê và trả trong cùng ngày", 500.0))
        assertEquals(listOf(EventReason.DAMAGE_FEE), reasons("RENT_RETURN", "Thu phí hư hỏng", 50.0))
        assertEquals(listOf(EventReason.DEPOSIT_REFUND), reasons("RENT_RETURN", "Hoàn tiền cọc", -100.0))
        assertEquals(listOf(EventReason.DEPOSIT_REFUND), reasons("RENT_RETURN", "?", -5.0))
        assertEquals(listOf(EventReason.RETURN_COLLECTED), reasons("RENT_RETURN", "?", 5.0))
    }

    @Test
    fun multipleRowSplitsItsJoinedDescription() {
        assertEquals(
            listOf(EventReason.DEPOSIT, EventReason.PICKUP),
            reasons("MULTIPLE", "Thu tiền cọc + Thu tiền khi lấy hàng", 300.0),
        )
        assertEquals(listOf(EventReason.DEPOSIT, null), reasons("MULTIPLE", "Thu tiền cọc + Lạ", 300.0))
    }

    @Test
    fun unknownTypeKeepsTheApiText() {
        val parts = EventReason.parts("SOMETHING_NEW", "Văn bản", 1.0)
        assertNull(parts.single().reason)
        assertEquals("Văn bản", parts.single().text)
    }

    @Test
    fun collectedRowsCarryTheReasonsAndParseTheType() {
        val json = JSONObject(
            """{"days":[{"orders":[{"id":1,"orderNumber":"1","revenue":100,"revenueType":"RENT_DEPOSIT","description":"Thu tiền cọc"}]}]}""",
        )
        val items = OverviewRelated.pageFromJson(json).first
        assertEquals("RENT_DEPOSIT", items.single().revenueType)
        val rows = OverviewRelated.rows(OverviewRelatedKind.COLLECTED, items)
        assertEquals(listOf(EventReason.DEPOSIT), rows.single().reasons.map { it.reason })
    }
}
