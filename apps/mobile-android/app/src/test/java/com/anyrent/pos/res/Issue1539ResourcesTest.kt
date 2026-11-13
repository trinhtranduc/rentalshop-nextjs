package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1539 (app): the sign-up country / language / currency and "Ngôn ngữ email" copy in both languages */
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
                "signup_language" to "Language",
                "signup_currency" to "Currency",
                "signup_country_search" to "Search country",
                "signup_country_empty" to "No matching country",
                "signup_language_currency_hint" to
                    "The language is used for emails and sample data. You can change both later in Settings.",
                "settings_email_language" to "Email language",
                "settings_email_language_hint" to "Verification, password reset and plan emails are sent in this language.",
            ),
            "values-vi" to mapOf(
                "signup_country" to "Quốc gia",
                "signup_language" to "Ngôn ngữ",
                "signup_currency" to "Tiền tệ",
                "signup_country_search" to "Tìm quốc gia",
                "signup_country_empty" to "Không có quốc gia phù hợp",
                "signup_language_currency_hint" to "Ngôn ngữ dùng cho email và dữ liệu mẫu. Cả hai đổi được sau trong Cài đặt.",
                "settings_email_language" to "Ngôn ngữ email",
                "settings_email_language_hint" to "Email xác thực, đặt lại mật khẩu và thông báo gói gửi bằng ngôn ngữ này.",
            ),
        )
        expected.forEach { (folder, copy) ->
            val mine = strings(folder)
            copy.forEach { (key, text) -> assertEquals("$folder/$key", text, mine[key]) }
        }
    }
}
