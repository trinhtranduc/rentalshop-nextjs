package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #496 — Vietnamese copy of "Việc hôm nay", "Chưa lấy đồ" and the order row date lines (boards Tong-quan, DT-chua-lay, Main) */
class Issue496ResourcesTest {
    private fun root(folder: String): org.w3c.dom.Element {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
    }

    private fun strings(folder: String): Map<String, String> {
        val nodes = root(folder).getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private fun plural(folder: String, name: String): Map<String, String> {
        val nodes = root(folder).getElementsByTagName("plurals")
        val node = (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.first { it.getAttribute("name") == name }
        val items = node.getElementsByTagName("item")
        return (0 until items.length).associate { j ->
            val item = items.item(j) as org.w3c.dom.Element
            item.getAttribute("quantity") to item.textContent
        }
    }

    private val boardVietnamese = mapOf(
        "order_row_weekdays" to "T2,T3,T4,T5,T6,T7,CN",
        "order_row_created" to "tạo %1\$s",
        "order_row_hand_over" to "Giao %1\$s",
        "order_row_hand_over_return" to "trả %1\$s",
        "order_row_returns" to "Trả %1\$s",
        "order_row_return_due" to "Hạn trả %1\$s",
        "order_row_returned" to "Đã trả %1\$s",
        "order_row_sold" to "Bán %1\$s",
        "order_row_cancelled" to "Huỷ %1\$s",
        "overview_v2_today_work" to "Việc hôm nay",
        "overview_v2_pickups_today" to "Cần giao hôm nay",
        "overview_v2_pickups_done" to "Đã giao %1\$d/%2\$d",
        "overview_v2_returns_today" to "Cần nhận trả hôm nay",
        "overview_v2_returns_done" to "Đã nhận %1\$d/%2\$d",
        "overview_v2_no_shows" to "Quá ngày lấy, khách chưa đến",
        "not_picked_up" to "Chưa lấy đồ",
        "not_picked_up_title" to "Chưa lấy đồ · %1\$d",
        "not_picked_up_overdue" to "Quá ngày lấy, chưa thu · %1\$d",
        "not_picked_up_upcoming" to "Sẽ thu khi khách lấy đồ · %1\$d",
        "orders_v2_pay_due" to "còn thu %1\$s",
        "v2_detail_state_pickup_today" to "Giao hôm nay",
        "v2_detail_state_pickup_on" to "Giao %1\$s",
    )

    @Test
    fun vietnameseMatchesBoards() {
        val vi = strings("values-vi")
        boardVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
        assertEquals(mapOf("other" to "Quá %1\$d ngày · nên gọi khách"), plural("values-vi", "not_picked_up_overdue_days"))
    }

    @Test
    fun englishHasEveryKey() {
        val en = strings("values")
        boardVietnamese.keys.forEach { assertTrue("$it missing in values", en[it]?.isNotBlank() == true) }
        assertEquals(7, en.getValue("order_row_weekdays").split(',').size)
        assertEquals(setOf("one", "other"), plural("values", "not_picked_up_overdue_days").keys)
    }

    /** The old "tạo 28/09 · hạn 02/10" templates are gone with the product line */
    @Test
    fun oldDateLineTemplatesRemoved() {
        listOf("values", "values-vi").forEach { folder ->
            val names = strings(folder).keys
            assertTrue(names.none { it.startsWith("orders_v2_when_") })
        }
    }
}
