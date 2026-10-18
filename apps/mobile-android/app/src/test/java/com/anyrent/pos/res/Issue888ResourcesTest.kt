package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #888 — Vietnamese copy of the one-date sort sheet, the sort bar and "Lấy" for "Giao" (cart cost lines removed in #1007) */
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
        // #1056: `desc` puts the latest date first, `asc` the earliest
        "orders_v2_direction_nearest" to "Mới nhất trước",
        "orders_v2_direction_farthest" to "Cũ nhất trước",
        "orders_v2_direction_newest" to "Mới nhất trước",
        "orders_v2_direction_oldest" to "Cũ nhất trước",
        "orders_v2_sort_bar" to "Xếp theo %1\$s · %2\$s",
        "orders_v2_filter_sort_by" to "Xếp theo",
        "orders_v2_filter_order" to "Thứ tự",
        "orders_v2_filter_range_of" to "Khoảng %1\$s",
        "orders_v2_filter_same_date" to "Sắp xếp và khoảng ngày cùng tính theo %1\$s.",
        "detail_step_hand_over" to "Lấy",
        "detail_step_handed_over" to "Đã lấy",
        "detail_created_by" to "Người tạo: %1\$s",
    )

    @Test
    fun vietnameseMatchesMockup() {
        val vi = strings("values-vi")
        mockupVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
    }

    /** #1007 (owner 2026-10-17): the cart never shows cost price for any role; its strings are gone in both locales */
    @Test
    fun cartCostStringsRemoved() {
        listOf("values", "values-vi").forEach { folder ->
            val res = strings(folder)
            listOf("v2_cart_cost", "v2_cart_total_cost", "v2_cart_profit").forEach { assertFalse("$it in $folder", res.containsKey(it)) }
        }
    }

    /** #1056: the pickup/return directions say what the list does (English was already right) */
    @Test
    fun englishDirectionsMatchTheOrder() {
        val en = strings("values")
        assertEquals("Latest first", en["orders_v2_direction_nearest"])
        assertEquals("Earliest first", en["orders_v2_direction_farthest"])
    }

    @Test
    fun englishHasEveryKey() {
        val en = strings("values")
        mockupVietnamese.keys.forEach { assertTrue("$it missing in values", en[it]?.isNotBlank() == true) }
    }
}
