package com.anyrent.pos.res

import com.anyrent.pos.R
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.history.ChangeHistory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * #518 overlap setting and #519 order ⋯ sheet / change history: Vietnamese copy of boards CD-trung-lich, GH-trung-bat,
 * GH-trung-tat, CT-thao-tac, LS-don, LS-san-pham; both locales carry every key; the history arrays match the
 * Vietnamese defaults of [ChangeHistory].
 */
class Issue518519ResourcesTest {
    private fun root(folder: String): org.w3c.dom.Element {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
    }

    private fun elements(folder: String, tag: String): List<org.w3c.dom.Element> {
        val nodes = root(folder).getElementsByTagName(tag)
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
    }

    private fun strings(folder: String): Map<String, String> =
        elements(folder, "string").associate { it.getAttribute("name") to it.textContent }

    private fun array(folder: String, name: String): Array<String> {
        val node = elements(folder, "string-array").first { it.getAttribute("name") == name }
        val items = node.getElementsByTagName("item")
        return Array(items.length) { items.item(it).textContent }
    }

    private val boardVietnamese = mapOf(
        "settings_v2_group_orders" to "Đơn hàng",
        "settings_v2_allow_overlap" to "Cho tạo đơn khi trùng lịch",
        "settings_v2_allow_overlap_hint" to "Tắt thì không tạo được đơn khi đồ đã được thuê hết trong những ngày đó.",
        "api_error_order_schedule_conflict" to "Cửa hàng không cho tạo đơn trùng lịch. Đổi ngày, bớt số lượng hoặc bỏ món đã hết.",
        "v2_cart_overlap_blocked" to "Cửa hàng không cho tạo đơn trùng lịch. Đổi ngày, bớt số lượng hoặc bỏ món đã hết.",
        // #684 (owner 2026-10-09): the cart tag shows the days only
        "v2_cart_overlap_one_day" to "Hết %1\$s",
        "v2_cart_overlap_range" to "Hết %1\$s → %2\$s",
        "v2_create_overlap_title" to "Trùng lịch",
        "v2_create_overlap_line" to "%1\$s thiếu %2\$d bộ ngày %3\$s (đã thuê ở %4\$s).",
        "v2_create_anyway" to "Vẫn tạo đơn",
        "order_sheet_title" to "Đơn #%1\$s",
        "order_sheet_print" to "In hoá đơn",
        "order_sheet_printer" to "Máy in %1\$s",
        "order_sheet_notes" to "Ghi chú",
        "order_sheet_notes_with_text" to "Có 1 ghi chú",
        "order_sheet_history" to "Lịch sử thay đổi",
        "order_sheet_cancel" to "Huỷ đơn",
        "order_sheet_cancel_hint" to "Đơn chuyển sang Đã huỷ, không tính doanh thu",
        "order_sheet_delete" to "Xoá đơn",
        "history_title" to "Lịch sử thay đổi",
        "history_order_subtitle" to "Đơn #%1\$s · %2\$s",
        "history_today" to "HÔM NAY · %1\$s",
        "history_weekdays" to "T2,T3,T4,T5,T6,T7,CN",
        "history_staff_name" to "%1\$s (nhân viên)",
        "history_count" to "%1\$d lần thay đổi · gần nhất %2\$s",
        "history_latest_today" to "%1\$s hôm nay",
    )

    @Test fun vietnameseMatchesBoards() {
        val vi = strings("values-vi")
        boardVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
    }

    @Test fun bothLocalesCarryEveryNewKey() {
        val en = strings("values")
        val vi = strings("values-vi")
        val newKeys = vi.keys.filter {
            it.startsWith("order_sheet_") || it.startsWith("history_") || it.startsWith("v2_cart_overlap") ||
                it.startsWith("v2_create_overlap") || it.startsWith("settings_v2_allow_overlap") ||
                it in setOf("settings_v2_group_orders", "v2_create_anyway", "api_error_order_schedule_conflict")
        }
        assertTrue(newKeys.size >= 40)
        newKeys.forEach { assertTrue("missing in values: $it", en.containsKey(it)) }
    }

    @Test fun historyArraysMatchDefaultsAndLocales() {
        val pairs = listOf(
            "history_kinds" to ChangeHistory.DEFAULT_KINDS,
            "history_fields" to ChangeHistory.DEFAULT_FIELDS,
            "history_values" to ChangeHistory.DEFAULT_VALUES,
        )
        pairs.forEach { (name, defaults) ->
            val vi = ChangeHistory.pairs(array("values-vi", name))
            val en = ChangeHistory.pairs(array("values", name))
            assertEquals(name, defaults, vi)
            assertEquals(name, vi.keys, en.keys)
        }
    }

    @Test fun every519KindHasATitle() {
        val kinds = listOf(
            "ORDER_CREATED", "ORDER_EDITED", "ORDER_ITEMS", "ORDER_ITEM_PRICE", "ORDER_DEPOSIT", "ORDER_PAYMENT", "ORDER_NOTE",
            "ORDER_PICKED_UP", "ORDER_RETURNED", "ORDER_COMPLETED", "ORDER_CANCELLED", "ORDER_RESTORED", "ORDER_DELETED",
            "PRODUCT_CREATED", "PRODUCT_EDITED", "PRODUCT_PRICE", "PRODUCT_STOCK", "PRODUCT_IMAGES", "PRODUCT_DELETED",
            "PRODUCT_RESTORED", "OTHER",
        )
        val vi = ChangeHistory.pairs(array("values-vi", "history_kinds"))
        kinds.forEach { assertTrue(it, vi.containsKey(it)) }
    }

    @Test fun scheduleConflictCodeIsMapped() {
        assertEquals(R.string.api_error_order_schedule_conflict, ApiErrorMessages.stringId("ORDER_SCHEDULE_CONFLICT"))
    }
}
