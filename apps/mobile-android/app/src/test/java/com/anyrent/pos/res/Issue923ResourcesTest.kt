package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #923 — the attendance copy that still differed from iOS (iOS is the reference), vi and en */
class Issue923ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val iosVietnamese = mapOf(
        "attendance_no_shift" to "Không có ca hôm nay",
        "attendance_week_empty" to "Chưa có ca tuần này",
        "attendance_err_other" to "Không chấm công được",
        "attendance_err_wrong_outlet_msg_plain" to "Quét mã của chi nhánh bạn làm việc.",
        "attendance_open_settings" to "Mở Cài đặt",
        "role_outlet_staff" to "Nhân viên cửa hàng",
    )

    private val iosEnglish = mapOf(
        "attendance_no_shift" to "No shift today",
        "attendance_week_empty" to "No shifts this week",
        "attendance_err_other" to "Could not clock in / out",
        "attendance_err_wrong_outlet_msg_plain" to "Scan the code of the outlet you work at.",
        "attendance_open_settings" to "Open Settings",
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
