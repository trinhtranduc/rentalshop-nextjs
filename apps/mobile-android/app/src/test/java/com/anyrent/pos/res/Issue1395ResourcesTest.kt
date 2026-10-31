package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1395: the approved titles of the order-detail sheets, and the same words as iOS */
class Issue1395ResourcesTest {
    private fun app(path: String): File = listOf(path, "app/$path").map(::File).first { it.exists() }

    private fun strings(folder: String): Map<String, String> {
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(app("src/main/res/$folder/strings.xml"))
            .documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.associate { it.getAttribute("name") to it.textContent }
    }

    private fun iosStrings(language: String): Map<String, String> {
        val file = listOf("..", "../..").map { File(it, "mobile/POS ADBD/$language.lproj/Localizable.strings") }.first { it.exists() }
        val line = Regex("^\"(.+?)\"\\s*=\\s*\"(.*)\";\\s*$")
        return file.readLines().mapNotNull { line.find(it) }.associate { it.groupValues[1] to it.groupValues[2] }
    }

    private val approved = mapOf(
        "actions" to ("Thao tác với đơn" to "Order actions"),
        "hand_over" to ("Giao đồ cho khách" to "Hand over to customer"),
        "return" to ("Nhận trả đồ" to "Take back items"),
        "extend" to ("Gia hạn đơn" to "Extend order"),
        "collateral" to ("Giấy tờ & thế chân" to "Papers & collateral"),
        "collect" to ("Thu tiền cọc" to "Collect deposit"),
        "unpaid" to ("Đợt cọc chưa thu" to "Uncollected deposit stages"),
        "cancel" to ("Huỷ đơn" to "Cancel order"),
    )
    private val iosKey = mapOf("hand_over" to "handOver")

    @Test
    fun titlesAreTheApprovedWords() {
        val vi = strings("values-vi")
        val en = strings("values")
        approved.forEach { (key, text) ->
            assertEquals(text.first, vi["order_sheet_title_$key"])
            assertEquals(text.second, en["order_sheet_title_$key"])
        }
    }

    @Test
    fun handOverAndReturnHaveTheirOwnTitleAndTheButtonsKeepTheirWords() {
        val vi = strings("values-vi")
        assertEquals("Giao đồ cho khách", vi["order_sheet_title_hand_over"])
        assertEquals("Nhận trả đồ", vi["order_sheet_title_return"])
        assertEquals("Giao đồ", vi["detail_hand_over"])
        assertEquals("Nhận trả", vi["detail_take_return"])
    }

    @Test
    fun sameWordsAsIos() {
        val iosVi = iosStrings("vi-VN")
        val iosEn = iosStrings("en")
        approved.forEach { (key, text) ->
            val ios = "order.sheetTitle.${iosKey[key] ?: key}"
            assertEquals(text.first, iosVi[ios])
            assertEquals(text.second, iosEn[ios])
        }
    }
}
