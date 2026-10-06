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
        "overview_v2_collected" to "Thực thu",
        "overview_v2_outstanding" to "Còn phải thu",
        "overview_v2_chart_money" to "Thực thu",
        "overview_v2_chart_orders" to "Số đơn",
        "overview_v2_top_rented" to "Thuê nhiều nhất · theo giá trị đơn",
        // #492 board Tong-quan, Tong-quan-giai-thich
        "overview_v2_new_order_value" to "Tổng giá trị đơn mới",
        "overview_v2_vs_previous_period" to "so với kỳ trước",
        "overview_v2_excludes_cancelled" to "không tính đơn huỷ",
        "overview_v2_outstanding_sub" to "Của các đơn mới",
        "overview_v2_collected_tile_accessibility" to "Thực thu %1\$s, xem chi tiết",
        "overview_v2_collateral_held" to "Thế chân đang giữ",
        "overview_v2_info_body" to "Tiền khách thực trả cho cửa hàng, tính theo ngày nhận tiền.",
        "overview_v2_info_deposit" to "Cọc khi tạo đơn",
        "overview_v2_info_remaining" to "Thu khi giao đồ, bán hàng",
        "overview_v2_info_fees" to "Phí hư hỏng, trễ hạn",
        "overview_v2_info_cancelled" to "Hoàn tiền đơn huỷ",
        "overview_v2_info_note" to "Tổng giá trị đơn là tiền các đơn tạo trong kỳ, kể cả phần chưa trả; Còn phải thu là phần chưa trả đó.",
        "close" to "Đóng",
        // #494 "Tiền thực nhận" and "Còn phải thu" sheets
        "overview_v2_collected_excludes_collateral" to "Không gồm thế chân",
        "overview_v2_received_title" to "Tiền thực nhận",
        "overview_v2_received_total" to "Tổng tiền đã nhận, gồm thế chân",
        "overview_v2_collected_shop" to "Tiền của tiệm",
        "overview_v2_collateral" to "Thế chân",
        "overview_v2_collateral_sub" to "Giữ hộ, sẽ trả lại khách",
        "overview_v2_collateral_received" to "Đã nhận khi giao đồ",
        "overview_v2_collateral_returned" to "Đã trả lại khi khách trả đồ",
        "overview_v2_collateral_upcoming" to "THẾ CHÂN SẮP TỚI",
        "overview_v2_collateral_upcoming_note" to "chưa tính vào số nào",
        "overview_v2_collateral_to_return" to "Sẽ trả lại khách",
        "overview_v2_collateral_to_return_orders" to "%1\$d đơn đang thuê",
        "overview_v2_collateral_to_collect" to "Sẽ nhận khi giao đồ",
        "overview_v2_collateral_to_collect_orders" to "%1\$d đơn chưa lấy",
        "overview_v2_outstanding_tile_accessibility" to "Còn phải thu %1\$s, xem chi tiết",
        "overview_v2_outstanding_body" to "Phần chưa trả của các đơn tạo trong kỳ. Thế chân không tính ở đây.",
        "overview_v2_outstanding_at_pickup" to "Sẽ thu khi khách lấy đồ",
        "overview_v2_outstanding_at_pickup_orders" to "%1\$d đơn · ngày lấy từ hôm nay",
        "overview_v2_outstanding_overdue" to "Quá ngày lấy, chưa thu",
        "overview_v2_outstanding_overdue_orders" to "%1\$d đơn · nên gọi khách",
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

    /** #494: "Tiền đã vào tiệm" is gone; the tile says it leaves collateral out */
    @Test
    fun collectedTileSubLineReplaced() {
        assertEquals(null, strings("values-vi")["overview_v2_collected_sub"])
        assertEquals(null, strings("values")["overview_v2_collected_sub"])
    }

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
        assertEquals("Không tính vào thực thu vì sẽ trả lại khách.", vi["overview_v2_info_collateral"])
    }

    /** #492: the security deposit is "thế chân" in every Vietnamese string, never "thế chấp" */
    @Test
    fun vietnameseSaysTheChanNotTheChap() {
        val vi = strings("values-vi")
        val wrong = vi.filterValues { it.contains("thế chấp", ignoreCase = true) }.keys
        assertEquals(emptySet<String>(), wrong)
    }
}
