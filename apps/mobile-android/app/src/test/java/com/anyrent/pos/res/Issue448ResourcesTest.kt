package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #448 — Vietnamese copy of the new cart and review equals the iOS strings (iOS is the reference) */
class Issue448ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val root = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
        val nodes = root.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val iosVietnamese = mapOf(
        "v2_cart_pick_dates" to "Chọn ngày thuê",
        "v2_cart_need_pickup" to "Vui lòng chọn ngày lấy hàng cho đơn thuê.",
        "v2_cart_need_return" to "Vui lòng chọn ngày trả hàng cho đơn thuê.",
        "v2_review_title" to "Tạo đơn",
        "v2_review_edit_title" to "Chỉnh sửa đơn",
        "v2_review_create" to "Tạo đơn",
        "v2_review_update" to "Cập nhật đơn",
        "v2_review_info" to "Thông tin",
        "v2_review_dates" to "Thông tin ngày tháng",
        "v2_review_products" to "Danh sách Sản phẩm",
        "v2_review_deposit_papers" to "Tiền cọc & Giấy tờ thế chân",
        "v2_review_deposit" to "Tiền cọc",
        "v2_review_papers" to "Giấy tờ",
        "v2_review_security_deposit" to "Tiền thế chân",
        "v2_review_collect_deposit" to "Thu tiền cọc",
        "v2_review_collect_payment" to "Thu tiền",
        "v2_review_cancel" to "Hủy",
        "v2_review_confirm" to "Xác nhận",
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
}
