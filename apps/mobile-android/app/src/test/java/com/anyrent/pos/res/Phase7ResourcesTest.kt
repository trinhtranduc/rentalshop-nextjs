package com.anyrent.pos.res

import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsRows
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #388 — late plurals, cancel string, removed strings, settings counts */
class Phase7ResourcesTest {
    private fun resources(folder: String): org.w3c.dom.Element {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
    }

    private fun plural(root: org.w3c.dom.Element, name: String): Map<String, String> {
        val nodes = root.getElementsByTagName("plurals")
        for (i in 0 until nodes.length) {
            val node = nodes.item(i) as org.w3c.dom.Element
            if (node.getAttribute("name") != name) continue
            val items = node.getElementsByTagName("item")
            return (0 until items.length).associate { j ->
                val item = items.item(j) as org.w3c.dom.Element
                item.getAttribute("quantity") to item.textContent
            }
        }
        return emptyMap()
    }

    private fun string(root: org.w3c.dom.Element, name: String): String? {
        val nodes = root.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.firstOrNull { it.getAttribute("name") == name }?.textContent
    }

    @Test
    fun englishLateDaysHasOneAndOther() {
        val en = resources("values")
        assertEquals(mapOf("one" to "%1\$d day late", "other" to "%1\$d days late"), plural(en, "orders_late_days"))
        listOf("detail_late_return", "detail_late_hand_over", "detail_return_late_subtitle").forEach {
            val forms = plural(en, it)
            assertTrue(it, forms["one"]!!.contains("day late") && forms["other"]!!.contains("days late"))
        }
    }

    @Test
    fun vietnameseLateDaysStaysOneForm() {
        val vi = resources("values-vi")
        assertEquals(mapOf("other" to "Trễ %1\$d ngày"), plural(vi, "orders_late_days"))
        listOf("detail_late_return", "detail_late_hand_over", "detail_return_late_subtitle").forEach {
            assertTrue(it, plural(vi, it).containsKey("other"))
        }
    }

    @Test
    fun cancelIsEnglishByDefaultAndVietnameseInVi() {
        assertEquals("Cancel", string(resources("values"), "cancel"))
        assertEquals("Hủy", string(resources("values-vi"), "cancel"))
    }

    @Test
    fun unusedOrderStringsAreGone() {
        listOf("values", "values-vi").forEach { folder ->
            val root = resources(folder)
            listOf("orders_collect", "orders_refund", "orders_not_prepared", "orders_take_back").forEach {
                assertNull("$folder/$it", string(root, it))
            }
        }
    }

    @Test
    fun settingsCountsReadBothListShapes() {
        assertEquals(31, SettingsRows.listTotal(JSONObject("""{"success":true,"data":{"customers":[],"total":31}}""")))
        assertEquals(4, SettingsRows.listTotal(JSONObject("""{"success":true,"data":[{"id":1}],"pagination":{"total":4}}""")))
        assertNull(SettingsRows.listTotal(JSONObject("""{"success":false}""")))
        assertTrue(SettingsRows.countPath(SettingsItem.CUSTOMERS)!!.startsWith("/api/customers?limit=1"))
        assertTrue(SettingsRows.countPath(SettingsItem.USERS)!!.startsWith("/api/users?limit=1"))
        assertFalse(SettingsRows.countPath(SettingsItem.EXPORT) != null)
    }
}
