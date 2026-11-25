package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1539 (app): the sign-up country copy in both languages; #1545: the country hint; #1648: no "Ngôn ngữ email" copy any more */
class Issue1539ResourcesTest {
    private fun app(path: String): File = listOf(path, "app/$path").map(::File).first { it.exists() }

    private fun strings(folder: String): Map<String, String> {
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(app("src/main/res/$folder/strings.xml"))
            .documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent.replace("\\'", "'") }
    }

    @Test
    fun copyIsExactInBothLanguages() {
        val expected = mapOf(
            "values" to mapOf(
                "signup_country" to "Country",
                "signup_country_search" to "Search country",
                "signup_country_empty" to "No matching country",
                "signup_country_hint" to "Currency %1${'$'}s · change in Settings.",
            ),
            "values-vi" to mapOf(
                "signup_country" to "Quốc gia",
                "signup_country_search" to "Tìm quốc gia",
                "signup_country_empty" to "Không có quốc gia phù hợp",
                "signup_country_hint" to "Tiền tệ %1${'$'}s · đổi được trong Cài đặt.",
            ),
        )
        expected.forEach { (folder, copy) ->
            val mine = strings(folder)
            copy.forEach { (key, text) -> assertEquals("$folder/$key", text, mine[key]) }
        }
    }

    /** #1545 the hint under Quốc gia is filled with the country's currency */
    @Test
    fun countryHintTakesTheCurrency() {
        assertEquals("Currency USD · change in Settings.", strings("values").getValue("signup_country_hint").format("USD"))
        assertEquals("Tiền tệ VND · đổi được trong Cài đặt.", strings("values-vi").getValue("signup_country_hint").format("VND"))
    }

    /** #1545 the Ngôn ngữ and Tiền tệ pickers and their hint are gone */
    @Test
    fun languageAndCurrencyPickerCopyIsGone() {
        for (folder in listOf("values", "values-vi")) {
            val mine = strings(folder)
            for (key in listOf("signup_language", "signup_currency", "signup_language_currency_hint")) {
                assertFalse("$folder/$key", key in mine)
            }
        }
    }

    /** #1545 the shop language sent at sign-up is the language of the strings on screen: "en" by default, "vi" in values-vi */
    @Test
    fun appLanguageMatchesTheStringsShown() {
        assertEquals("en", strings("values").getValue("signup_app_language"))
        assertEquals("vi", strings("values-vi").getValue("signup_app_language"))
    }

    /** #1648 the email language follows the shop country on the server: the Settings row and its copy are gone in every language */
    @Test
    fun emailLanguageSettingCopyIsGoneEverywhere() {
        val folders = File(app("src/main/res").path).listFiles { f -> f.isDirectory && f.name.startsWith("values") && File(f, "strings.xml").exists() }!!
        assertEquals(true, folders.size >= 12)
        for (folder in folders) {
            val mine = strings(folder.name)
            for (key in listOf("settings_email_language", "settings_email_language_hint")) {
                assertFalse("${folder.name}/$key", key in mine)
            }
        }
    }
}
