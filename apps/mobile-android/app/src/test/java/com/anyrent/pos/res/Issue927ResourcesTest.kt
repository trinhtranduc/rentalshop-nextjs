package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #927 the clock card copy (mockup "phương án L"), vi and en */
class Issue927ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    private val keys = listOf(
        "attendance_card_in_since", "attendance_card_until", "attendance_card_today", "attendance_card_distance",
        "attendance_my_shifts_link", "attendance_err_not_required", "attendance_err_not_required_msg",
    )

    @Test
    fun vietnameseMatchesTheMockup() {
        val vi = strings("values-vi")
        assertEquals("Đang trong ca · vào %1\$s", vi["attendance_card_in_since"])
        assertEquals("%1\$s đến %2\$s", vi["attendance_card_until"])
        assertEquals("Hôm nay · %1\$s", vi["attendance_card_today"])
        assertEquals("Cách %1\$d m", vi["attendance_card_distance"])
        assertEquals("Ca và công của tôi ›", vi["attendance_my_shifts_link"])
        keys.forEach { assert(!vi[it].isNullOrBlank()) { "vi $it" } }
    }

    @Test
    fun englishHasEveryKey() {
        val en = strings("values")
        keys.forEach { assert(!en[it].isNullOrBlank()) { "en $it" } }
    }
}
