package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #484 — Vietnamese copy of the overview money, rented-out list and store form (boards Tong-quan*, DT-dang-thue, CH-sua) */
class Issue484ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val root = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
        val nodes = root.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val boardVietnamese = mapOf(
        "overview_v2_collected" to "Tiền đã thu",
        "overview_v2_total_order_value" to "Tổng giá trị đơn",
        "overview_v2_outstanding" to "Còn phải thu",
        "overview_v2_chart_money" to "Tiền thu",
        "overview_v2_chart_orders" to "Số đơn",
        "overview_v2_top_rented" to "Thuê nhiều nhất · theo giá trị đơn",
        "overview_v2_info_ok" to "Đã hiểu",
        "overview_v2_info_cancelled" to "Đơn huỷ",
        "overview_v2_info_refunds" to "trừ lại tiền đã hoàn",
        "rented_out_title" to "Đang cho thuê · %1\$d",
        "rented_out_late" to "Trễ hạn trả · %1\$d",
        "rented_out_on_time" to "Còn hạn · %1\$d",
        "store_v2_name" to "Tên cửa hàng",
        "store_v2_street" to "Số nhà, đường",
        "store_v2_state" to "Phường / Quận",
        "store_v2_city" to "Tỉnh / Thành phố",
        "store_v2_country" to "Quốc gia",
        "store_v2_postal" to "Mã bưu chính",
        "store_v2_optional" to "(không bắt buộc)",
        "store_v2_description" to "Mô tả",
    )

    @Test
    fun vietnameseMatchesBoards() {
        val vi = strings("values-vi")
        boardVietnamese.forEach { (name, text) -> assertEquals(name, text, vi[name]) }
    }

    @Test
    fun everyLocaleHasEveryNewKey() {
        val en = strings("values")
        val vi = strings("values-vi")
        val keys = en.keys.filter { it.startsWith("overview_v2_") || it.startsWith("rented_out_") || it.startsWith("store_v2_") }
        keys.forEach { assertEquals("$it missing in values-vi", true, vi[it]?.isNotBlank()) }
        boardVietnamese.keys.forEach { assertEquals("$it missing in values", true, en[it]?.isNotBlank()) }
    }

    /** Owner decided 2026-10-06: collected money leaves collateral out, and the sheet says so */
    @Test
    fun explanationSaysCollateralIsNotCounted() {
        val vi = strings("values-vi")
        assertEquals("Thế chấp (giấy tờ, tiền)", vi["overview_v2_info_collateral"])
        assertEquals("không tính", vi["overview_v2_info_not_counted"])
    }
}
