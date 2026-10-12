package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #888 — Vietnamese copy of the one-date sort sheet, the sort bar, "Lấy" for "Giao", and the cart cost lines */
class Issue888ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val mockupVietnamese = mapOf(
        "orders_v2_sort_date_pickup" to "Ngày lấy",
        "orders_v2_sort_date_return" to "Ngày trả",
        "orders_v2_sort_date_created" to "Ngày tạo",
        "orders_v2_direction_nearest" to "Gần nhất trước",
        "orders_v2_direction_farthest" to "Xa nhất trước",
        "orders_v2_direction_newest" to "Mới nhất trước",
        "orders_v2_direction_oldest" to "Cũ nhất trước",
        "orders_v2_sort_bar" to "Xếp theo %1\$s · %2\$s",
        "orders_v2_filter_sort_by" to "Xếp theo",
        "orders_v2_filter_order" to "Thứ tự",
        "orders_v2_filter_range_of" to "Khoảng %1\$s",
        "orders_v2_filter_same_date" to "Sắp xếp và khoảng ngày cùng tính theo %1\$s.",
        "detail_step_hand_over" to "Lấy",
        "detail_step_handed_over" to "Đã lấy",
        "v2_cart_cost" to "Giá vốn",
        "v2_cart_total_cost" to "Tổng giá vốn",
        "v2_cart_profit" to "Lãi dự kiến",
        "detail_created_by" to "Người tạo: %1\$s",
    )

    @Test
    fun vietnameseMatchesMockup() {
        val vi = strings("values-vi")
        mockupVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
    }

    @Test
    fun englishHasEveryKey() {
        val en = strings("values")
        mockupVietnamese.keys.forEach { assertTrue("$it missing in values", en[it]?.isNotBlank() == true) }
    }
}
