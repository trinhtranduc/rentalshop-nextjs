package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #949 — wrong-outlet message naming the code's outlet and the person's outlets, same words as iOS */
class Issue949ResourcesTest {
    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent }
    }

    @Test
    fun wrongOutletDetailMatchesIos() {
        assertEquals("Mã này của %1\$s. Bạn chấm công ở %2\$s.", strings("values-vi")["attendance_err_wrong_outlet_msg_detail"])
        assertEquals("This code is for %1\$s. You clock in at %2\$s.", strings("values")["attendance_err_wrong_outlet_msg_detail"])
    }
}
