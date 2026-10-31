package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1404: the copy is exact in both languages, every sample word is a string, Android has the words of iOS, images exist */
class Issue1404ResourcesTest {
    private fun app(path: String): File = listOf(path, "app/$path").map(::File).first { it.exists() }

    private fun strings(folder: String): Map<String, String> {
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(app("src/main/res/$folder/strings.xml"))
            .documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent.replace("\\'", "'").replace("\\n", "\n") }
    }

    private fun iosStrings(language: String): Map<String, String> {
        val file = listOf("..", "../..").map { File(it, "mobile/POS ADBD/$language.lproj/Localizable.strings") }.first { it.exists() }
        val line = Regex("^\"(.+?)\"\\s*=\\s*\"(.*)\";\\s*$")
        return file.readLines().mapNotNull { line.find(it) }.associate { it.groupValues[1] to it.groupValues[2].replace("\\n", "\n") }
    }

    private val sampleKeys = listOf(
        "sample_lang", "scan_count", "scan_from", "scan_dress1", "scan_dress1_meta", "scan_dress2", "scan_dress2_meta", "scan_dress3",
        "scan_dress3_meta", "cal_title", "cal_subtitle", "cal_mon", "cal_tue", "cal_wed", "cal_thu", "cal_fri", "cal_sat", "cal_sun",
        "cal_out", "cal_chip_booked", "cal_chip_new", "warn_body", "today_head", "today_count", "today_pickup", "today_return",
        "today_name1", "today_item1", "today_amount1", "today_name2", "today_item2", "today_amount2", "today_name3", "today_item3",
        "today_amount3", "today_collect", "today_refund",
    ).map { "onboarding_v2_$it" }

    @Test
    fun copyIsExactInBothLanguages() {
        val expected = mapOf(
            "values-vi" to listOf(
                "Quên tên đồ? Chụp là ra." to "Đồ đã có ảnh trong kho là AI tìm được.",
                "Trùng lịch, app báo trước." to "Món nào hết ngày nào, nhìn là biết.",
                "Giao ai, trả ai? Mở Lịch là thấy." to "Còn thu bao nhiêu cũng hiện ngay trên đơn.",
            ),
            "values" to listOf(
                "Forgot the name? Just snap it." to "AI finds any item with a photo in your stock.",
                "Double-booked? You'll know first." to "See which item is out on which day.",
                "Who's due today? Open Calendar." to "What's left to collect shows on each order.",
            ),
        )
        expected.forEach { (folder, pages) ->
            val mine = strings(folder)
            pages.forEachIndexed { index, (title, body) ->
                assertEquals(title, mine["onboarding_v2_p${index + 1}_title"]?.replace("\n", " "))
                assertEquals(body, mine["onboarding_v2_p${index + 1}_body"])
            }
        }
    }

    @Test
    fun everySampleWordIsAStringInBothLanguagesAndEnglishHasNoVietnamese() {
        val vi = strings("values-vi")
        val en = strings("values")
        val vietnamese = Regex("[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]")
        sampleKeys.forEach { key ->
            assertFalse("vi $key", vi[key].isNullOrEmpty())
            assertFalse("en $key", en[key].isNullOrEmpty())
            assertFalse("en $key: ${en[key]}", vietnamese.containsMatchIn(en[key]!!.lowercase()))
        }
        assertEquals("vi", vi["onboarding_v2_sample_lang"])
        assertEquals("en", en["onboarding_v2_sample_lang"])
    }

    @Test
    fun theWordsAreTheWordsOfIos() {
        fun iosKey(key: String) = key.removePrefix("onboarding_v2_").let { rest ->
            "onboarding.v2." + rest.replace("_", ".")
        }
        val keys = sampleKeys + (1..3).flatMap { listOf("onboarding_v2_p${it}_title", "onboarding_v2_p${it}_body") }
        listOf("values" to "en", "values-vi" to "vi-VN").forEach { (android, ios) ->
            val mine = strings(android)
            val theirs = iosStrings(ios)
            keys.forEach { key ->
                val plain = mine[key]?.replace(Regex("%\\d\\$"), "%")?.replace("%s", "%@")
                assertEquals("$android $key", theirs[iosKey(key)], plain)
            }
        }
    }

    @Test
    fun theStandInsExistUnderTheAgreedNamesWithNoTextOnThem() {
        listOf("dress", "dress2", "dress3", "vest", "camera").forEach { name ->
            val folder = app("src/main/res/drawable-nodpi")
            assertTrue(name, folder.listFiles().orEmpty().any { it.nameWithoutExtension == "onboarding_v2_$name" })
        }
    }

    @Test
    fun oldWordsAreGoneButTheOldScreensImagesStay() {
        val en = strings("values")
        listOf("step", "product_title", "product_body", "customer_title", "customer_body", "order_title", "order_body").forEach {
            assertFalse(it, en.containsKey("onboarding_v2_$it"))
        }
        assertTrue(en.containsKey("onboarding_v2_skip") && en.containsKey("onboarding_v2_next") && en.containsKey("onboarding_v2_start"))
        listOf("product", "customer", "order").forEach {
            assertTrue(it, app("src/main/res/drawable-xxhdpi/onboarding_$it.png").exists())
        }
    }
}
