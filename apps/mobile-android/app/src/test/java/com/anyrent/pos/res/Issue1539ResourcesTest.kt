package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1539 (app): the sign-up country and "Ngôn ngữ email" copy in both languages; #1545: the country hint */
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
                "signup_country_hint" to "Currency %1${'$'}s · Emails in English · change in Settings.",
                "settings_email_language" to "Email language",
                "settings_email_language_hint" to "Verification, password reset and plan emails are sent in this language.",
            ),
            "values-vi" to mapOf(
                "signup_country" to "Quốc gia",
                "signup_country_search" to "Tìm quốc gia",
                "signup_country_empty" to "Không có quốc gia phù hợp",
                "signup_country_hint" to "Tiền tệ %1${'$'}s · Email tiếng Việt · đổi được trong Cài đặt.",
                "settings_email_language" to "Ngôn ngữ email",
                "settings_email_language_hint" to "Email xác thực, đặt lại mật khẩu và thông báo gói gửi bằng ngôn ngữ này.",
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
        assertEquals("Currency USD · Emails in English · change in Settings.", strings("values").getValue("signup_country_hint").format("USD"))
        assertEquals("Tiền tệ VND · Email tiếng Việt · đổi được trong Cài đặt.", strings("values-vi").getValue("signup_country_hint").format("VND"))
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
}
