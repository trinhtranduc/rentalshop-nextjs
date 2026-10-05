package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #430 — English "1 days" / "1 orders" / "Cart · 1 items" become plurals */
class Issue430ResourcesTest {
    private fun resources(folder: String): org.w3c.dom.Element {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
    }

    private fun named(root: org.w3c.dom.Element, tag: String, name: String): org.w3c.dom.Element? {
        val nodes = root.getElementsByTagName(tag)
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.firstOrNull { it.getAttribute("name") == name }
    }

    private fun plural(root: org.w3c.dom.Element, name: String): Map<String, String> {
        val node = named(root, "plurals", name) ?: return emptyMap()
        val items = node.getElementsByTagName("item")
        return (0 until items.length).associate { j ->
            val item = items.item(j) as org.w3c.dom.Element
            item.getAttribute("quantity") to item.textContent
        }
    }

    private val names = listOf(
        "v2_cart_days", "v2_calc_per_day", "v2_cart_bar", "orders_v2_count", "orders_v2_search_summary",
        "orders_v2_when_days", "orders_v2_filter_show_count", "detail_late_fee_days",
    )

    @Test
    fun englishHasOneAndOther() {
        val en = resources("values")
        assertEquals(mapOf("one" to "%1\$d day", "other" to "%1\$d days"), plural(en, "v2_cart_days"))
        assertEquals(mapOf("one" to "Cart · %1\$d item", "other" to "Cart · %1\$d items"), plural(en, "v2_cart_bar"))
        assertEquals(mapOf("one" to "%1\$d order", "other" to "%1\$d orders"), plural(en, "orders_v2_count"))
        names.forEach {
            assertNull("$it is still a plain string", named(en, "string", it))
            val forms = plural(en, it)
            assertTrue("$it: $forms", forms.keys == setOf("one", "other"))
        }
    }

    @Test
    fun vietnameseHasOneForm() {
        val vi = resources("values-vi")
        names.forEach {
            assertNull("$it is still a plain string", named(vi, "string", it))
            assertTrue("$it: vi", plural(vi, it).containsKey("other"))
        }
    }
}
