package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #916 — attendance messages not on the mockup read as on iOS (iOS is the reference), vi and en */
class Issue916ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val iosVietnamese = mapOf(
        "attendance_err_module_off" to "Shop chưa bật Chấm công",
        "attendance_err_module_off_msg" to "Liên hệ chủ shop để bật Chấm công.",
        "attendance_err_not_configured" to "Chi nhánh chưa cài chấm công",
        "attendance_err_not_configured_msg" to "Nhờ chủ shop cài vị trí và mã QR cho chi nhánh.",
        "attendance_err_no_location" to "Chưa định vị chính xác",
        "attendance_err_no_location_msg" to "Không lấy được vị trí. Ra gần cửa rồi thử lại.",
    )

    private val iosEnglish = mapOf(
        "attendance_err_module_off" to "Attendance is not turned on",
        "attendance_err_module_off_msg" to "Ask the shop owner to turn on Attendance.",
        "attendance_err_not_configured" to "Attendance is not set up for this outlet",
        "attendance_err_not_configured_msg" to "Ask the shop owner to set the outlet location and QR code.",
        "attendance_err_no_location" to "Location not precise yet",
        "attendance_err_no_location_msg" to "Could not get your location. Move near the door and try again.",
    )

    @Test
    fun vietnameseMatchesIos() {
        val vi = strings("values-vi")
        iosVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
    }

    @Test
    fun englishMatchesIos() {
        val en = strings("values")
        iosEnglish.forEach { (key, value) -> assertEquals(key, value, en[key]) }
    }
}
