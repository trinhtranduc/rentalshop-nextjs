package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1014 — "outlet has no location" reads as on iOS and differs from "not set up" and "far from the branch" */
class Issue1014ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val iosVietnamese = mapOf(
        "attendance_err_location_not_set" to "Chi nhánh chưa đặt vị trí",
        "attendance_err_location_not_set_named" to "%1\$s chưa đặt vị trí",
        "attendance_err_location_not_set_msg" to "Chưa đo được khoảng cách. Nhờ chủ shop đặt vị trí ở Chấm công › Mã QR & vị trí.",
    )

    private val iosEnglish = mapOf(
        "attendance_err_location_not_set" to "This outlet has no location yet",
        "attendance_err_location_not_set_named" to "%1\$s has no location yet",
        "attendance_err_location_not_set_msg" to "The distance cannot be checked. Ask the shop owner to set it in Attendance › QR & location.",
    )

    @Test
    fun vietnameseMatchesIos() {
        val vi = strings("values-vi")
        iosVietnamese.forEach { (key, value) -> assertEquals(key, value, vi[key]) }
        assertNotEquals(vi["attendance_err_location_not_set"], vi["attendance_err_not_configured"])
        assertNotEquals(vi["attendance_err_location_not_set"], vi["attendance_err_out_of_range"])
    }

    @Test
    fun englishMatchesIos() {
        val en = strings("values")
        iosEnglish.forEach { (key, value) -> assertEquals(key, value, en[key]) }
    }
}
