package com.anyrent.pos.res

import com.anyrent.pos.R
import com.anyrent.pos.ui.orders.v2.OrderStatusTag
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #482 — Vietnamese copy of the mobile UI bundle equals the iOS strings (iOS is the reference) */
class Issue482ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val root = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
        val nodes = root.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val iosVietnamese = mapOf(
        // Item 6: status names and task tags
        "orders_v2_tag_hand_over" to "Cần giao",
        "orders_v2_tag_take_back" to "Cần trả",
        "orders_v2_status_reserved" to "Đã đặt",
        "orders_v2_status_renting" to "Đang thuê",
        "orders_v2_status_returned" to "Đã trả",
        "orders_v2_status_completed" to "Hoàn thành",
        "orders_v2_status_cancelled" to "Đã huỷ",
        "status_cancelled" to "Đã huỷ",
        // Item 1: orders by product / customer
        "orders_entity_free" to "Còn %1\$d hôm nay",
        "orders_entity_tile_orders" to "Số đơn",
        "orders_entity_tile_rentals" to "Lượt thuê",
        "orders_entity_tile_revenue" to "Doanh thu",
        "orders_entity_tile_spent" to "Đã chi",
        "orders_entity_tile_renting" to "Đang thuê",
        "orders_entity_section" to "ĐƠN HÀNG",
        // Item 4: cart pricing sheet
        "v2_pricing_title" to "Cách tính giá",
        "v2_pricing_enter_price" to "Nhập giá",
        "v2_pricing_price_field" to "Giá cho đơn này",
        "v2_pricing_note" to "Chỉ áp dụng cho đơn này, không đổi giá sản phẩm.",
        "v2_pricing_apply" to "Áp dụng",
        "v2_pricing_block" to "Theo block",
        "v2_price_per_rental" to "Theo lần",
        "v2_price_per_day" to "Theo ngày",
    )

    @Test
    fun vietnameseMatchesIos() {
        val vi = strings("values-vi")
        iosVietnamese.forEach { (name, text) -> assertEquals(name, text, vi[name]) }
    }

    @Test
    fun englishHasEveryKey() {
        val en = strings("values")
        iosVietnamese.keys.forEach { assertEquals("$it missing in values", true, en[it]?.isNotBlank()) }
    }

    /** The order detail header tag reads the same string as the list row tag, for every status */
    @Test
    fun detailTagUsesListStatusNames() {
        val expected = mapOf(
            "RESERVED" to R.string.orders_v2_status_reserved,
            "PICKUPED" to R.string.orders_v2_status_renting,
            "PICKED_UP" to R.string.orders_v2_status_renting,
            "RETURNED" to R.string.orders_v2_status_returned,
            "COMPLETED" to R.string.orders_v2_status_completed,
            "CANCELLED" to R.string.orders_v2_status_cancelled,
        )
        expected.forEach { (status, res) -> assertEquals(status, res, OrderStatusTag.labelRes(status)) }
        val vi = strings("values-vi")
        assertEquals(
            listOf("Đã đặt", "Đang thuê", "Đang thuê", "Đã trả", "Hoàn thành", "Đã huỷ"),
            expected.keys.map { status ->
                val name = when (OrderStatusTag.labelRes(status)) {
                    R.string.orders_v2_status_reserved -> "orders_v2_status_reserved"
                    R.string.orders_v2_status_renting -> "orders_v2_status_renting"
                    R.string.orders_v2_status_returned -> "orders_v2_status_returned"
                    R.string.orders_v2_status_completed -> "orders_v2_status_completed"
                    else -> "orders_v2_status_cancelled"
                }
                vi[name]
            },
        )
    }
}
